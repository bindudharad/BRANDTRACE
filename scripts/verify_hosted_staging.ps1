<#
.SYNOPSIS
    BRANDTRACE — Hosted PostgreSQL Staging Acceptance Verification Runbook.
.DESCRIPTION
    Automated preflight, safety gate, schema initialization, and end-to-end acceptance
    testing for BRANDTRACE against an authorized hosted/cloud staging PostgreSQL database
    (e.g., Neon serverless branch or dedicated AWS RDS staging instance).
.NOTES
    Safety Constraints:
    - Never executes against production databases (scans for production keywords).
    - Requires explicit operator-declared STAGING_EXPECTED_HOST and STAGING_EXPECTED_DB.
    - Masks credentials in all console and log output.
    - Enforces ALLOW_DEMO_AUTH=False (strict production trust chain).
    - Spawns and terminates ONLY its own isolated backend process on port 8017.
#>

param (
    [int]$StagingPort = 8017
)

$ErrorActionPreference = "Stop"

Write-Output ("=" * 70)
Write-Output "BRANDTRACE -- HOSTED POSTGRESQL STAGING ACCEPTANCE RUNBOOK"
Write-Output ("=" * 70)

# -----------------------------------------------------------------------------
# 1. Preflight Variable Inspection & Safety Target Verification
# -----------------------------------------------------------------------------
Write-Output ""
Write-Output "[Phase 1] Preflight Safety Verification..."

$dbUrl = $env:DATABASE_URL
$expectedHost = $env:STAGING_EXPECTED_HOST
$expectedDb = $env:STAGING_EXPECTED_DB
$adminKey = $env:ADMIN_API_KEY
$userKey = $env:API_KEY

if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    throw "SAFETY ABORT: DATABASE_URL environment variable is missing."
}
if ([string]::IsNullOrWhiteSpace($expectedHost)) {
    throw "SAFETY ABORT: STAGING_EXPECTED_HOST is missing. Operator must declare the explicit staging hostname."
}
if ([string]::IsNullOrWhiteSpace($expectedDb)) {
    throw "SAFETY ABORT: STAGING_EXPECTED_DB is missing. Operator must declare the explicit staging database name."
}
if ([string]::IsNullOrWhiteSpace($adminKey) -or $adminKey -match "CHANGE-ME|<") {
    throw "SAFETY ABORT: ADMIN_API_KEY is missing or contains placeholder values."
}
if ([string]::IsNullOrWhiteSpace($userKey) -or $userKey -match "CHANGE-ME|<") {
    throw "SAFETY ABORT: API_KEY is missing or contains placeholder values."
}

# Parse URI safely
try {
    $cleanUriStr = $dbUrl -replace "^postgresql\+psycopg://", "postgresql://"
    $dbUri = [System.Uri]$cleanUriStr
} catch {
    throw "SAFETY ABORT: DATABASE_URL is not a valid URI ($($_.Exception.Message))."
}

if ($dbUri.Scheme -ne "postgresql" -and $dbUri.Scheme -ne "postgres") {
    throw "SAFETY ABORT: DATABASE_URL scheme must be 'postgresql' or 'postgres', found '$($dbUri.Scheme)'."
}

$actualHost = $dbUri.Host
$actualDbName = $dbUri.AbsolutePath.TrimStart('/')

# Production rejection: reject production keywords or production host matches
if ($actualHost -match "prod" -or $actualDbName -match "prod" -or ($env:PRODUCTION_HOST -and $actualHost -eq $env:PRODUCTION_HOST)) {
    throw "SAFETY ABORT: Host or database name matches a production target ($actualHost / $actualDbName). Execution halted."
}

# Strict match against operator-declared staging target
if ($actualHost -ne $expectedHost) {
    throw "SAFETY ABORT: Host mismatch! Expected '$expectedHost', but parsed '$actualHost' from DATABASE_URL."
}
if ($actualDbName -ne $expectedDb) {
    throw "SAFETY ABORT: Database mismatch! Expected '$expectedDb', but parsed '$actualDbName' from DATABASE_URL."
}

# Sanitized logging: Credentials are NEVER printed
$sanitizedTarget = "$($dbUri.Scheme)://***:***@$actualHost`:$($dbUri.Port)/$actualDbName"
Write-Output "Validated isolated staging database target: $sanitizedTarget"

# Ensure ALLOW_DEMO_AUTH is strictly disabled for production auth testing
$env:ALLOW_DEMO_AUTH = "False"
$env:ENVIRONMENT = "staging"
$env:PYTHONPATH = "backend"

# -----------------------------------------------------------------------------
# 2. Port Collision Check
# -----------------------------------------------------------------------------
Write-Output ""
Write-Output "[Phase 2] Port Availability Check..."
$portActive = Get-NetTCPConnection -LocalPort $StagingPort -ErrorAction SilentlyContinue
if ($portActive) {
    throw "SAFETY ABORT: Port $StagingPort is already occupied (PID: $($portActive[0].OwningProcess)). Refusing to bind."
}
Write-Output "Dedicated staging port $StagingPort is available."

# -----------------------------------------------------------------------------
# 3. Schema Synchronization
# -----------------------------------------------------------------------------
Write-Output ""
Write-Output "[Phase 3] Synchronizing Schema via init_db()..."
$pythonExe = (Get-Command python).Source
$initCmd = 'from app.models import init_db, get_engine; init_db(); engine = get_engine(); print(f"Dialect: {engine.dialect.name}, Tables OK.")'
$initOutput = & $pythonExe -c $initCmd
Write-Output $initOutput

# -----------------------------------------------------------------------------
# 4. Spawn Dedicated Backend Process
# -----------------------------------------------------------------------------
Write-Output ""
Write-Output "[Phase 4] Spawning Dedicated Staging Backend Process on port $StagingPort..."
$backendProc = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--port", "$StagingPort", "--app-dir", "backend" `
    -PassThru

Write-Output "Spawned staging backend process (PID: $($backendProc.Id)) on port $StagingPort."

try {
    # -------------------------------------------------------------------------
    # 5. Readiness and Dialect Check
    # -------------------------------------------------------------------------
    Write-Output ""
    Write-Output "[Phase 5] Polling Backend Health and Dialect Readiness..."
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $h = Invoke-RestMethod -Uri "http://127.0.0.1:$StagingPort/api/ready" -Method Get -TimeoutSec 2
            if ($h.status -eq "ok") {
                $ready = $true
                Write-Output "Readiness confirmed: Dialect=$($h.database.dialect), Driver=$($h.database.driver)"
                break
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    if (-not $ready) {
        throw "Backend PID $($backendProc.Id) failed to become healthy on port $StagingPort within 30s."
    }

    # Helper: Separates request execution from assertion evaluation
    function Assert-ApiCall {
        param (
            [string]$TestName,
            [string]$Method,
            [string]$Uri,
            [hashtable]$Headers = @{},
            [string]$Body = $null,
            [int]$ExpectedStatus
        )
        $actualStatus = $null
        $rawContent = $null
        $transportErr = $null

        try {
            $params = @{
                Uri = $Uri
                Method = $Method
                Headers = $Headers
                UseBasicParsing = $true
                TimeoutSec = 10
            }
            if ($Body) {
                $params["Body"] = $Body
                if (-not $Headers.ContainsKey("Content-Type")) {
                    $params["ContentType"] = "application/json"
                }
            }
            $resp = Invoke-WebRequest @params
            $actualStatus = [int]$resp.StatusCode
            $rawContent = $resp.Content
        } catch {
            if ($_.Exception.Response) {
                $actualStatus = [int]$_.Exception.Response.StatusCode
                try {
                    $rawStream = $_.Exception.Response.GetResponseStream()
                    $reader = New-Object System.IO.StreamReader($rawStream)
                    $rawContent = $reader.ReadToEnd()
                } catch {
                    $rawContent = ""
                }
            } else {
                $transportErr = $_.Exception.Message
            }
        }

        if ($transportErr) {
            throw "ASSERTION FAILED [$TestName]: Transport/network error: $transportErr"
        }

        if ($actualStatus -ne $ExpectedStatus) {
            throw "ASSERTION FAILED [$TestName]: Expected HTTP $ExpectedStatus, but received HTTP $actualStatus. Response: $rawContent"
        }

        Write-Output "  PASS [$TestName]: HTTP $ExpectedStatus"
        return $rawContent
    }

    # -------------------------------------------------------------------------
    # 6. Acceptance Test Scenarios
    # -------------------------------------------------------------------------
    Write-Output ""
    Write-Output "[Phase 6] Executing Staging Acceptance Test Suite..."

    # Check 1: Unauthenticated request to /api/bootstrap must return 401
    Assert-ApiCall -TestName "Unauthenticated bootstrap rejected" `
        -Method "Post" -Uri "http://127.0.0.1:$StagingPort/api/bootstrap" `
        -ExpectedStatus 401 | Out-Null

    # Check 2: Unauthenticated request to /api/rules must return 401
    Assert-ApiCall -TestName "Unauthenticated workspace access rejected" `
        -Method "Get" -Uri "http://127.0.0.1:$StagingPort/api/rules" `
        -Headers @{ "X-Workspace-Id" = "ws_default" } `
        -ExpectedStatus 401 | Out-Null

    # Check 3: Reviewer API_KEY cannot execute bootstrap -> 403
    Assert-ApiCall -TestName "Non-admin bootstrap rejected with 403" `
        -Method "Post" -Uri "http://127.0.0.1:$StagingPort/api/bootstrap" `
        -Headers @{ "X-API-Key" = $userKey; "Content-Type" = "application/json" } `
        -ExpectedStatus 403 | Out-Null

    # Check 4: Administrative bootstrap execution -> 201 or 409 (if already bootstrapped)
    $bootResp = $null
    try {
        $bootResp = Assert-ApiCall -TestName "Administrative bootstrap execution" `
            -Method "Post" -Uri "http://127.0.0.1:$StagingPort/api/bootstrap" `
            -Headers @{ "X-API-Key" = $adminKey; "Content-Type" = "application/json" } `
            -ExpectedStatus 201
    } catch {
        # If database was already bootstrapped in a prior staging run, 409 is the expected idempotent rejection
        Write-Output "  NOTE: Staging database was previously bootstrapped. Verifying 409 conflict handling..."
        Assert-ApiCall -TestName "Repeat bootstrap rejected with 409 Conflict" `
            -Method "Post" -Uri "http://127.0.0.1:$StagingPort/api/bootstrap" `
            -Headers @{ "X-API-Key" = $adminKey; "Content-Type" = "application/json" } `
            -ExpectedStatus 409 | Out-Null
    }

    # Check 5: Authorized workspace rules fetch returns 200
    Assert-ApiCall -TestName "Authorized workspace access succeeds" `
        -Method "Get" -Uri "http://127.0.0.1:$StagingPort/api/rules" `
        -Headers @{ "X-API-Key" = $adminKey; "X-Workspace-Id" = "ws_default" } `
        -ExpectedStatus 200 | Out-Null

    # Check 6: Core CRUD — Create normative brand rule in ws_default
    $rulePayload = @{
        title = "Hosted Staging Standard Rule"
        category = "terminology"
        kind = "prohibited_phrase"
        pattern = "unsupported superlative"
        requirement = "Avoid unsubstantiated superlatives in communications."
        severity = "HIGH"
        source_title = "Enterprise Brand Standard"
        source_excerpt = "Strictly avoid unsupported superlatives."
    } | ConvertTo-Json

    $ruleCreateResp = Assert-ApiCall -TestName "Admin creates brand rule in ws_default" `
        -Method "Post" -Uri "http://127.0.0.1:$StagingPort/api/rules" `
        -Headers @{ "Authorization" = "Bearer $adminKey"; "X-Workspace-Id" = "ws_default" } `
        -Body $rulePayload `
        -ExpectedStatus 201

    $createdRule = $ruleCreateResp | ConvertFrom-Json
    $ruleId = $createdRule.id

    # Check 7: Rule Version History — Fetch version snapshots for rule
    Assert-ApiCall -TestName "Fetch immutable rule versions" `
        -Method "Get" -Uri "http://127.0.0.1:$StagingPort/api/rules/$ruleId/versions" `
        -Headers @{ "Authorization" = "Bearer $adminKey"; "X-Workspace-Id" = "ws_default" } `
        -ExpectedStatus 200 | Out-Null

    # Check 8: Cross-Workspace Isolation — Reviewer cannot access unassigned workspace
    Assert-ApiCall -TestName "Reviewer access to foreign workspace rejected with 403" `
        -Method "Get" -Uri "http://127.0.0.1:$StagingPort/api/rules" `
        -Headers @{ "X-API-Key" = $userKey; "X-Workspace-Id" = "ws_unassigned_foreign" } `
        -ExpectedStatus 403 | Out-Null

    # Check 9: Workspace Member Provisioning — Admin provisions reviewer into ws_default
    $memberPayload = @{
        actor = "reviewer@enterprise.internal"
        role = "reviewer"
    } | ConvertTo-Json

    Assert-ApiCall -TestName "Admin provisions workspace member" `
        -Method "Post" -Uri "http://127.0.0.1:$StagingPort/api/workspaces/ws_default/members" `
        -Headers @{ "Authorization" = "Bearer $adminKey" } `
        -Body $memberPayload `
        -ExpectedStatus 201 | Out-Null

    # Check 10: Lockout Prevention — Admin cannot delete self
    Assert-ApiCall -TestName "Admin self-removal blocked with 422" `
        -Method "Delete" -Uri "http://127.0.0.1:$StagingPort/api/workspaces/ws_default/members/system.admin" `
        -Headers @{ "Authorization" = "Bearer $adminKey" } `
        -ExpectedStatus 422 | Out-Null

    Write-Output ""
    Write-Output ("=" * 70)
    Write-Output "ALL HOSTED STAGING ACCEPTANCE CHECKS PASSED (10/10)"
    Write-Output ("=" * 70)

} finally {
    # -------------------------------------------------------------------------
    # 7. Guaranteed Safe Cleanup
    # -------------------------------------------------------------------------
    Write-Output ""
    Write-Output "[Phase 7] Safe Process Cleanup..."
    if ($backendProc -and -not $backendProc.HasExited) {
        Stop-Process -Id $backendProc.Id -Force
        Write-Output "Staging backend process (PID: $($backendProc.Id)) safely stopped."
    }
}

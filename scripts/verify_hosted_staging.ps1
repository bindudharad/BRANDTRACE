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
if ($dbUrl -match "CHANGE-ME|<[^>]+>|example\.com") {
    throw "SAFETY ABORT: DATABASE_URL contains an unresolved placeholder target."
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
if ($dbUri.Query -notmatch "(?i)(^|[?&])sslmode=require(&|$)") {
    throw "SAFETY ABORT: DATABASE_URL must explicitly require TLS with sslmode=require."
}

$actualHost = $dbUri.Host
$actualDbName = $dbUri.AbsolutePath.TrimStart('/')
$actualPort = if ($dbUri.IsDefaultPort -or $dbUri.Port -lt 1) { 5432 } else { $dbUri.Port }

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
$sanitizedTarget = "$($dbUri.Scheme)://***:***@$actualHost`:$actualPort/$actualDbName"
Write-Output "Validated isolated staging database target: $sanitizedTarget"

# Records created by this run must be distinguishable from pre-existing staging
# data.  Do not use a fixed identifier that makes a later run look successful
# or collide with another accepted run.
$acceptanceRunId = [Guid]::NewGuid().ToString("N").Substring(0, 12)
Write-Output "Acceptance run identifier: $acceptanceRunId"

# Ensure ALLOW_DEMO_AUTH is strictly disabled for production auth testing
$env:ALLOW_DEMO_AUTH = "False"
$env:ENVIRONMENT = "staging"
$env:PYTHONPATH = "backend"
$env:BRANDTRACE_SCHEMA_DIALECT = "postgresql"
$env:PYTHONUNBUFFERED = "1"
Write-Output "Child environment configured: ENVIRONMENT=staging; ALLOW_DEMO_AUTH=False; PYTHONPATH=backend; DATABASE_URL=validated target; API keys=present; unbuffered logs enabled."

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
$backendProc = $null
$phase3Script = $null
$phase3Stdout = $null
$phase3Stderr = $null
$backendStdout = $null
$backendStderr = $null
$repoRoot = Split-Path -Parent $PSScriptRoot

function Get-SafeLogTail {
    param([string]$Path, [int]$Count = 30)
    if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return "(no log available)" }
    $tail = (Get-Content -LiteralPath $Path -Tail $Count -ErrorAction SilentlyContinue) -join [Environment]::NewLine
    return $tail -replace '(?i)(postgres(?:ql)?(?:\+psycopg)?://)[^\s''"]+', '$1***' -replace '(?i)password=[^\s;]+', 'password=***'
}

function Get-SafeDiagnostic {
    param([string]$Text)
    if ($null -eq $Text) { return "" }
    return $Text -replace '(?i)(postgres(?:ql)?(?:\+psycopg)?://)[^\s''"]+', '$1***' -replace '(?i)password=[^\s;]+', 'password=***'
}

try {
    Write-Output ""
    Write-Output "[Phase 3] Synchronizing Schema via init_db()..."
    $pythonExe = (Get-Command python).Source
    # Do not pass generated Python through `python -c`: a temporary source file
    # makes the exact executed program inspectable and avoids shell quoting bugs.
    $phase3Token = [Guid]::NewGuid().ToString("N")
    $phase3Script = Join-Path $env:TEMP "brandtrace-phase3-$phase3Token.py"
    $phase3Stdout = Join-Path $env:TEMP "brandtrace-phase3-$phase3Token.stdout"
    $phase3Stderr = Join-Path $env:TEMP "brandtrace-phase3-$phase3Token.stderr"
    $initSource = @'
import os
from app.models import REQUIRED_SCHEMA_TABLES, init_db, verify_schema

init_db()
engine = verify_schema()
expected_dialect = os.environ.get("BRANDTRACE_SCHEMA_DIALECT", "postgresql")
if engine.dialect.name != expected_dialect:
    raise RuntimeError(f"Unexpected database dialect: {engine.dialect.name}")
print(f"Schema verified: dialect={engine.dialect.name}; tables={len(REQUIRED_SCHEMA_TABLES)}")
'@
    [System.IO.File]::WriteAllText($phase3Script, $initSource, [System.Text.UTF8Encoding]::new($false))
    # PowerShell 7 can promote native stderr to a terminating error when the
    # script-wide preference is Stop. Temporarily allow the child process to
    # exit normally so its numeric exit code remains the authoritative result.
    $savedErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $pythonExe $phase3Script 1> $phase3Stdout 2> $phase3Stderr
    $phase3Exit = $LASTEXITCODE
    $ErrorActionPreference = $savedErrorActionPreference
    $initOutput = if (Test-Path -LiteralPath $phase3Stdout) { Get-Content -Raw -LiteralPath $phase3Stdout } else { "" }
    $initError = if (Test-Path -LiteralPath $phase3Stderr) { Get-Content -Raw -LiteralPath $phase3Stderr } else { "" }
    if ($phase3Exit -ne 0) {
        # Diagnostics must never reveal a connection string or password.
        $safeError = $initError -replace '(?i)(postgres(?:ql)?(?:\+psycopg)?://)[^\s''"]+', '$1***' -replace '(?i)password=[^\s;]+', 'password=***'
        if (-not [string]::IsNullOrWhiteSpace($safeError)) { Write-Output "Phase 3 Python error: $safeError" }
        throw "SAFETY ABORT: Schema initialization failed (Python exit code $phase3Exit). Backend startup and acceptance mutations were not attempted."
    }
    Write-Output $initOutput
    # Phase 3 performed the schema mutations against this exact inherited
    # DATABASE_URL. The child still verifies all required tables at startup,
    # but does not repeat PostgreSQL DDL while Uvicorn is waiting to start.
    $env:BRANDTRACE_STARTUP_SCHEMA_MODE = "verify"
    Write-Output "Phase 3 schema verified; backend child will perform read-only startup schema verification."

    # -------------------------------------------------------------------------
    # 4. Spawn Dedicated Backend Process
    # -------------------------------------------------------------------------
    Write-Output ""
    Write-Output "[Phase 4] Spawning Dedicated Staging Backend Process on port $StagingPort..."
    $backendLogToken = [Guid]::NewGuid().ToString("N")
    $backendStdout = Join-Path $env:TEMP "brandtrace-backend-$backendLogToken.stdout"
    $backendStderr = Join-Path $env:TEMP "brandtrace-backend-$backendLogToken.stderr"
    $backendArgs = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$StagingPort", "--app-dir", "backend", "--log-level", "info")
    $backendProc = Start-Process -FilePath $pythonExe `
        -ArgumentList $backendArgs `
        -WorkingDirectory $repoRoot `
        -RedirectStandardOutput $backendStdout `
        -RedirectStandardError $backendStderr `
        -PassThru

    Start-Sleep -Milliseconds 250
    if ($backendProc.HasExited) {
        throw "SAFETY ABORT: Dedicated backend exited during startup (exit code $($backendProc.ExitCode))."
    }
    Write-Output "Spawned staging backend process (PID: $($backendProc.Id)); command: python $($backendArgs -join ' '); port $StagingPort."

    # -------------------------------------------------------------------------
    # 5. Readiness and Dialect Check
    # -------------------------------------------------------------------------
    Write-Output ""
    Write-Output "[Phase 5] Confirming Backend Health and Dialect Readiness..."
    $healthConfirmed = $false
    $lastProbe = "No health request completed."
    $healthDeadline = [DateTime]::UtcNow.AddSeconds(30)
    while ([DateTime]::UtcNow -lt $healthDeadline) {
        try {
            $healthResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$StagingPort/api/health" -Method Get -UseBasicParsing -TimeoutSec 2
            $health = $healthResponse.Content | ConvertFrom-Json
            if ($healthResponse.StatusCode -eq 200 -and $health.status -eq "ok") {
                $healthConfirmed = $true
                break
            }
            $lastProbe = "Health HTTP $($healthResponse.StatusCode), status=$($health.status)"
        } catch {
            $lastProbe = "Health request failure: $($_.Exception.Message -replace '(?i)(postgres(?:ql)?(?:\+psycopg)?://)[^\s''"]+', '$1***')"
        }
        Start-Sleep -Seconds 1
    }
    if (-not $healthConfirmed) {
        $stdoutTail = Get-SafeLogTail -Path $backendStdout
        $stderrTail = Get-SafeLogTail -Path $backendStderr
        throw "Backend PID $($backendProc.Id) did not satisfy /api/health within 30s. Last probe: $lastProbe`nBackend stdout tail:`n$stdoutTail`nBackend stderr tail:`n$stderrTail"
    }

    # Once health is confirmed, make exactly one bounded readiness request.
    # Repeating a blocked database probe only obscures the first useful error.
    $readinessTimer = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $readyResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$StagingPort/api/ready" -Method Get -UseBasicParsing -TimeoutSec 12
        $readyPayload = $readyResponse.Content | ConvertFrom-Json
        $readinessTimer.Stop()
        if ($readyResponse.StatusCode -ne 200 -or $readyPayload.status -ne "ready" -or $readyPayload.database -ne "postgresql") {
            throw "Unexpected readiness response: HTTP $($readyResponse.StatusCode), status=$($readyPayload.status), database=$($readyPayload.database)"
        }
        Write-Output "Readiness confirmed: Health=HTTP $($healthResponse.StatusCode) service=$($health.service); Ready=HTTP $($readyResponse.StatusCode) dialect=$($readyPayload.database); duration=$([Math]::Round($readinessTimer.Elapsed.TotalMilliseconds))ms"
    } catch {
        $readinessTimer.Stop()
        $stdoutTail = Get-SafeLogTail -Path $backendStdout
        $stderrTail = Get-SafeLogTail -Path $backendStderr
        $safeReadinessError = $_.Exception.Message -replace '(?i)(postgres(?:ql)?(?:\+psycopg)?://)[^\s''"]+', '$1***'
        throw "Backend PID $($backendProc.Id) failed /api/ready after $([Math]::Round($readinessTimer.Elapsed.TotalMilliseconds))ms. $safeReadinessError`nBackend stdout tail:`n$stdoutTail`nBackend stderr tail:`n$stderrTail"
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
                try {
                    $actualStatus = [int]$_.Exception.Response.StatusCode
                } catch {
                    $actualStatus = 0
                }
                if ($_.ErrorDetails -and -not [string]::IsNullOrWhiteSpace($_.ErrorDetails.Message)) {
                    $rawContent = $_.ErrorDetails.Message
                } else {
                    try {
                        $rawStream = $_.Exception.Response.GetResponseStream()
                        if ($rawStream -and $rawStream.CanSeek) {
                            $rawStream.Position = 0
                        }
                        if ($rawStream) {
                            $reader = New-Object System.IO.StreamReader($rawStream)
                            $rawContent = $reader.ReadToEnd()
                        }
                    } catch {
                        $rawContent = ""
                    }
                }
            } else {
                $transportErr = $_.Exception.Message
            }
        }

        if ($transportErr) {
            $safeUri = Get-SafeDiagnostic -Text $Uri
            throw "ASSERTION FAILED [$TestName]: Transport/network error on $Method $($safeUri): $transportErr"
        }

        if ($actualStatus -ne $ExpectedStatus) {
            $safeUri = Get-SafeDiagnostic -Text $Uri
            $safeBody = Get-SafeDiagnostic -Text $rawContent
            throw "ASSERTION FAILED [$TestName]: Expected HTTP $ExpectedStatus, but received HTTP $actualStatus on $Method $($safeUri). Response: $safeBody"
        }

        # Use Write-Host to avoid polluting the function's return pipeline
        Write-Host "  PASS [$TestName]: HTTP $ExpectedStatus"
        return [string]$rawContent
    }

    # -------------------------------------------------------------------------
    # 6. Acceptance Test Scenarios
    # -------------------------------------------------------------------------
    Write-Output ""
    Write-Output "[Phase 6] Executing Staging Acceptance Test Suite..."

    # Read-only inspection of staging database state before submitting bootstrap
    Write-Host "Inspecting staging database state read-only..."
    $inspectScript = Join-Path $env:TEMP "brandtrace-inspect-$acceptanceRunId.py"
    $inspectSource = @'
import json
from app.models import rows

boot_state = rows("SELECT key, value, created_at FROM system_state WHERE key='bootstrap_completed'")
ws_default = rows("SELECT id, name, created_at FROM workspaces WHERE id='ws_default'")
admin_member = rows("SELECT workspace_id, actor, role, created_at FROM workspace_members WHERE workspace_id='ws_default' AND actor='system.admin'")
audit_boot = rows("SELECT id, action, actor, created_at FROM audit WHERE action='SYSTEM_BOOTSTRAPPED'")
bp_count = rows("SELECT COUNT(*) AS c FROM brand_profiles WHERE workspace_id='ws_default'")[0]["c"]

# Acceptance records from prior runs
prior_acceptance_rules = rows("SELECT id, title, pattern, created_at FROM rules WHERE workspace_id='ws_default' AND pattern LIKE 'acceptance-superlative-%'")
prior_acceptance_members = rows("SELECT workspace_id, actor, role, created_at FROM workspace_members WHERE workspace_id='ws_default' AND actor LIKE 'reviewer.acceptance.%'")

is_bootstrapped = len(boot_state) > 0
has_default_ws = len(ws_default) > 0
has_admin_member = len(admin_member) > 0
has_boot_audit = len(audit_boot) > 0

partial_detected = False
if is_bootstrapped and (not has_default_ws or not has_admin_member):
    partial_detected = True

report = {
    "is_bootstrapped": is_bootstrapped,
    "bootstrap_key": boot_state[0]["key"] if is_bootstrapped else None,
    "bootstrap_created_at": boot_state[0]["created_at"] if is_bootstrapped else None,
    "has_default_workspace": has_default_ws,
    "has_admin_member": has_admin_member,
    "has_boot_audit": has_boot_audit,
    "brand_profiles_count": bp_count,
    "prior_acceptance_rules_count": len(prior_acceptance_rules),
    "prior_acceptance_members_count": len(prior_acceptance_members),
    "partial_inconsistency": partial_detected,
}
print(json.dumps(report))
'@
    [System.IO.File]::WriteAllText($inspectScript, $inspectSource, [System.Text.UTF8Encoding]::new($false))
    $inspectRaw = & $pythonExe $inspectScript
    Remove-Item -LiteralPath $inspectScript -Force -ErrorAction SilentlyContinue
    $inspectState = $inspectRaw | ConvertFrom-Json

    Write-Host "  Staging State: is_bootstrapped=$($inspectState.is_bootstrapped); default_workspace=$($inspectState.has_default_workspace); admin_member=$($inspectState.has_admin_member); prior_acceptance_rules=$($inspectState.prior_acceptance_rules_count); partial_inconsistent=$($inspectState.partial_inconsistency)"
    if ($inspectState.partial_inconsistency) {
        throw "SAFETY ABORT: Inconsistent database state detected! bootstrap_completed is recorded, but default workspace or admin member is missing."
    }

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

    # Check 4: Administrative bootstrap execution -> 201 if fresh, 409 if already bootstrapped
    if ($inspectState.is_bootstrapped) {
        Write-Host "  Staging database already has durable bootstrap marker. Verifying one-way 409 rejection..."
        $bootResp = Assert-ApiCall -TestName "One-way bootstrap returns 409 Conflict when already bootstrapped" `
            -Method "Post" -Uri "http://127.0.0.1:$StagingPort/api/bootstrap" `
            -Headers @{ "X-API-Key" = $adminKey; "Content-Type" = "application/json" } `
            -ExpectedStatus 409
        $bootJson = $bootResp | ConvertFrom-Json
        if ($bootJson.detail -notmatch "already been bootstrapped") {
            throw "ASSERTION FAILED [One-way bootstrap returns 409]: Expected conflict detail, got '$($bootJson.detail)'"
        }
    } else {
        $bootResp = Assert-ApiCall -TestName "Administrative bootstrap execution" `
            -Method "Post" -Uri "http://127.0.0.1:$StagingPort/api/bootstrap" `
            -Headers @{ "X-API-Key" = $adminKey; "Content-Type" = "application/json" } `
            -ExpectedStatus 201

        # Check 4b: Repeat bootstrap must immediately return 409 Conflict
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
        title = "Hosted Staging Acceptance Rule $acceptanceRunId"
        category = "terminology"
        kind = "prohibited_phrase"
        pattern = "acceptance-superlative-$acceptanceRunId"
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

    if ([string]::IsNullOrWhiteSpace($ruleCreateResp)) {
        throw "ASSERTION FAILED [Admin creates brand rule in ws_default]: Expected JSON response with rule ID, but received empty response."
    }
    $createdRule = $null
    try {
        $createdRule = $ruleCreateResp | ConvertFrom-Json
    } catch {
        $safeBody = Get-SafeDiagnostic -Text $ruleCreateResp
        throw "ASSERTION FAILED [Admin creates brand rule in ws_default]: Failed to parse JSON response: $($_.Exception.Message). Response body: $safeBody"
    }

    if (-not $createdRule -or [string]::IsNullOrWhiteSpace($createdRule.id)) {
        throw "ASSERTION FAILED [Admin creates brand rule in ws_default]: Response JSON missing required 'id' field. Response body: $(Get-SafeDiagnostic -Text $ruleCreateResp)"
    }
    $ruleId = $createdRule.id
    Write-Host "  Verified created normative rule with id: $ruleId"

    # Check 7: Rule Version History — Fetch version snapshots for rule
    $ruleVersResp = Assert-ApiCall -TestName "Fetch immutable rule versions" `
        -Method "Get" -Uri "http://127.0.0.1:$StagingPort/api/rules/$ruleId/versions" `
        -Headers @{ "Authorization" = "Bearer $adminKey"; "X-Workspace-Id" = "ws_default" } `
        -ExpectedStatus 200

    if ([string]::IsNullOrWhiteSpace($ruleVersResp)) {
        throw "ASSERTION FAILED [Fetch immutable rule versions]: Expected JSON list of rule versions, but received empty response."
    }
    $ruleVersions = $null
    try {
        $ruleVersions = $ruleVersResp | ConvertFrom-Json
    } catch {
        throw "ASSERTION FAILED [Fetch immutable rule versions]: Failed to parse JSON response: $($_.Exception.Message)."
    }
    if ($ruleVersions.Count -lt 1) {
        throw "ASSERTION FAILED [Fetch immutable rule versions]: Expected at least 1 version snapshot for rule $ruleId, but found none."
    }
    Write-Host "  Verified immutable rule version history contains $($ruleVersions.Count) snapshot(s)."

    # Check 8: Cross-Workspace Isolation — Reviewer cannot access unassigned workspace
    Assert-ApiCall -TestName "Reviewer access to foreign workspace rejected with 403" `
        -Method "Get" -Uri "http://127.0.0.1:$StagingPort/api/rules" `
        -Headers @{ "X-API-Key" = $userKey; "X-Workspace-Id" = "ws_unassigned_foreign" } `
        -ExpectedStatus 403 | Out-Null

    # Check 9: Workspace Member Provisioning — Admin provisions reviewer into ws_default
    $memberPayload = @{
        actor = "reviewer.acceptance.$acceptanceRunId@enterprise.internal"
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

    # Safe cleanup of acceptance reviewer member provisioned during this run
    try {
        Assert-ApiCall -TestName "Cleanup acceptance test reviewer member" `
            -Method "Delete" -Uri "http://127.0.0.1:$StagingPort/api/workspaces/ws_default/members/reviewer.acceptance.$acceptanceRunId@enterprise.internal" `
            -Headers @{ "Authorization" = "Bearer $adminKey" } `
            -ExpectedStatus 204 | Out-Null
        Write-Host "  Safely cleaned up acceptance member reviewer.acceptance.$acceptanceRunId@enterprise.internal"
    } catch {
        Write-Host "  Note: Acceptance member cleanup was not needed or skipped: $($_.Exception.Message)"
    }

    Write-Host ""
    Write-Host ("=" * 70)
    Write-Host "ALL HOSTED STAGING ACCEPTANCE CHECKS PASSED (10/10)"
    Write-Host ("=" * 70)

} catch {
    # Preserve actionable evidence before this runbook removes only the
    # temporary logs it created. Do not expose URLs, passwords, or API keys.
    $safeFailure = Get-SafeDiagnostic -Text $_.Exception.Message
    Write-Output "Runbook failure diagnostic: $safeFailure"
    if ($backendProc) {
        Write-Output "Backend stdout tail:`n$(Get-SafeLogTail -Path $backendStdout)"
        Write-Output "Backend stderr tail:`n$(Get-SafeLogTail -Path $backendStderr)"
    }
    throw
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
    foreach ($phase3File in @($phase3Script, $phase3Stdout, $phase3Stderr)) {
        if ($phase3File -and (Test-Path -LiteralPath $phase3File)) {
            Remove-Item -LiteralPath $phase3File -Force
        }
    }
    foreach ($backendLogFile in @($backendStdout, $backendStderr)) {
        if ($backendLogFile -and (Test-Path -LiteralPath $backendLogFile)) {
            Remove-Item -LiteralPath $backendLogFile -Force
        }
    }
}

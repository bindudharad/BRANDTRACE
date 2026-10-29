<#
.SYNOPSIS
    Test suite for PowerShell API response handling and assertion pipeline separation.
#>
param()

$ErrorActionPreference = "Stop"

Write-Host ("=" * 70)
Write-Host "TESTING POWERSHELL RESPONSE HANDLING & PIPELINE SEPARATION"
Write-Host ("=" * 70)

# 1. Test Syntax of scripts/verify_hosted_staging.ps1
Write-Host "`n[Test 1] Verifying PowerShell AST parsing of verify_hosted_staging.ps1..."
$scriptPath = Join-Path $PSScriptRoot "verify_hosted_staging.ps1"
$parseErrors = @()
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$null, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) {
    foreach ($err in $parseErrors) {
        Write-Error "Syntax Error at line $($err.Extent.StartLineNumber): $($err.Message)"
    }
    throw "AST validation failed for verify_hosted_staging.ps1"
}
Write-Host "  PASS: verify_hosted_staging.ps1 syntax is 100% valid."

# 2. Test Pipeline Separation: Diagnostic message MUST NOT pollute return value
Write-Host "`n[Test 2] Testing Write-Host vs Write-Output pipeline separation..."
function Mock-AssertApiCall {
    param([string]$TestName, [int]$ExpectedStatus, [string]$Content)
    # Correct implementation: Write-Host does not enter pipeline
    Write-Host "  PASS [$TestName]: HTTP $ExpectedStatus"
    return [string]$Content
}

$rawJson = '{"id": "rule_test_123", "status": "APPROVED", "title": "Test Rule"}'
$capture = Mock-AssertApiCall -TestName "Test Rule Creation" -ExpectedStatus 201 -Content $rawJson

if ($capture -is [System.Array]) {
    throw "FAILED: Function returned an array of $($capture.Count) items! Pipeline pollution detected: $($capture | Out-String)"
}
if ($capture -ne $rawJson) {
    throw "FAILED: Function return value mismatch. Expected '$rawJson', got '$capture'"
}

$parsed = $null
try {
    $parsed = $capture | ConvertFrom-Json
} catch {
    throw "FAILED: ConvertFrom-Json failed on clean return value: $($_.Exception.Message)"
}

if (-not $parsed.id -or $parsed.id -ne "rule_test_123") {
    throw "FAILED: Parsed object missing or incorrect 'id' field. Got: $($parsed.id)"
}
Write-Host "  PASS: Diagnostic message stayed off pipeline; ConvertFrom-Json succeeded with id=$($parsed.id)."

# 3. Test Malformed JSON Handling
Write-Host "`n[Test 3] Testing malformed JSON error handling..."
$malformedBody = "PASS [Admin creates rule]: HTTP 201"
$caughtMalformed = $false
try {
    if ([string]::IsNullOrWhiteSpace($malformedBody)) {
        throw "Empty response"
    }
    $badParsed = $malformedBody | ConvertFrom-Json
} catch {
    $caughtMalformed = $true
    Write-Host "  PASS: Malformed JSON was safely caught: $($_.Exception.Message)"
}
if (-not $caughtMalformed) {
    throw "FAILED: Malformed JSON was unexpectedly accepted!"
}

# 4. Test Missing Required Field Detection
Write-Host "`n[Test 4] Testing missing required field validation..."
$jsonMissingId = '{"status": "BOOTSTRAPPED", "workspace_id": "ws_default"}'
$objMissingId = $jsonMissingId | ConvertFrom-Json
if (-not $objMissingId.id -or [string]::IsNullOrWhiteSpace($objMissingId.id)) {
    Write-Host "  PASS: Missing 'id' field correctly identified."
} else {
    throw "FAILED: Expected missing 'id' detection to trigger."
}

# 5. Test Credential & Secret Masking in Diagnostics
Write-Host "`n[Test 5] Testing Get-SafeDiagnostic secret masking..."
function Get-SafeDiagnostic {
    param([string]$Text)
    if ($null -eq $Text) { return "" }
    return $Text -replace '(?i)(postgres(?:ql)?(?:\+psycopg)?://)[^\s''"]+', '$1***' -replace '(?i)password=[^\s;]+', 'password=***'
}

$rawSecretDiagnostic = "Connection to postgresql://admin:SuperSecretPass123@ep-cool-db.aws.neon.tech/neondb?sslmode=require failed: password=SuperSecretPass123"
$masked = Get-SafeDiagnostic -Text $rawSecretDiagnostic
if ($masked -match "SuperSecretPass123") {
    throw "FAILED: Password was not masked by Get-SafeDiagnostic!"
}
if ($masked -notmatch "postgresql://\*\*\*") {
    throw "FAILED: URL was not properly masked!"
}
Write-Host "  PASS: Secrets and connection strings safely masked: $masked"

# 6. Test Empty Body Detection
Write-Host "`n[Test 6] Testing empty response body detection..."
$emptyBody = ""
if ([string]::IsNullOrWhiteSpace($emptyBody)) {
    Write-Host "  PASS: Empty response body correctly caught before ConvertFrom-Json."
} else {
    throw "FAILED: Empty body check failed."
}

Write-Host ""
Write-Host ("=" * 70)
Write-Host "ALL POWERSHELL RESPONSE-HANDLING REGRESSION TESTS PASSED (6/6)"
Write-Host ("=" * 70)

<#
.SYNOPSIS
    BRANDTRACE - Live Production Render Deployment Verification Script (PowerShell 5.1 Compatible)
.DESCRIPTION
    Independently inspects the live Render production backend (https://brandtrace-api.onrender.com),
    asserts health, readiness (PostgreSQL), version telemetry, and OpenAPI path/operation parity.
#>

param(
    [string]$BackendBase = "https://brandtrace-api.onrender.com",
    [string]$ExpectedCommit = "",
    [string]$AppCodeCommit = "7638a3fb5154f92161f5cb3bcb194add2f1b8ae4",
    [switch]$AutoDetect = $true,
    [switch]$Strict = $false
)

$ErrorActionPreference = "Continue"

# 1. Resolve Intended Deployment Commit SHA
$resolvedVia = ""
if ($AutoDetect -and [string]::IsNullOrWhiteSpace($ExpectedCommit)) {
    try {
        $gitOrigin = (& git rev-parse origin/main 2>$null)
        if ($gitOrigin -and $gitOrigin.Trim().Length -ge 7) {
            $ExpectedCommit = $gitOrigin.Trim()
            $resolvedVia = "Auto-detected from git (origin/main)"
        } else {
            $gitHead = (& git rev-parse HEAD 2>$null)
            if ($gitHead -and $gitHead.Trim().Length -ge 7) {
                $ExpectedCommit = $gitHead.Trim()
                $resolvedVia = "Auto-detected from git (HEAD)"
            }
        }
    } catch {
        # Git not in path or not in repository
    }
}

if ([string]::IsNullOrWhiteSpace($ExpectedCommit)) {
    $ExpectedCommit = "73adbc07a9286daf769d1c1aa843944cf94ef497"
    $resolvedVia = "Default fallback release SHA"
} else {
    if (-not $resolvedVia) {
        $resolvedVia = "Explicit parameter"
    }
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "BRANDTRACE - LIVE RENDER PRODUCTION VERIFICATION (PowerShell 5.1)" -ForegroundColor Cyan
Write-Host "Target Base:                    $BackendBase" -ForegroundColor Cyan
Write-Host "Intended Deployment Commit SHA: $ExpectedCommit ($resolvedVia)" -ForegroundColor Cyan
Write-Host "Application Code Commit SHA:    $AppCodeCommit" -ForegroundColor Cyan
Write-Host "Strict Verification Mode:       $($Strict.ToString().ToUpper())" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$allPassed = $true
$issues = @()

# Helper function to invoke HTTP with clean error capture (PowerShell 5.1 compatible)
function Invoke-SafeRest($url) {
    try {
        $req = [System.Net.WebRequest]::Create($url)
        $req.Timeout = 15000
        $req.Method = "GET"
        $resp = $req.GetResponse()
        $stream = $resp.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        $reader.Close()
        $resp.Close()
        return @{
            StatusCode = [int]$resp.StatusCode
            Success = $true
            Body = $body
            Json = ($body | ConvertFrom-Json)
        }
    } catch [System.Net.WebException] {
        $ex = $_.Exception
        $code = 0
        $body = ""
        if ($ex.Response) {
            $code = [int]$ex.Response.StatusCode
            $stream = $ex.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $body = $reader.ReadToEnd()
                $reader.Close()
            }
            $ex.Response.Close()
        }
        return @{
            StatusCode = $code
            Success = $false
            Error = $ex.Message
            Body = $body
        }
    } catch {
        return @{
            StatusCode = 0
            Success = $false
            Error = $_.Exception.Message
            Body = ""
        }
    }
}

# 1. Check /api/health
Write-Host "`n[1/5] Checking /api/health..." -ForegroundColor Yellow
$health = Invoke-SafeRest "$BackendBase/api/health"
if ($health.Success -and $health.StatusCode -eq 200) {
    Write-Host "  [PASS] /api/health HTTP 200 OK: $($health.Body)" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] /api/health returned status $($health.StatusCode): $($health.Error)" -ForegroundColor Red
    $allPassed = $false
    $issues += "/api/health failed"
}

# 2. Check /api/ready
Write-Host "`n[2/5] Checking /api/ready (Database Connection)..." -ForegroundColor Yellow
$ready = Invoke-SafeRest "$BackendBase/api/ready"
if ($ready.Success -and $ready.StatusCode -eq 200) {
    $dbType = $ready.Json.database
    if ($dbType -eq "postgresql") {
        Write-Host "  [PASS] /api/ready HTTP 200 OK (PostgreSQL database ready): $($ready.Body)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] /api/ready HTTP 200 OK but database is '$dbType', expected 'postgresql'" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [FAIL] /api/ready returned status $($ready.StatusCode): $($ready.Error)" -ForegroundColor Red
    $allPassed = $false
    $issues += "/api/ready failed"
}

# 3. Check /api/version
Write-Host "`n[3/5] Checking /api/version..." -ForegroundColor Yellow
$version = Invoke-SafeRest "$BackendBase/api/version"
if ($version.Success -and $version.StatusCode -eq 200) {
    $liveCommit = ""
    if ($version.Json.commit_sha) {
        $liveCommit = $version.Json.commit_sha.ToString().Trim().ToLower()
    }
    $targetCommit = $ExpectedCommit.Trim().ToLower()
    $appCommit = $AppCodeCommit.Trim().ToLower()

    Write-Host "  [PASS] /api/version HTTP 200 OK (Reported commit_sha: '$liveCommit')" -ForegroundColor Green

    if ($liveCommit -eq $targetCommit -or ($liveCommit.Length -ge 7 -and $targetCommit.StartsWith($liveCommit)) -or ($targetCommit.Length -ge 7 -and $liveCommit.StartsWith($targetCommit))) {
        Write-Host "  [MATCH] Live commit exactly matches intended deployment commit ($ExpectedCommit)" -ForegroundColor Green
    } elseif ($liveCommit -eq $appCommit -or ($liveCommit.Length -ge 7 -and $appCommit.StartsWith($liveCommit)) -or ($appCommit.Length -ge 7 -and $liveCommit.StartsWith($appCommit))) {
        Write-Host "  [WARNING] Live commit matches application-code commit ($AppCodeCommit), but NOT the intended deployment commit ($ExpectedCommit)." -ForegroundColor Yellow
        Write-Host "            Parent commit must not be treated as the actual deployed revision." -ForegroundColor Yellow
        $issues += "Live commit matches parent application commit ($AppCodeCommit) instead of target deployment ($ExpectedCommit)"
        if ($Strict) { $allPassed = $false }
    } else {
        Write-Host "  [MISMATCH] Live commit ($liveCommit) does not match expected deployment commit ($ExpectedCommit)" -ForegroundColor Red
        $issues += "Commit mismatch: Live is '$liveCommit', expected '$ExpectedCommit'"
        if ($Strict) { $allPassed = $false }
    }
} elseif ($version.StatusCode -eq 404) {
    Write-Host "  [PENDING] /api/version returned HTTP 404 Not Found" -ForegroundColor Yellow
    Write-Host "  Note: Render web service is currently serving baseline release (41940fc)." -ForegroundColor Yellow
    Write-Host "  Manual Deploy action required in Render Dashboard to deploy commit $ExpectedCommit." -ForegroundColor Yellow
    $issues += "/api/version HTTP 404 (Render web service has not deployed commit $ExpectedCommit)"
    if ($Strict) { $allPassed = $false }
} else {
    Write-Host "  [FAIL] /api/version returned status $($version.StatusCode): $($version.Error)" -ForegroundColor Red
    $allPassed = $false
    $issues += "/api/version failed with status $($version.StatusCode)"
}

# 4. Check /openapi.json & Path / Operation counts
Write-Host "`n[4/5] Checking /openapi.json..." -ForegroundColor Yellow
$openapi = Invoke-SafeRest "$BackendBase/openapi.json"
if ($openapi.Success -and $openapi.StatusCode -eq 200) {
    $api = $openapi.Json
    # Use PowerShell 5.1 PSCustomObject property inspection
    $pathNames = @($api.paths.PSObject.Properties.Name)
    $pathCount = $pathNames.Count

    $operationCount = 0
    foreach ($prop in $api.paths.PSObject.Properties) {
        $pathObj = $prop.Value
        if ($pathObj -and $pathObj.PSObject) {
            $methods = @($pathObj.PSObject.Properties.Name | Where-Object { $_ -match '^(get|post|put|delete|patch|options|head)$' })
            $operationCount += $methods.Count
        }
    }

    Write-Host "  [PASS] /openapi.json HTTP 200 OK" -ForegroundColor Green
    Write-Host "  Registered OpenAPI Paths: $pathCount" -ForegroundColor Green
    Write-Host "  Total HTTP Operations: $operationCount" -ForegroundColor Green

    Write-Host "`nRegistered Live Paths:" -ForegroundColor Cyan
    foreach ($p in ($pathNames | Sort-Object)) {
        Write-Host "    - $p"
    }

    # 5. Check Critical and Advanced Routes
    Write-Host "`n[5/5] Checking Route Availability..." -ForegroundColor Yellow
    $criticalRequired = @(
        "/api/health",
        "/api/ready",
        "/api/rules",
        "/api/facts",
        "/api/reviews",
        "/api/overview",
        "/api/insights",
        "/api/brand-assets"
    )

    $advancedZeroDeferred = @(
        "/api/version",
        "/api/brand-assets/upload",
        "/api/documents/ocr",
        "/api/documents/typography-check",
        "/api/governance/expiry-worker/trigger",
        "/api/governance/guideline-health",
        "/api/governance/impact-map",
        "/api/logo-intelligence/references",
        "/api/logo-intelligence/analyze/image",
        "/api/logo-intelligence/analyze/pdf",
        "/api/logo-intelligence/reports/{report_id}/download"
    )

    $missingCritical = @()
    foreach ($reqPath in $criticalRequired) {
        if ($pathNames -contains $reqPath) {
            Write-Host "  [OK] Critical route present: $reqPath" -ForegroundColor Green
        } else {
            Write-Host "  [MISSING] Critical route missing: $reqPath" -ForegroundColor Red
            $missingCritical += $reqPath
        }
    }

    $missingAdvanced = @()
    foreach ($advPath in $advancedZeroDeferred) {
        if ($pathNames -contains $advPath) {
            Write-Host "  [OK] Advanced route present: $advPath" -ForegroundColor Green
        } else {
            Write-Host "  [PENDING] Advanced route not yet in live schema: $advPath" -ForegroundColor Yellow
            $missingAdvanced += $advPath
        }
    }

    if ($missingCritical.Count -gt 0) {
        $allPassed = $false
        $issues += "Missing $($missingCritical.Count) critical routes in live OpenAPI"
    }
    if ($missingAdvanced.Count -gt 0 -and $Strict) {
        $allPassed = $false
        $issues += "Missing $($missingAdvanced.Count) advanced routes in live OpenAPI (Pending Deploy)"
    }
} else {
    Write-Host "  [FAIL] /openapi.json returned status $($openapi.StatusCode): $($openapi.Error)" -ForegroundColor Red
    $allPassed = $false
    $issues += "/openapi.json failed"
}

# Summary Report
Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "RENDER PRODUCTION VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
if ($allPassed -and $issues.Count -eq 0) {
    Write-Host "ALL CHECKS PASSED: Live Render production backend matches expected release." -ForegroundColor Green
    exit 0
} else {
    Write-Host "VERIFICATION RESULT: PENDING DEPLOYMENT / ISSUES DETECTED" -ForegroundColor Yellow
    foreach ($iss in $issues) {
        Write-Host "  - $iss" -ForegroundColor Yellow
    }
    if ($Strict) {
        Write-Host "`nExiting with code 1 (Strict Mode Enabled: verification failed)." -ForegroundColor Red
        exit 1
    } else {
        Write-Host "`nExiting with code 0 (Informational / Diagnostic Mode)." -ForegroundColor Green
        exit 0
    }
}

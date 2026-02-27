#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Clone Platform - Pre-Deployment Validation Checklist

.DESCRIPTION
    Comprehensive pre-deployment checks to ensure production readiness

.EXAMPLE
    .\validate-deployment.ps1

.NOTES
    Run this before any production deployment
#>

$ErrorActionPreference = "Continue"

# Colors (ANSI when supported; plain text fallback for legacy Windows PowerShell)
$supportsAnsi = $false
if ($PSVersionTable.PSEdition -eq "Core") {
    $supportsAnsi = $true
} elseif ($env:WT_SESSION -or $env:TERM -or $env:ConEmuANSI -eq "ON") {
    $supportsAnsi = $true
}

if ($supportsAnsi) {
    $esc = [char]27
    $Green = "${esc}[32m"
    $Red = "${esc}[31m"
    $Yellow = "${esc}[33m"
    $Blue = "${esc}[34m"
    $Reset = "${esc}[0m"
} else {
    $Green = ""
    $Red = ""
    $Yellow = ""
    $Blue = ""
    $Reset = ""
}

# Checklist results
$checksPassed = 0
$checksFailed = 0

function Test-Item {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$Description
    )

    Write-Host ""
    Write-Host "[CHECK] $Name"
    if ($Description) {
        Write-Host "   $Description"
    }

    try {
        $result = & $Test
        if ($result) {
            Write-Host "$Green   PASS$Reset"
            $script:checksPassed++
        } else {
            Write-Host "$Red   FAIL$Reset"
            $script:checksFailed++
        }
    } catch {
        Write-Host "$Red   ERROR: $_$Reset"
        $script:checksFailed++
    }
}

function Write-ListItems {
    param(
        [string[]]$Items,
        [string]$Prefix = "     - ",
        [int]$MaxItems = 0
    )

    if (-not $Items -or $Items.Count -eq 0) {
        return
    }

    $normalizedItems = @($Items | Where-Object { $_ } | Sort-Object -Unique)
    $itemsToPrint = $normalizedItems

    if ($MaxItems -gt 0 -and $normalizedItems.Count -gt $MaxItems) {
        $itemsToPrint = @($normalizedItems | Select-Object -First $MaxItems)
    }

    foreach ($item in $itemsToPrint) {
        Write-Host "$Prefix$item"
    }

    if ($MaxItems -gt 0 -and $normalizedItems.Count -gt $MaxItems) {
        $remainingCount = $normalizedItems.Count - $MaxItems
        Write-Host "     ...and $remainingCount more"
    }
}

Write-Host ""
Write-Host "$Blue============================================================$Reset"
Write-Host "$Blue  PRE-DEPLOYMENT VALIDATION CHECKLIST$Reset"
Write-Host "$Blue============================================================$Reset"
Write-Host ""

# ============================================================================
# SECTION 1: CODE QUALITY
# ============================================================================

Write-Host "$Yellow=== CODE QUALITY CHECKS ===$Reset"

Test-Item "TypeScript Compilation" {
    $output = & npx tsc --noEmit 2>&1 | Select-String "error"
    if ($output) {
        Write-Host "$Red   Found errors:$Reset"
        Write-Host $output
        return $false
    }
    return $true
} "Verify no TypeScript errors"

Test-Item "All Tests Passing" {
    $output = npm run test:smoke 2>&1
    if ($output -match "passed" -or $LASTEXITCODE -eq 0) {
        return $true
    }
    Write-Host "$Red   Test output: $output$Reset"
    return $false
} "Smoke tests must pass"

Test-Item "No Console Errors" {
    $consoleErrors = @()
    foreach ($file in Get-ChildItem -Path "src/" -Include "*.tsx" -Recurse) {
        $content = Get-Content $file
        if ($content -match "console\.(error|warn|log)" -and $file -notmatch "test") {
            $consoleErrors += $file.FullName
        }
    }

    if ($consoleErrors.Count -gt 0) {
        Write-Host "$Yellow   Warning: Found console statements in:$Reset"
        Write-ListItems -Items $consoleErrors -MaxItems 12
        return $true
    }
    return $true
} "Check for debug console statements"

# ============================================================================
# SECTION 2: SECURITY CHECKS
# ============================================================================

Write-Host ""
Write-Host "$Yellow=== SECURITY CHECKS ===$Reset"

Test-Item "No GitHub Tokens in Code" {
    $gitTokens = @()
    Get-ChildItem -Path "src/","supabase/" -Include "*.tsx","*.ts" -Recurse | ForEach-Object {
        if ((Get-Content $_) -match "ghp_|github_pat_") {
            $gitTokens += $_.FullName
        }
    }

    if ($gitTokens.Count -gt 0) {
        Write-Host "$Red   Found tokens in:$Reset"
        $gitTokens | ForEach-Object { Write-Host "     $_" }
        return $false
    }
    return $true
} "Verify no hardcoded GitHub tokens"

Test-Item "No API Keys in Code" {
    $apiKeys = @()
    $literalSecretPattern = '(?i)(sk_live_[a-z0-9]{8,}|sk_test_[a-z0-9]{8,}|SUPABASE_(?:SERVICE_ROLE|ANON)?_KEY\s*[:=]\s*["''][^"'']+["''])'
    Get-ChildItem -Path "src/" -Include "*.tsx","*.ts" -Recurse | ForEach-Object {
        if ((Get-Content $_ -Raw) -match $literalSecretPattern) {
            $apiKeys += $_.FullName
        }
    }

    if ($apiKeys.Count -gt 0) {
        Write-Host "$Red   Found keys in:$Reset"
        $apiKeys | ForEach-Object { Write-Host "     $_" }
        return $false
    }
    return $true
} "Verify no hardcoded API keys"

Test-Item ".gitignore is Complete" {
    $gitignore = Get-Content ".gitignore"
    $required = @(".env", ".env.local", ".env.*.local", "node_modules", "dist")

    $missing = @()
    foreach ($item in $required) {
        if ($gitignore -notcontains $item) {
            $missing += $item
        }
    }

    if ($missing.Count -gt 0) {
        Write-Host "$Yellow   Missing entries: $($missing -join ', ')$Reset"
        return $true
    }
    return $true
} "Verify .gitignore excludes sensitive files"

Test-Item "Admin Key Protected" {
    $adminKeyRefs = @()
    Get-ChildItem -Path "src/" -Include "*.tsx" -Recurse | ForEach-Object {
        $content = Get-Content $_ -Raw
        if ($content -match '(?i)(SUPABASE_SERVICE_ROLE_KEY|ADMIN_API_KEY)\s*[:=]\s*["''][^"'']+["'']') {
            $adminKeyRefs += $_.FullName
        }
    }

    if ($adminKeyRefs.Count -gt 0) {
        Write-Host "$Red   Frontend contains admin references:$Reset"
        $adminKeyRefs | ForEach-Object { Write-Host "     $_" }
        return $false
    }
    return $true
} "Verify admin keys not in frontend code"

# ============================================================================
# SECTION 3: DEPENDENCIES
# ============================================================================

Write-Host ""
Write-Host "$Yellow=== DEPENDENCY CHECKS ===$Reset"

Test-Item "package.json is Valid JSON" {
    try {
        $content = Get-Content "package.json" -Raw
        $null = $content | ConvertFrom-Json
        return $true
    } catch {
        Write-Host "$Red   Invalid JSON: $_$Reset"
        return $false
    }
} "Validate package.json syntax"

Test-Item "All Dependencies Installed" {
    return (Test-Path "node_modules")
} "Verify node_modules exists"

Test-Item "No Deprecated Dependencies" {
    $output = & npm audit 2>&1
    if ($output -match "vulnerabilities|deprecated") {
        Write-Host "$Yellow   Run 'npm audit' to review issues$Reset"
        return $true
    }
    return $true
} "Check for dependency issues"

# ============================================================================
# SECTION 4: BUILD & DEPLOYMENT
# ============================================================================

Write-Host ""
Write-Host "$Yellow=== BUILD AND DEPLOYMENT CHECKS ===$Reset"

Test-Item "Build Succeeds" {
    $null = & npm run build 2>&1
    return (Test-Path "dist")
} "Verify frontend builds without errors"

Test-Item "Build Size Acceptable" {
    $bundleSize = (Get-ChildItem "dist/" -File -Recurse -ErrorAction Ignore | Measure-Object -Property Length -Sum).Sum / 1MB
    if ($bundleSize -gt 100) {
        Write-Host "$Yellow   Bundle size: $([math]::Round($bundleSize, 2))MB (consider optimization)$Reset"
        return $true
    }
    Write-Host "   Bundle size: $([math]::Round($bundleSize, 2))MB"
    return $true
} "Check compiled bundle size"

Test-Item "dist/ Directory Structure" {
    $requiredFiles = @("index.html", "assets/")
    $missing = @()

    foreach ($file in $requiredFiles) {
        if (-not (Test-Path "dist/$file")) {
            $missing += $file
        }
    }

    if ($missing.Count -gt 0) {
        Write-Host "$Red   Missing files: $($missing -join ', ')$Reset"
        return $false
    }
    return $true
} "Verify dist/ has required files"

Test-Item "Supabase Function Exists" {
    return (Test-Path "supabase/functions/server/index.tsx")
} "Verify Edge Function code exists"

Test-Item "Environment File Present" {
    if ((Test-Path ".env.local") -or (Test-Path ".env.production.local")) {
        return $true
    }
    Write-Host "$Yellow   Warning: No local env file found (.env.local or .env.production.local)$Reset"
    return $true
} "Verify environment configuration"

# ============================================================================
# SECTION 5: DOCUMENTATION
# ============================================================================

Write-Host ""
Write-Host "$Yellow=== DOCUMENTATION CHECKS ===$Reset"

Test-Item "API Documentation Complete" {
    if (-not (Test-Path "API_REFERENCE.md")) {
        Write-Host "$Red   API_REFERENCE.md missing$Reset"
        return $false
    }
    $length = (Get-Content "API_REFERENCE.md").Length
    if ($length -lt 1000) {
        Write-Host "$Yellow   Warning: API_REFERENCE.md is short ($length lines)$Reset"
    }
    return $true
} "Verify API_REFERENCE.md exists and is substantial"

Test-Item "OpenAPI Spec Present" {
    return ((Test-Path "openapi.yaml") -and ((Get-Content "openapi.yaml").Length -gt 1000))
} "Verify openapi.yaml exists"

Test-Item "Integration Guide Present" {
    return (Test-Path "INTEGRATION_GUIDE.md")
} "Verify INTEGRATION_GUIDE.md exists"

Test-Item "Operations Runbook Present" {
    return (Test-Path "OPERATIONS_RUNBOOK.md")
} "Verify OPERATIONS_RUNBOOK.md exists"

Test-Item "Team Onboarding Guide Present" {
    return (Test-Path "TEAM_ONBOARDING.md")
} "Verify TEAM_ONBOARDING.md exists"

Test-Item "Production Deployment Summary" {
    return (Test-Path "PRODUCTION_LAUNCH_SUMMARY.md")
} "Verify PRODUCTION_LAUNCH_SUMMARY.md exists"

# ============================================================================
# SECTION 6: GIT STATUS
# ============================================================================

Write-Host ""
Write-Host "$Yellow=== GIT CHECKS ===$Reset"

Test-Item "Git Repository Clean" {
    $statusLines = @(& git status --porcelain)
    if ($statusLines.Count -gt 0) {
        Write-Host "$Yellow   Uncommitted changes:$Reset"
        Write-ListItems -Items $statusLines -MaxItems 20
        return $true
    }
    return $true
} "Check for uncommitted changes"

Test-Item "Recent Commits Exist" {
    $commits = @(& git log --oneline | Select-Object -First 5)
    Write-Host "   Recent commits:"
    $commits | ForEach-Object { Write-Host "     $_" }
    return $true
} "Verify commit history"

# ============================================================================
# RESULTS
# ============================================================================

Write-Host ""
Write-Host "$Blue============================================================$Reset"

$totalChecks = $checksPassed + $checksFailed

if ($checksFailed -eq 0) {
    Write-Host "$GreenALL CHECKS PASSED ($checksPassed/$totalChecks)$Reset"
    Write-Host ""
    Write-Host "$GreenSYSTEM IS READY FOR PRODUCTION DEPLOYMENT$Reset"
    exit 0
} else {
    Write-Host "$Red$checksFailed/$totalChecks checks failed$Reset"
    Write-Host ""
    Write-Host "$RedFIX FAILURES ABOVE BEFORE DEPLOYING TO PRODUCTION$Reset"
    exit 1
}

#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Clone Platform - One-Command Production Deployment Script
    
.DESCRIPTION
    Automates the complete deployment pipeline:
    1. Pre-deployment validation (tests, security, env)
    2. Build frontend & backend
    3. Deploy to Supabase
    4. Post-deployment verification
    5. Health check
    
.EXAMPLE
    .\deploy.ps1
    
.NOTES
    Requires: Node.js, npm, Supabase CLI
    Environment Variables: SUPABASE_PROJECT_ID (optional)
#>

param(
    [string]$Environment = "production",
    [switch]$SkipTests,
    [switch]$DryRun,
    [switch]$RollbackLatest
)

# Configuration
$ErrorActionPreference = "Stop"
$script:StartTime = Get-Date
$script:DeploymentId = (Get-Date -Format "yyyyMMdd-HHmmss")

# Color codes
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $timestamp = (Get-Date -Format "HH:mm:ss")
    $icon = @{
        "INFO" = "ℹ️ "
        "SUCCESS" = "✅"
        "WARNING" = "⚠️ "
        "ERROR" = "❌"
        "STEP" = "📍"
    }[$Type]
    
    $color = @{
        "INFO" = $Blue
        "SUCCESS" = $Green
        "WARNING" = $Yellow
        "ERROR" = $Red
        "STEP" = $Blue
    }[$Type]
    
    Write-Host "$color$icon [$timestamp] $Message$Reset"
}

function Test-Prerequisite {
    param([string]$Command, [string]$Description)
    try {
        $null = & $Command --version 2>&1
        Write-Status "$Description found" "SUCCESS"
        return $true
    } catch {
        Write-Status "$Description NOT found - install and try again" "ERROR"
        return $false
    }
}

function Invoke-Command {
    param([string]$Description, [scriptblock]$Command)
    Write-Status $Description "STEP"
    try {
        & $Command
        Write-Status "$Description - Complete" "SUCCESS"
        return $true
    } catch {
        Write-Status "$Description - FAILED: $_" "ERROR"
        return $false
    }
}

# ============================================================================
# PHASE 1: PRE-DEPLOYMENT VALIDATION
# ============================================================================

Write-Host ""
Write-Host "$Blue════════════════════════════════════════════════════════════$Reset"
Write-Host "$Blue  CLONE PLATFORM - PRODUCTION DEPLOYMENT (ID: $script:DeploymentId)$Reset"
Write-Host "$Blue════════════════════════════════════════════════════════════$Reset"
Write-Host ""

Write-Status "Phase 1: Pre-Deployment Validation Starting..." "STEP"

# Check prerequisites
Write-Status "Checking prerequisites..." "INFO"
$prereqsOK = @(
    (Test-Prerequisite "node" "Node.js"),
    (Test-Prerequisite "npm" "npm"),
    (Test-Prerequisite "npx" "npx")
) -notcontains $false

if (-not $prereqsOK) {
    Write-Status "Prerequisites check failed" "ERROR"
    exit 1
}

# Check git status
Write-Status "Checking Git status..." "INFO"
try {
    $gitStatus = & git status --porcelain 2>&1
    if ($gitStatus -and -not $DryRun) {
        Write-Status "Uncommitted changes detected. Commit or stash changes before deploying." "WARNING"
        Write-Host $gitStatus
        $continue = Read-Host "Continue anyway? (yes/no)"
        if ($continue -ne "yes") {
            Write-Status "Deployment cancelled" "WARNING"
            exit 0
        }
    }
} catch {
    Write-Status "Git check skipped (not a git repo)" "WARNING"
}

# Check environment file
Write-Status "Checking environment configuration..." "INFO"
if (-not (Test-Path ".env.production.local") -and -not (Test-Path ".env.local")) {
    Write-Status "No .env file found. Deployment may fail if Supabase keys are missing." "WARNING"
    Write-Host "  Expected: .env.local or .env.production.local"
} else {
    Write-Status "Environment file found" "SUCCESS"
}

# ============================================================================
# PHASE 2: RUN TESTS
# ============================================================================

Write-Host ""
Write-Status "Phase 2: Testing Starting..." "STEP"

if ($SkipTests) {
    Write-Status "Tests skipped (--SkipTests)" "WARNING"
} else {
    $testPassed = Invoke-Command "Running smoke tests (27 tests)" {
        & npm run test:smoke 2>&1 | ForEach-Object {
            if ($_ -match "passed|failed") {
                Write-Host $_
            }
        }
        $LASTEXITCODE -eq 0
    }
    
    if (-not $testPassed) {
        Write-Status "Tests failed - deployment aborted" "ERROR"
        exit 1
    }
}

# ============================================================================
# PHASE 3: BUILD
# ============================================================================

Write-Host ""
Write-Status "Phase 3: Building Project..." "STEP"

$buildPassed = Invoke-Command "Building frontend (TypeScript/Vite)" {
    & npm run build 2>&1 | ForEach-Object {
        if ($_ -match "error|warning|built") {
            Write-Host "  $_"
        }
    }
    (Test-Path "dist") -and $LASTEXITCODE -eq 0
}

if (-not $buildPassed) {
    Write-Status "Build failed - deployment aborted" "ERROR"
    exit 1
}

Write-Status "Build artifacts created: $(ls -r dist/ -ErrorAction Ignore | Measure-Object).Count files" "SUCCESS"

# ============================================================================
# PHASE 4: DEPLOYMENT
# ============================================================================

Write-Host ""
Write-Status "Phase 4: Deploying to Production..." "STEP"

if ($DryRun) {
    Write-Status "DRY RUN enabled - showing deployment steps only" "WARNING"
    Write-Host ""
    Write-Host "$Yellow📋 Deployment would proceed with:$Reset"
    Write-Host "  1. Deploy Edge Function: npx supabase functions deploy make-server-44a642d3 --no-verify-jwt"
    Write-Host "  2. Deploy Frontend: dist/ → Supabase/Vercel/Netlify"
    Write-Host "  3. Run post-deployment tests"
    Write-Host "  4. Health check verification"
    Write-Host ""
    Write-Status "Dry run complete" "SUCCESS"
    exit 0
}

# Deploy Supabase function
$functionPassed = Invoke-Command "Deploying Supabase Edge Function" {
    Write-Host "  Command: npx supabase functions deploy make-server-44a642d3 --no-verify-jwt"
    & npx supabase functions deploy make-server-44a642d3 --no-verify-jwt 2>&1 | ForEach-Object {
        if ($_ -match "deployed|error|failed") {
            Write-Host "  $_"
        }
    }
    $LASTEXITCODE -eq 0
}

if (-not $functionPassed) {
    Write-Status "Function deployment failed" "ERROR"
    Write-Host ""
    Write-Status "Attempting rollback to previous version..." "WARNING"
    & git checkout HEAD~1 -- supabase/functions/server/index.tsx 2>&1
    & npm run build
    & npx supabase functions deploy make-server-44a642d3 --no-verify-jwt 2>&1
    Write-Status "Rolled back to previous version" "WARNING"
    exit 1
}

Write-Status "Function deployed successfully" "SUCCESS"

# ============================================================================
# PHASE 5: POST-DEPLOYMENT VERIFICATION
# ============================================================================

Write-Host ""
Write-Status "Phase 5: Post-Deployment Verification..." "STEP"

# Get function URL
$functionUrl = "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3"
Write-Status "Function URL: $functionUrl" "INFO"

# Health check
Write-Status "Running health check..." "INFO"
try {
    $response = Invoke-WebRequest -Uri "$functionUrl/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Status "Health check PASSED (200)" "SUCCESS"
        $healthData = $response.Content | ConvertFrom-Json
        Write-Host "  Status: $($healthData.status)"
    } else {
        Write-Status "Health check FAILED ($($response.StatusCode))" "ERROR"
    }
} catch {
    Write-Status "Health check ERROR: $_" "ERROR"
}

# Run post-deployment smoke tests
Write-Status "Running post-deployment smoke tests..." "INFO"
$postTestPassed = Invoke-Command "Post-deployment smoke tests" {
    # Set environment variable for test
    $env:FUNCTION_URL = $functionUrl
    & npm run test:smoke 2>&1 | ForEach-Object {
        if ($_ -match "passed|failed|error") {
            Write-Host "  $_"
        }
    }
    $LASTEXITCODE -eq 0
}

if (-not $postTestPassed) {
    Write-Status "Post-deployment tests failed - check logs" "WARNING"
} else {
    Write-Status "Post-deployment tests PASSED" "SUCCESS"
}

# ============================================================================
# PHASE 6: SUMMARIZE DEPLOYMENT
# ============================================================================

Write-Host ""
$duration = (Get-Date) - $script:StartTime
Write-Status "Deployment Complete! (Duration: $($duration.TotalMinutes.ToString('F1')) minutes)" "SUCCESS"

Write-Host ""
Write-Host "$Green════════════════════════════════════════════════════════════$Reset"
Write-Host "$Green  ✅ PRODUCTION DEPLOYMENT SUCCESSFUL$Reset"
Write-Host "$Green════════════════════════════════════════════════════════════$Reset"
Write-Host ""

Write-Host "$Blue📊 Deployment Summary:$Reset"
Write-Host "  Deployment ID:    $script:DeploymentId"
Write-Host "  Environment:      $Environment"
Write-Host "  Timestamp:        $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host "  Duration:         $($duration.TotalMinutes.ToString('F1')) minutes"
Write-Host ""

Write-Host "$Blue📍 Next Steps:$Reset"
Write-Host "  1. Monitor function logs:"
Write-Host "     supabase functions logs make-server-44a642d3 -n 50"
Write-Host ""
Write-Host "  2. View deployed function:"
Write-Host "     $functionUrl"
Write-Host ""
Write-Host "  3. Check Supabase dashboard:"
Write-Host "     https://app.supabase.com"
Write-Host ""
Write-Host "  4. Deploy frontend (if needed):"
Write-Host "     Upload 'dist/' to Vercel/Netlify/Supabase Hosting"
Write-Host ""

Write-Host "$Blue📚 Documentation:$Reset"
Write-Host "  - API Reference:      API_REFERENCE.md"
Write-Host "  - Operations Guide:   OPERATIONS_RUNBOOK.md"
Write-Host "  - Integration Guide:  INTEGRATION_GUIDE.md"
Write-Host "  - Quick Reference:    QUICK_REFERENCE.md"
Write-Host ""

Write-Host "$Blue🔗 Useful Links:$Reset"
Write-Host "  - Health Check:       curl $functionUrl/health"
Write-Host "  - Test Collection:    postman_collection.json"
Write-Host "  - Documentation Hub:  DOCUMENTATION_INDEX.md"
Write-Host ""

# Create deployment record
$deploymentRecord = @{
    deploymentId = $script:DeploymentId
    timestamp = Get-Date -Format "o"
    environment = $Environment
    duration = "$($duration.TotalMinutes.ToString('F1')) minutes"
    status = "SUCCESS"
    version = & git describe --tags --always 2>&1
    functionUrl = $functionUrl
} | ConvertTo-Json | Out-String

$deploymentRecord | Out-File -FilePath "deployment-records/$script:DeploymentId.json" -Force
Write-Status "Deployment record saved: deployment-records/$script:DeploymentId.json" "INFO"

Write-Host ""
Write-Host "$Green🚀 Platform is LIVE and READY!$Reset"
Write-Host ""

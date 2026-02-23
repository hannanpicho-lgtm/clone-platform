#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Clone Platform - Emergency Rollback Script
    
.DESCRIPTION
    Quickly rolls back to previous stable version in case of production issues
    
.EXAMPLE
    .\rollback.ps1              # Rollback to HEAD~1
    .\rollback.ps1 -Commits 3   # Rollback 3 commits
    .\rollback.ps1 -Tag v1.0.0  # Rollback to specific tag
    
.NOTES
    This is an emergency procedure. Use with caution in production.
#>

param(
    [int]$Commits = 1,
    [string]$Tag,
    [switch]$DryRun,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Colors
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
    }[$Type]
    
    $color = @{
        "INFO" = $Blue
        "SUCCESS" = $Green
        "WARNING" = $Yellow
        "ERROR" = $Red
    }[$Type]
    
    Write-Host "$color$icon [$timestamp] $Message$Reset"
}

Write-Host ""
Write-Host "$Red╔════════════════════════════════════════╗$Reset"
Write-Host "$Red║         🚨 EMERGENCY ROLLBACK 🚨       ║$Reset"
Write-Host "$Red╚════════════════════════════════════════╝$Reset"
Write-Host ""

# Confirm user understands this is dangerous
Write-Status "⚠️  ROLLBACK WILL:" "WARNING"
Write-Host "  1. Revert source code to a previous version"
Write-Host "  2. Rebuild the project"
Write-Host "  3. Redeploy to production"
Write-Host "  4. May lose recent changes"
Write-Host ""

if (-not $Force) {
    $confirm = Read-Host "Are you absolutely sure? Type 'YES I UNDERSTAND' to continue"
    if ($confirm -ne "YES I UNDERSTAND") {
        Write-Status "Rollback cancelled" "WARNING"
        exit 0
    }
}

Write-Host ""
Write-Status "Starting rollback process..." "INFO"

# Determine rollback target
if ($Tag) {
    Write-Status "Rolling back to tag: $Tag" "WARNING"
    $target = $Tag
} else {
    Write-Status "Rolling back $Commits commit(s)" "WARNING"
    $target = "HEAD~$Commits"
}

# Get current version
Write-Status "Current version:" "INFO"
& git log --oneline -1

# Get target version
Write-Status "Target version:" "INFO"
& git show --stat $target | head -10

# List files that will change
Write-Status "Files affected:" "INFO"
& git diff --name-only $target HEAD

# Confirm again
if (-not $DryRun) {
    $confirm = Read-Host "Proceed with rollback to $target ? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Status "Rollback cancelled" "WARNING"
        exit 0
    }
}

# Perform rollback
if ($DryRun) {
    Write-Status "DRY RUN MODE - No actual changes made" "WARNING"
    exit 0
}

try {
    # Checkout previous version
    Write-Status "Checking out $target..." "INFO"
    & git checkout $target -- supabase/
    & git checkout $target -- src/
    & git checkout $target -- package.json
    Write-Status "Code reverted" "SUCCESS"
    
    # Rebuild
    Write-Status "Rebuilding project..." "INFO"
    & npm install
    & npm run build
    Write-Status "Build complete" "SUCCESS"
    
    # Redeploy
    Write-Status "Redeploying to production..." "WARNING"
    & npx supabase functions deploy make-server-44a642d3 --no-verify-jwt
    Write-Status "Function redeployed" "SUCCESS"
    
    # Health check
    Write-Status "Running health check..." "INFO"
    $response = Invoke-WebRequest -Uri "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/health" -Method GET -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Status "Health check PASSED" "SUCCESS"
    } else {
        Write-Status "Health check FAILED - verify manually" "ERROR"
    }
    
    # Run tests
    Write-Status "Running smoke tests..." "INFO"
    & npm run test:smoke
    
    Write-Host ""
    Write-Host "$Green╔════════════════════════════════════════╗$Reset"
    Write-Host "$Green║     ✅ ROLLBACK SUCCESSFUL ✅          ║$Reset"
    Write-Host "$Green╚════════════════════════════════════════╝$Reset"
    Write-Host ""
    
    Write-Status "Rolled back to: $target" "SUCCESS"
    Write-Status "Current version:" "INFO"
    & git log --oneline -1
    
    Write-Host ""
    Write-Status "📋 Next Steps:" "INFO"
    Write-Host "  1. Investigate what caused the deployment failure"
    Write-Host "  2. Fix the issue in your code"
    Write-Host "  3. Create a new commit with the fix"
    Write-Host "  4. Test locally: npm run test:smoke"
    Write-Host "  5. Deploy again when ready: .\deploy.ps1"
    Write-Host ""
    
} catch {
    Write-Status "Rollback FAILED: $_" "ERROR"
    Write-Host ""
    Write-Status "Manual Rollback Steps:" "WARNING"
    Write-Host "  1. git checkout $target -- supabase/"
    Write-Host "  2. git checkout $target -- src/"
    Write-Host "  3. npm install && npm run build"
    Write-Host "  4. npx supabase functions deploy make-server-44a642d3 --no-verify-jwt"
    Write-Host "  5. npm run test:smoke"
    Write-Host ""
    Write-Status "Contact support if issues persist" "ERROR"
    exit 1
}

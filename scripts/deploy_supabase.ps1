# Deploy Supabase functions and apply schema (PowerShell)
# Requires `supabase` CLI available or will use npx
if (-not $env:SUPABASE_PROJECT_REF) {
  Write-Error "Please set SUPABASE_PROJECT_REF environment variable"
  exit 1
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Output "SUPABASE_ACCESS_TOKEN not set - using existing Supabase CLI login session."
} elseif ($env:SUPABASE_ACCESS_TOKEN -like "PASTE_*" -or $env:SUPABASE_ACCESS_TOKEN -notlike "sbp_*") {
  Write-Error "SUPABASE_ACCESS_TOKEN must be a real Supabase CLI token starting with sbp_ (not a placeholder)."
  exit 1
}

$functionName = if ($env:SUPABASE_FUNCTION_NAME) { $env:SUPABASE_FUNCTION_NAME } else { "make-server-44a642d3" }
$schemaPath = Join-Path (Split-Path $PSScriptRoot -Parent) "supabase\schema\kv_store_44a642d3.sql"

if (-not (Test-Path $schemaPath)) {
  Write-Error "Schema file not found at: $schemaPath"
  exit 1
}

Write-Output "Deploying Supabase functions..."
& npx supabase functions deploy $functionName --project-ref $env:SUPABASE_PROJECT_REF --no-verify-jwt

if ($LASTEXITCODE -ne 0) {
  Write-Error "Function deployment failed"
  exit $LASTEXITCODE
}

Write-Output "Applying DB schema..."
& npx supabase link --project-ref $env:SUPABASE_PROJECT_REF

if ($LASTEXITCODE -ne 0) {
  Write-Error "Project link failed"
  exit $LASTEXITCODE
}

& npx supabase db push --linked

if ($LASTEXITCODE -ne 0) {
  Write-Error "Schema apply failed"
  exit $LASTEXITCODE
}

Write-Output "Done."

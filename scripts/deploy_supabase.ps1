# Deploy Supabase functions and apply schema (PowerShell)
# Requires `supabase` CLI available or will use npx
if (-not $env:SUPABASE_PROJECT_REF) {
  Write-Error "Please set SUPABASE_PROJECT_REF environment variable"
  exit 1
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Error "Please set SUPABASE_ACCESS_TOKEN environment variable (Supabase CLI token)"
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

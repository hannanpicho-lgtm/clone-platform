Supabase setup and deploy steps

1) Create a Supabase project
   - Go to https://app.supabase.com and create a new project.
   - Note the project ref (project id) and the anon public key.

2) Local environment
   - Copy `.env.example` to `.env` and set:
     - `VITE_SUPABASE_PROJECT_ID` = your project ref (used by frontend)
     - `VITE_SUPABASE_ANON_KEY` = your anon key
   - Restart the dev server after adding `.env`.

3) Using the keys in the app
   - The frontend reads `import.meta.env.VITE_SUPABASE_PROJECT_ID` and
     `VITE_SUPABASE_ANON_KEY` in `utils/supabase/info.tsx` with a safe fallback.

4) Deploying Edge Functions (supabase CLI)
   - Install Supabase CLI: https://supabase.com/docs/guides/cli
   - Authenticate: `supabase login`
   - Link local project: `supabase link --project-ref <your-project-ref>`
      - Deploy functions (example):
         - `supabase functions deploy make-server-44a642d3 --project-ref <your-project-ref> --no-verify-jwt`
      - (Alternative) deploy the legacy folder directly: `supabase functions deploy server --project-ref <your-project-ref>`
      - Database schema is applied using migrations (`supabase db push --linked`) after linking the project.

   Local deploy script (Windows PowerShell):
      - Set env vars:
   ```powershell
   $env:SUPABASE_PROJECT_REF = "<your-project-ref>"
   $env:SUPABASE_ACCESS_TOKEN = "<your-supabase-cli-token>"
   # Optional: override function name (default is make-server-44a642d3)
   # $env:SUPABASE_FUNCTION_NAME = "make-server-44a642d3"
   ```
      - Run:
   ```powershell
   ./scripts/deploy_supabase.ps1
   ```

   CI: A GitHub Actions workflow is included at `.github/workflows/supabase-deploy.yml`.

5) CI / GitHub Actions (optional)
   - Use `supabase/actions` or run the CLI in your workflow to deploy on push.
   - Store `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_PROJECT_REF` as GitHub Secrets.

6) Notes
   - For local development the fallback values remain in `utils/supabase/info.tsx`.
   - A compatibility wrapper exists at `supabase/functions/make-server-44a642d3/` so the current frontend endpoint paths keep working.
   - For production builds, ensure `.env` values are set in your CI and not committed.
   - If you prefer `.env` variables with different names, update `info.tsx` accordingly.

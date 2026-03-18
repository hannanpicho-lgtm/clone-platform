# Release Changelog - 2026-03-19

## Release
- Tag: release-20260319-credential-reset
- Commit: a72616db
- Scope: Admin-controlled credential reset without email dependency

## Highlights
- Added admin endpoint to reset user credentials with secure random password generation.
- Added forced password-change-on-login flow via must_change_password flag.
- Added credential reset audit log endpoint for admin review.
- Added admin UI action to reset credentials and securely copy one-time credentials.
- Added user-facing forced password change modal in dashboard login flow.

## Security
- Enforced permission gate for credential resets (users.manage_credentials).
- Enforced tenant scope checks to prevent cross-tenant reset operations.
- Added rate limiting on credential reset actions.
- Logged reset actions with admin ID, user ID, timestamp, IP, and tenant context.
- Ensured plaintext credentials are returned once and not stored.

## Validation
- Production build: passed.
- Function deployment: passed (make-server-44a642d3).
- Smoke test flow: passed.
- Premium admin endpoint tests: passed after server-side ADMIN_API_KEY configuration.

## Notes
- Supabase CLI rejects project secret names starting with SUPABASE_.
- Server-side admin secret configured as ADMIN_API_KEY.

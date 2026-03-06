# Staging Environment Setup

This guide explains how to deploy and preview changes in the staging environment before going live.

## Steps
1. Update `.env.staging` with your staging API endpoints and keys.
2. Build the project for staging:
   ```bash
   npm run build
   ```
3. Deploy to staging using the script:
   ```bash
   ./deploy-staging.sh
   ```
4. Visit your staging URL to preview changes.

## Notes
- Staging uses separate resources from production.
- Make adjustments in staging before deploying to production.

# Staging Environment Usage

## How to Preview Updates
1. Make your code changes as usual.
2. Update `.env.staging` with any new environment variables for staging.
3. Build the project:
   ```bash
   npm run build
   ```
4. Deploy to staging:
   ```bash
   ./deploy-staging.sh
   ```
5. Visit your staging site URL to review changes before going live.

## Best Practices
- Always test in staging before deploying to production.
- Use staging for final review and team feedback.
- Update environment variables and API endpoints in `.env.staging` as needed.

## Troubleshooting
- If you see errors, check your staging API keys and endpoints.
- Review the deployment script for correct server details.
- Contact your admin or developer for staging server access.

---
This file is auto-generated to help you preview and adjust updates safely before production deployment.

# TankPlatform Staging Environment Setup

This bundle provisions a private staging environment for:

- Domain: `staging.tankplatform-workbench.com`
- Host: same server as production (subdomain-based)
- Isolation: separate database, separate storage path, separate app process
- Access: private via HTTP basic auth

## 1. DNS Setup

Create an `A` record:

- Host: `staging`
- Value: current production server public IP
- TTL: 300

Verify from your machine:

```bash
nslookup staging.tankplatform-workbench.com
```

## 2. Prepare Directories on Server

```bash
sudo mkdir -p /var/www/tankplatform/staging/app
sudo mkdir -p /var/www/tankplatform/staging/storage
sudo chown -R www-data:www-data /var/www/tankplatform/staging
```

Deploy application code into `/var/www/tankplatform/staging/app`.

## 3. Provision Isolated DB and Storage

Use:

- `scripts/provision-staging-linux.sh`

Example:

```bash
cd /var/www/tankplatform/staging/setup
chmod +x scripts/*.sh
STAGING_DB_PASSWORD='replace-with-strong-password' bash scripts/provision-staging-linux.sh
```

## 4. Create Staging Environment File

Copy `./.env.staging.example` to server location `/var/www/tankplatform/staging/.env.staging`, then set real values.

Minimum values:

- `APP_URL=https://staging.tankplatform-workbench.com`
- `DATABASE_URL=postgresql://tankplatform_staging:<password>@127.0.0.1:5432/tankplatform_staging`
- `STORAGE_LOCAL_PATH=/var/www/tankplatform/staging/storage`

## 5. Configure Nginx for Subdomain

Copy:

- `nginx/staging.tankplatform-workbench.com.conf` -> `/etc/nginx/sites-available/staging.tankplatform-workbench.com.conf`

Then enable:

```bash
sudo ln -s /etc/nginx/sites-available/staging.tankplatform-workbench.com.conf /etc/nginx/sites-enabled/staging.tankplatform-workbench.com.conf
```

Create staging basic auth user:

```bash
sudo apt-get update
sudo apt-get install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd_tankplatform_staging reviewer
```

## 6. Issue TLS Certificate

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d staging.tankplatform-workbench.com --redirect --non-interactive --agree-tos -m admin@tankplatform-workbench.com
```

## 7. Deploy and Run Staging App

Use:

- `scripts/deploy-staging-systemd.sh`

Example:

```bash
cd /var/www/tankplatform/staging/setup
bash scripts/deploy-staging-systemd.sh
```

## 8. Smoke Test Checklist

1. `curl -I https://staging.tankplatform-workbench.com` returns `401` (basic auth challenge) or `200` after auth.
2. Application footer or API response confirms `APP_ENV=staging`.
3. New records written in staging do not appear in production DB.
4. Uploaded files land in `/var/www/tankplatform/staging/storage` (or staging bucket).
5. Any staging outbound integrations remain disabled or pointed at sandbox targets.

## 9. Sync From Production Safely (Optional)

For realistic testing, seed staging with a sanitized production snapshot:

1. Dump production DB.
2. Remove or anonymize sensitive PII.
3. Restore into `tankplatform_staging`.
4. Do not copy production API keys/secrets into staging.

## Security Notes

- Keep staging credentials unique from production.
- Restrict staging to private reviewers with basic auth (or VPN/IP allow-list).
- Disable real payment, email, and SMS send paths in staging.
- Keep backup and retention policies separate.

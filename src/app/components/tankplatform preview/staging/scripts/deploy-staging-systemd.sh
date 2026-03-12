#!/usr/bin/env bash
set -euo pipefail

# Deploys TankPlatform staging as a systemd service on port 4001.
# Assumes app code is already present at /var/www/tankplatform/staging/app.

APP_DIR="/var/www/tankplatform/staging/app"
ENV_FILE="/var/www/tankplatform/staging/.env.staging"
SERVICE_NAME="tankplatform-staging"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

if [[ ! -d "${APP_DIR}" ]]; then
  echo "ERROR: APP_DIR not found: ${APP_DIR}"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ENV_FILE not found: ${ENV_FILE}"
  exit 1
fi

# Install dependencies and build (adjust commands for your stack)
cd "${APP_DIR}"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run build

# Optional database migration command; customize for your framework
if npm run | grep -q "db:migrate"; then
  NODE_ENV=staging $(cat "${ENV_FILE}" | xargs) npm run db:migrate
fi

sudo tee "${SERVICE_FILE}" > /dev/null <<SERVICE
[Unit]
Description=TankPlatform Staging Service
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl status "${SERVICE_NAME}" --no-pager

echo "Staging deployment service is active."

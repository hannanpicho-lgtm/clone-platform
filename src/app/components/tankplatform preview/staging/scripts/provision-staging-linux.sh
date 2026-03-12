#!/usr/bin/env bash
set -euo pipefail

# Provision isolated database and filesystem storage for staging.
# Run as a sudo-capable user on the Linux host.

STAGING_DB_NAME="tankplatform_staging"
STAGING_DB_USER="tankplatform_staging"
STAGING_DB_PASSWORD="${STAGING_DB_PASSWORD:-}"
STAGING_STORAGE_PATH="/var/www/tankplatform/staging/storage"

if [[ -z "${STAGING_DB_PASSWORD}" ]]; then
  echo "ERROR: STAGING_DB_PASSWORD is not set."
  echo "Usage: STAGING_DB_PASSWORD='<strong-password>' bash provision-staging-linux.sh"
  exit 1
fi

echo "Creating isolated storage path at ${STAGING_STORAGE_PATH}"
sudo mkdir -p "${STAGING_STORAGE_PATH}"
sudo chown -R www-data:www-data "/var/www/tankplatform/staging"
sudo chmod -R 750 "/var/www/tankplatform/staging"

echo "Creating isolated PostgreSQL database and user"
sudo -u postgres psql <<SQL
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${STAGING_DB_USER}') THEN
      CREATE ROLE ${STAGING_DB_USER} LOGIN PASSWORD '${STAGING_DB_PASSWORD}';
   ELSE
      ALTER ROLE ${STAGING_DB_USER} WITH LOGIN PASSWORD '${STAGING_DB_PASSWORD}';
   END IF;
END
$do$;

DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${STAGING_DB_NAME}') THEN
      CREATE DATABASE ${STAGING_DB_NAME} OWNER ${STAGING_DB_USER};
   END IF;
END
$do$;

GRANT ALL PRIVILEGES ON DATABASE ${STAGING_DB_NAME} TO ${STAGING_DB_USER};
SQL

echo "Provisioning complete."
echo "Remember to run your app migrations against ${STAGING_DB_NAME}."

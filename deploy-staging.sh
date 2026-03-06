#!/bin/bash
# Deploy to staging environment
npm run build
# Example: Deploy build to staging server (replace with your actual command)
rsync -av --delete dist/ user@staging-server:/var/www/tankplatform-staging

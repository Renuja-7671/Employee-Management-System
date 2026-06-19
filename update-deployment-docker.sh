#!/bin/bash
# VPS update script — Docker deployment (use instead of PM2 update-deployment.sh)
echo "🔄 Updating EMS Application (Docker)..."

cd /var/www/ems

echo "📥 Pulling latest code from GitHub..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Error: Git pull failed"
    exit 1
fi

chmod +x scripts/docker/*.sh
bash scripts/docker/deploy.sh

#!/bin/bash
# Run EMS app in Docker (replaces PM2 for the app process).
# Uses .env DATABASE_URL (Supabase or external Postgres).
#
# Run from repo root on VPS: bash scripts/docker/up-ems.sh
#
# WARNING: Stops PM2 ems process to avoid port 3000 conflict.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

if [ ! -f .env ]; then
  echo "Error: .env not found in ${REPO_ROOT}"
  exit 1
fi

bash "${SCRIPT_DIR}/install-docker.sh"

if command -v pm2 &>/dev/null && pm2 describe ems &>/dev/null; then
  echo "==> Stopping PM2 ems (port 3000)..."
  pm2 stop ems || true
fi

echo "==> Building and starting EMS container..."
docker compose -f docker-compose.ems.yml up -d --build

echo ""
docker compose -f docker-compose.ems.yml ps
echo ""
echo "EMS is running in Docker on 127.0.0.1:3000"
echo "Nginx should proxy to localhost:3000 as before."
echo ""
echo "Logs: docker compose -f docker-compose.ems.yml logs -f app"
echo "Stop: docker compose -f docker-compose.ems.yml down"
echo "Restore PM2: pm2 start ems"

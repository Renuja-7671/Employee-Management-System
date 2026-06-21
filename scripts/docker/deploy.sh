#!/bin/bash
# Deploy EMS to Docker on VPS (replaces PM2).
#
# Run on VPS from repo root:
#   bash scripts/docker/deploy.sh
#
# Requires: .env with DATABASE_URL, DIRECT_URL, and NEXT_PUBLIC_* vars

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

echo "========================================"
echo " EMS Docker Deploy"
echo "========================================"

if [ ! -f .env ]; then
  echo "Error: .env not found in ${REPO_ROOT}"
  exit 1
fi

# Show which DB host will be used (from .env — same as PM2 setup)
DB_HOST=$(grep -m1 '^DATABASE_URL=' .env | sed -E 's/^DATABASE_URL=//' | tr -d '"' | sed -E 's|.*@([^:/]+).*|\1|')
echo "Database host from .env: ${DB_HOST}"
if echo "${DB_HOST}" | grep -qi supabase; then
  echo "Using Supabase (external DB) — correct for production."
else
  echo "WARNING: DATABASE_URL does not look like Supabase."
  echo "         Check .env before continuing."
fi
echo ""

# Docker Compose reads .env automatically for build args — do not `source` it
# (values with spaces e.g. APP_NAME=Unique Industrial Solutions break bash).

bash "${SCRIPT_DIR}/install-docker.sh"

echo ""
echo "==> Stopping PM2 ems (if running)..."
if command -v pm2 &>/dev/null && pm2 describe ems &>/dev/null 2>&1; then
  pm2 stop ems || true
  echo "    PM2 ems stopped. (Start again with: pm2 start ems)"
fi

echo ""
echo "==> Building Docker image (this may take several minutes)..."
docker compose --env-file .env -f docker-compose.ems.yml build

echo ""
echo "==> Starting container..."
docker compose --env-file .env -f docker-compose.ems.yml up -d

echo ""
echo "==> Waiting for health check..."
sleep 10
docker compose -f docker-compose.ems.yml ps

if docker inspect ems-app --format='{{.State.Health.Status}}' 2>/dev/null | grep -q healthy; then
  echo "Health: healthy"
else
  echo "Health: starting or unknown — check logs:"
  echo "  docker compose -f docker-compose.ems.yml logs --tail 30 app"
fi

echo ""
echo "========================================"
echo " Deploy complete"
echo "========================================"
echo "EMS URL (via Nginx): https://72.60.210.93  (or your domain)"
echo "Logs:  docker compose -f docker-compose.ems.yml logs -f app"
echo "Stop:  docker compose -f docker-compose.ems.yml down"
echo ""
docker compose -f docker-compose.ems.yml ps

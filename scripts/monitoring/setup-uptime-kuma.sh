#!/bin/bash
# Install Uptime Kuma for EMS uptime and health monitoring.
# Run on the VPS as root: bash scripts/monitoring/setup-uptime-kuma.sh

set -euo pipefail

CONTAINER_NAME="uptime-kuma"
IMAGE="louislam/uptime-kuma:1"
HOST_PORT="${UPTIME_KUMA_PORT:-3001}"

echo "==> Checking Docker..."
if ! command -v docker &>/dev/null; then
  echo "Docker not found. Installing..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "==> Container '${CONTAINER_NAME}' already exists. Restarting..."
  docker start "${CONTAINER_NAME}" || docker restart "${CONTAINER_NAME}"
else
  echo "==> Starting Uptime Kuma on port ${HOST_PORT}..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    -p "127.0.0.1:${HOST_PORT}:3001" \
    -v uptime-kuma-data:/app/data \
    "${IMAGE}"
fi

echo ""
echo "Uptime Kuma is running at http://127.0.0.1:${HOST_PORT}"
echo ""
echo "First-time setup:"
echo "  1. SSH tunnel (from your laptop): ssh -L 3001:127.0.0.1:3001 root@YOUR_VPS_IP"
echo "  2. Open http://localhost:3001 and create an admin account"
echo "  3. Add monitors (see docs/monitoring.md)"
echo ""
echo "Recommended monitors:"
echo "  - EMS Site:     https://dxxs3.com"
echo "  - EMS Health:   https://dxxs3.com/api/health?key=YOUR_MONITOR_SECRET"
echo "  4. Create a Status Page in Settings -> Status Pages"
echo ""
docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

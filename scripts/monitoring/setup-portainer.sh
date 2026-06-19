#!/bin/bash
# Install Portainer CE for Docker management on the VPS.
# Run on the VPS as root: bash scripts/monitoring/setup-portainer.sh
#
# Access via SSH tunnel (recommended):
#   ssh -L 9443:127.0.0.1:9443 root@72.60.210.93
#   Open https://localhost:9443

set -euo pipefail

CONTAINER_NAME="portainer"
IMAGE="portainer/portainer-ce:latest"
HTTPS_PORT="${PORTAINER_HTTPS_PORT:-9443}"
HTTP_PORT="${PORTAINER_HTTP_PORT:-9000}"
VOLUME_NAME="portainer_data"

echo "==> Checking Docker..."
if ! command -v docker &>/dev/null; then
  echo "Docker not found. Installing..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! docker volume inspect "${VOLUME_NAME}" &>/dev/null; then
  echo "==> Creating volume ${VOLUME_NAME}..."
  docker volume create "${VOLUME_NAME}"
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "==> Container '${CONTAINER_NAME}' already exists. Starting..."
  docker start "${CONTAINER_NAME}" || docker restart "${CONTAINER_NAME}"
else
  echo "==> Starting Portainer (localhost only)..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    -p "127.0.0.1:${HTTPS_PORT}:9443" \
    -p "127.0.0.1:${HTTP_PORT}:9000" \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "${VOLUME_NAME}:/data" \
    "${IMAGE}"
fi

echo ""
echo "Portainer is running:"
echo "  HTTPS: https://127.0.0.1:${HTTPS_PORT}"
echo "  HTTP:  http://127.0.0.1:${HTTP_PORT}  (redirects to HTTPS)"
echo ""
echo "Access from your laptop (SSH tunnel):"
echo "  ssh -L ${HTTPS_PORT}:127.0.0.1:${HTTPS_PORT} root@YOUR_VPS_IP"
echo "  Open https://localhost:${HTTPS_PORT}"
echo ""
echo "First visit: create the Portainer admin account (min 12 characters)."
echo "Environment: select 'Get Started' -> local Docker (unix:///var/run/docker.sock)"
echo ""
docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

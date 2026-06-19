#!/bin/bash
# Bring up monitoring Docker stack (Uptime Kuma + Portainer).
# Run from repo root on VPS: bash scripts/docker/up-monitoring.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

bash "${SCRIPT_DIR}/install-docker.sh"

echo ""
echo "==> Starting monitoring containers..."
docker compose -f docker-compose.monitoring.yml up -d

echo ""
docker compose -f docker-compose.monitoring.yml ps
echo ""
echo "Access via SSH tunnel from your laptop:"
echo "  ssh -L 3001:127.0.0.1:3001 -L 9443:127.0.0.1:9443 root@YOUR_VPS_IP"
echo ""
echo "  Uptime Kuma: http://localhost:3001"
echo "  Portainer:   https://localhost:9443"

#!/bin/bash
# Full Docker setup on VPS: install Docker + start monitoring stack.
# Optional: pass --with-ems to also run EMS in Docker (stops PM2).
#
# Usage:
#   bash scripts/docker/setup-vps.sh
#   bash scripts/docker/setup-vps.sh --with-ems

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo " EMS VPS Docker Setup"
echo "========================================"

bash "${SCRIPT_DIR}/install-docker.sh"
echo ""
bash "${SCRIPT_DIR}/up-monitoring.sh"

if [ "${1:-}" = "--with-ems" ]; then
  echo ""
  bash "${SCRIPT_DIR}/up-ems.sh"
else
  echo ""
  echo "EMS is still expected to run via PM2."
  echo "To run EMS in Docker instead: bash scripts/docker/up-ems.sh"
fi

echo ""
echo "========================================"
echo " Docker setup complete"
echo "========================================"

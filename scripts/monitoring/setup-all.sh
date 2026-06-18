#!/bin/bash
# Full VPS monitoring stack setup for EMS.
# Run on the VPS as root from the EMS repo directory.
#
# Usage:
#   EMS_DOMAIN=dxxs3.com MONITOR_AUTH_PASS='your-password' bash scripts/monitoring/setup-all.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo " EMS VPS Monitoring Setup"
echo "========================================"

bash "${SCRIPT_DIR}/setup-uptime-kuma.sh"
echo ""
bash "${SCRIPT_DIR}/setup-netdata.sh"
echo ""
bash "${SCRIPT_DIR}/setup-nginx-monitoring.sh"

echo ""
echo "========================================"
echo " Setup complete. Next steps:"
echo "========================================"
echo "1. Add MONITOR_SECRET to EMS .env on VPS and redeploy"
echo "2. Configure Uptime Kuma monitors (see docs/monitoring.md)"
echo "3. Add DNS records for status/metrics subdomains"
echo "4. Run certbot for HTTPS on monitoring subdomains"
echo "5. Configure alert notifications in Uptime Kuma"

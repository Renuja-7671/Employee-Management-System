#!/bin/bash
# Install Netdata for VPS CPU/RAM/disk/network monitoring.
# Run on the VPS as root: bash scripts/monitoring/setup-netdata.sh

set -euo pipefail

NETDATA_PORT="${NETDATA_PORT:-19999}"

echo "==> Installing Netdata..."
if command -v netdata &>/dev/null; then
  echo "Netdata already installed. Ensuring service is running..."
  systemctl enable netdata
  systemctl restart netdata
else
  wget -O /tmp/netdata-kickstart.sh https://get.netdata.cloud/kickstart.sh
  sh /tmp/netdata-kickstart.sh --non-interactive
fi

# Bind Netdata to localhost only (access via Nginx reverse proxy)
NETDATA_CONF="/etc/netdata/netdata.conf"
if [ -f "${NETDATA_CONF}" ]; then
  if ! grep -q "^[[:space:]]*bind to[[:space:]]*=[[:space:]]*= 127.0.0.1" "${NETDATA_CONF}"; then
    sed -i 's/^[[:space:]]*bind to[[:space:]]*=.*/    bind to = localhost/' "${NETDATA_CONF}" 2>/dev/null || true
    systemctl restart netdata
  fi
fi

echo ""
echo "Netdata is running at http://127.0.0.1:${NETDATA_PORT}"
echo "Expose via Nginx at https://metrics.dxxs3.com (see docs/monitoring.md)"
echo ""
systemctl is-active netdata && echo "Status: active" || echo "Status: check systemctl status netdata"

#!/bin/bash
# Install Nginx reverse proxy for EMS on VPS.
# Proxies port 80 (and optionally 443) -> localhost:3000
#
# Run as root: bash scripts/nginx/setup-nginx.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if ! command -v nginx &>/dev/null; then
  echo "==> Installing Nginx..."
  apt-get update -qq
  apt-get install -y nginx
fi

cp "${SCRIPT_DIR}/ems.conf" /etc/nginx/sites-available/ems
ln -sf /etc/nginx/sites-available/ems /etc/nginx/sites-enabled/ems

# Disable default site if it conflicts
if [ -f /etc/nginx/sites-enabled/default ]; then
  rm -f /etc/nginx/sites-enabled/default
  echo "Removed default nginx site."
fi

nginx -t
systemctl enable nginx
systemctl reload nginx

echo ""
echo "Nginx configured. EMS should be available at:"
echo "  http://72.60.210.93"
echo "  http://72.60.210.93/login"
echo ""
echo "Ensure EMS listens on 127.0.0.1:3000 (Docker) or PM2 on port 3000."
echo "Close public port 3000: ufw deny 3000"
echo ""
echo "When dxxs3.com DNS works:"
echo "  1. Uncomment HTTPS block in /etc/nginx/sites-available/ems"
echo "  2. certbot --nginx -d dxxs3.com -d www.dxxs3.com"
echo "  3. Update NEXT_PUBLIC_APP_URL in .env and rebuild EMS"

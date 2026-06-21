#!/bin/bash
# Add EMS nginx on port 8080 ONLY — does not touch quotation system (80/443).
# Run as root: bash scripts/nginx/setup-ems-coexist.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v nginx &>/dev/null; then
  echo "Nginx is not installed. Ask the quotation team before installing."
  exit 1
fi

cp "${SCRIPT_DIR}/ems-coexist.conf" /etc/nginx/sites-available/ems

# Enable only our site — do NOT remove other sites-enabled entries
ln -sf /etc/nginx/sites-available/ems /etc/nginx/sites-enabled/ems

nginx -t
systemctl reload nginx

echo ""
echo "EMS nginx added on port 8080 only."
echo "  http://72.60.210.93:8080"
echo ""
echo "Quotation system on 80/443 was NOT modified."
echo "Ensure PM2 ems is running on port 3000."

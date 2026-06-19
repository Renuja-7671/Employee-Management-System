#!/bin/bash
# Expose monitoring on the EXISTING main domain (no new DNS/subdomains).
# Uses paths on dxxs3.com — works with your current HTTPS certificate.
#
# Run on VPS as root:
#   EMS_DOMAIN=dxxs3.com MONITOR_AUTH_PASS='your-password' bash scripts/monitoring/setup-nginx-paths.sh
#
# After setup, open in browser:
#   https://dxxs3.com/monitor/status/   (Uptime Kuma)
#   https://dxxs3.com/monitor/metrics/  (Netdata)

set -euo pipefail

EMS_DOMAIN="${EMS_DOMAIN:-dxxs3.com}"
MONITOR_AUTH_USER="${MONITOR_AUTH_USER:-admin}"
MONITOR_AUTH_PASS="${MONITOR_AUTH_PASS:-}"
UPTIME_KUMA_PORT="${UPTIME_KUMA_PORT:-3001}"
NETDATA_PORT="${NETDATA_PORT:-19999}"

if [ -z "${MONITOR_AUTH_PASS}" ]; then
  MONITOR_AUTH_PASS="$(openssl rand -base64 16)"
  echo "Generated monitor auth password: ${MONITOR_AUTH_PASS}"
  echo "Save this password — it will not be shown again."
fi

if ! command -v htpasswd &>/dev/null; then
  apt-get update -qq && apt-get install -y apache2-utils
fi

AUTH_FILE="/etc/nginx/.monitoring_htpasswd"
htpasswd -bc "${AUTH_FILE}" "${MONITOR_AUTH_USER}" "${MONITOR_AUTH_PASS}"

# Find the main EMS nginx site config (ssl or default)
SITE_CONF=""
for candidate in \
  "/etc/nginx/sites-available/${EMS_DOMAIN}" \
  "/etc/nginx/sites-available/default" \
  "/etc/nginx/sites-enabled/default"; do
  if [ -f "${candidate}" ] && grep -q "server_name.*${EMS_DOMAIN}" "${candidate}" 2>/dev/null; then
    SITE_CONF="${candidate}"
    break
  fi
done

if [ -z "${SITE_CONF}" ]; then
  echo "Could not find nginx config for ${EMS_DOMAIN}."
  echo "List configs: ls /etc/nginx/sites-available/"
  echo "Then manually add the location blocks from docs/monitoring.md (SSH-only section)."
  exit 1
fi

SNIPPET_FILE="/etc/nginx/snippets/ems-monitoring-paths.conf"
cat > "${SNIPPET_FILE}" <<EOF
# EMS monitoring — path-based (no extra DNS)
location /monitor/status/ {
    auth_basic "EMS Monitoring";
    auth_basic_user_file ${AUTH_FILE};
    proxy_pass http://127.0.0.1:${UPTIME_KUMA_PORT}/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
}

location /monitor/metrics/ {
    auth_basic "EMS Monitoring";
    auth_basic_user_file ${AUTH_FILE};
    proxy_pass http://127.0.0.1:${NETDATA_PORT}/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF

if grep -q "ems-monitoring-paths.conf" "${SITE_CONF}"; then
  echo "Monitoring paths already configured in ${SITE_CONF}"
else
  # Insert include before the closing brace of the first server block
  cp "${SITE_CONF}" "${SITE_CONF}.bak.$(date +%s)"
  awk '
    /^[[:space:]]*server[[:space:]]*\{/ { in_server=1 }
    in_server && /^[[:space:]]*\}/ && !done {
      print "    include /etc/nginx/snippets/ems-monitoring-paths.conf;"
      done=1
    }
    { print }
  ' "${SITE_CONF}" > "${SITE_CONF}.tmp" && mv "${SITE_CONF}.tmp" "${SITE_CONF}"
  echo "Added monitoring paths to ${SITE_CONF}"
fi

nginx -t
systemctl reload nginx

echo ""
echo "Monitoring URLs (no new DNS required):"
echo "  https://${EMS_DOMAIN}/monitor/status/"
echo "  https://${EMS_DOMAIN}/monitor/metrics/"
echo ""
echo "Login: ${MONITOR_AUTH_USER} / (password above)"
echo ""
echo "Note: Uptime Kuma may need its base URL set to https://${EMS_DOMAIN}/monitor/status/"
echo "      in Settings -> Reverse Proxy after first login."

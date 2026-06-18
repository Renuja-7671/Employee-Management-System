#!/bin/bash
# Configure Nginx reverse proxy + basic auth for monitoring dashboards.
# Run on the VPS as root after Uptime Kuma and Netdata are installed.
#
# Usage:
#   EMS_DOMAIN=dxxs3.com bash scripts/monitoring/setup-nginx-monitoring.sh
#
# Optional env vars:
#   STATUS_SUBDOMAIN=status   (default: status)
#   METRICS_SUBDOMAIN=metrics (default: metrics)
#   MONITOR_AUTH_USER=admin
#   MONITOR_AUTH_PASS=change-me

set -euo pipefail

EMS_DOMAIN="${EMS_DOMAIN:-dxxs3.com}"
STATUS_SUBDOMAIN="${STATUS_SUBDOMAIN:-status}"
METRICS_SUBDOMAIN="${METRICS_SUBDOMAIN:-metrics}"
MONITOR_AUTH_USER="${MONITOR_AUTH_USER:-admin}"
MONITOR_AUTH_PASS="${MONITOR_AUTH_PASS:-}"
UPTIME_KUMA_PORT="${UPTIME_KUMA_PORT:-3001}"
NETDATA_PORT="${NETDATA_PORT:-19999}"

if [ -z "${MONITOR_AUTH_PASS}" ]; then
  MONITOR_AUTH_PASS="$(openssl rand -base64 16)"
  echo "Generated monitor auth password: ${MONITOR_AUTH_PASS}"
  echo "Save this password — it will not be shown again."
fi

if ! command -v nginx &>/dev/null; then
  echo "Nginx is not installed. Install with: apt install -y nginx"
  exit 1
fi

if ! command -v htpasswd &>/dev/null; then
  apt-get update -qq && apt-get install -y apache2-utils
fi

AUTH_FILE="/etc/nginx/.monitoring_htpasswd"
htpasswd -bc "${AUTH_FILE}" "${MONITOR_AUTH_USER}" "${MONITOR_AUTH_PASS}"

STATUS_CONF="/etc/nginx/sites-available/ems-monitoring-status"
METRICS_CONF="/etc/nginx/sites-available/ems-monitoring-metrics"

cat > "${STATUS_CONF}" <<EOF
server {
    listen 80;
    server_name ${STATUS_SUBDOMAIN}.${EMS_DOMAIN};

    location / {
        auth_basic "EMS Monitoring";
        auth_basic_user_file ${AUTH_FILE};
        proxy_pass http://127.0.0.1:${UPTIME_KUMA_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

cat > "${METRICS_CONF}" <<EOF
server {
    listen 80;
    server_name ${METRICS_SUBDOMAIN}.${EMS_DOMAIN};

    location / {
        auth_basic "EMS Monitoring";
        auth_basic_user_file ${AUTH_FILE};
        proxy_pass http://127.0.0.1:${NETDATA_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf "${STATUS_CONF}" /etc/nginx/sites-enabled/ems-monitoring-status
ln -sf "${METRICS_CONF}" /etc/nginx/sites-enabled/ems-monitoring-metrics

nginx -t
systemctl reload nginx

# Restrict monitoring ports to localhost (UFW)
if command -v ufw &>/dev/null; then
  ufw allow 80/tcp  || true
  ufw allow 443/tcp || true
  echo "Ensure ports ${UPTIME_KUMA_PORT} and ${NETDATA_PORT} are NOT exposed publicly."
  echo "Uptime Kuma and Netdata should bind to 127.0.0.1 only."
fi

echo ""
echo "Nginx monitoring proxies configured:"
echo "  http://${STATUS_SUBDOMAIN}.${EMS_DOMAIN}  -> Uptime Kuma"
echo "  http://${METRICS_SUBDOMAIN}.${EMS_DOMAIN} -> Netdata"
echo ""
echo "Add DNS A records for:"
echo "  ${STATUS_SUBDOMAIN}.${EMS_DOMAIN}"
echo "  ${METRICS_SUBDOMAIN}.${EMS_DOMAIN}"
echo ""
echo "Then enable HTTPS with certbot:"
echo "  certbot --nginx -d ${STATUS_SUBDOMAIN}.${EMS_DOMAIN} -d ${METRICS_SUBDOMAIN}.${EMS_DOMAIN}"
echo ""
echo "Login: ${MONITOR_AUTH_USER} / (password shown above or set via MONITOR_AUTH_PASS)"

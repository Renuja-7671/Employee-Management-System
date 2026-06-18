#!/bin/bash
# Verify EMS health endpoint (local or production).
# Usage:
#   bash scripts/monitoring/verify-health.sh
#   HEALTH_URL=https://dxxs3.com/api/health MONITOR_SECRET=xxx bash scripts/monitoring/verify-health.sh

set -euo pipefail

HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
MONITOR_SECRET="${MONITOR_SECRET:-}"

if [ -n "${MONITOR_SECRET}" ]; then
  HEALTH_URL="${HEALTH_URL}?key=${MONITOR_SECRET}"
fi

echo "Checking: ${HEALTH_URL%%\?*}..."
RESPONSE=$(curl -s -w "\n%{http_code}" "${HEALTH_URL}")
HTTP_CODE=$(echo "${RESPONSE}" | tail -n1)
BODY=$(echo "${RESPONSE}" | sed '$d')

echo "HTTP ${HTTP_CODE}"
echo "${BODY}" | python3 -m json.tool 2>/dev/null || echo "${BODY}"

if [ "${HTTP_CODE}" = "200" ]; then
  echo "Health check: OK"
  exit 0
fi

echo "Health check: FAILED"
exit 1

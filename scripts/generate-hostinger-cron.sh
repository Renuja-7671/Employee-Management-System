#!/bin/bash

# EMS Hostinger Cron Job Setup Helper
# This script generates the cron commands you need to add in Hostinger hPanel

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   EMS - Hostinger Cron Job Setup Commands                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Get domain from user
read -p "Enter your domain (e.g., yourdomain.com): " DOMAIN

# Get CRON_SECRET
read -p "Enter your CRON_SECRET (or press Enter to generate one): " CRON_SECRET

if [ -z "$CRON_SECRET" ]; then
  echo ""
  echo "Generating secure CRON_SECRET..."
  CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  echo "✅ Generated: $CRON_SECRET"
  echo ""
  echo "⚠️  IMPORTANT: Add this to your Hostinger environment variables:"
  echo "   Variable Name: CRON_SECRET"
  echo "   Variable Value: $CRON_SECRET"
  echo ""
  read -p "Press Enter once you've added the CRON_SECRET to Hostinger..."
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📋 COPY AND PASTE THE FOLLOWING COMMANDS INTO HOSTINGER hPanel"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "─────────────────────────────────────────────────────────────────"
echo "CRON JOB #1: Cleanup Expired Cover Requests"
echo "─────────────────────────────────────────────────────────────────"
echo "Schedule: Every hour (0 * * * *)"
echo ""
echo "Command:"
echo "curl -X GET \"https://${DOMAIN}/api/cron/cleanup-expired-covers\" -H \"Authorization: Bearer ${CRON_SECRET}\""
echo ""

echo "─────────────────────────────────────────────────────────────────"
echo "CRON JOB #2: Birthday Email Automation"
echo "─────────────────────────────────────────────────────────────────"
echo "Schedule: Daily at 5:00 AM (0 5 * * *)"
echo ""
echo "Command:"
echo "curl -X GET \"https://${DOMAIN}/api/emails/birthday/auto\" -H \"Authorization: Bearer ${CRON_SECRET}\""
echo ""

echo "─────────────────────────────────────────────────────────────────"
echo "CRON JOB #3: Sync Public Holidays"
echo "─────────────────────────────────────────────────────────────────"
echo "Schedule: Monthly on 1st at midnight (0 0 1 * *)"
echo ""
echo "Command:"
echo "curl -X GET \"https://${DOMAIN}/api/cron/sync-holidays\" -H \"Authorization: Bearer ${CRON_SECRET}\""
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "📝 SETUP INSTRUCTIONS:"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "1. Log in to Hostinger hPanel"
echo "2. Go to Advanced → Cron Jobs"
echo "3. Click 'Create Cron Job' or 'Add New Cron Job'"
echo "4. For each job above:"
echo "   - Set the schedule as shown"
echo "   - Copy and paste the command"
echo "   - Save the cron job"
echo "5. Enable email notifications (optional but recommended)"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "🧪 TESTING:"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Test the endpoints manually:"
echo ""
echo "# Test cleanup endpoint"
echo "curl -X GET \"https://${DOMAIN}/api/cron/cleanup-expired-covers\" -H \"Authorization: Bearer ${CRON_SECRET}\""
echo ""
echo "# Test birthday email endpoint"
echo "curl -X GET \"https://${DOMAIN}/api/emails/birthday/auto\" -H \"Authorization: Bearer ${CRON_SECRET}\""
echo ""
echo "# Test holiday sync endpoint"
echo "curl -X GET \"https://${DOMAIN}/api/cron/sync-holidays\" -H \"Authorization: Bearer ${CRON_SECRET}\""
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "✅ Setup complete! Monitor the cron jobs in Hostinger hPanel."
echo "════════════════════════════════════════════════════════════════"
echo ""

# Save to file
OUTPUT_FILE="hostinger-cron-commands.txt"
cat > "$OUTPUT_FILE" << EOF
EMS Hostinger Cron Job Commands
Generated: $(date)
Domain: ${DOMAIN}
CRON_SECRET: ${CRON_SECRET}

═══════════════════════════════════════════════════════════════

CRON JOB #1: Cleanup Expired Cover Requests
Schedule: 0 * * * * (Every hour)
Command:
curl -X GET "https://${DOMAIN}/api/cron/cleanup-expired-covers" -H "Authorization: Bearer ${CRON_SECRET}"

═══════════════════════════════════════════════════════════════

CRON JOB #2: Birthday Email Automation
Schedule: 0 5 * * * (Daily at 5:00 AM)
Command:
curl -X GET "https://${DOMAIN}/api/emails/birthday/auto" -H "Authorization: Bearer ${CRON_SECRET}"

═══════════════════════════════════════════════════════════════

CRON JOB #3: Sync Public Holidays
Schedule: 0 0 1 * * (Monthly on 1st at midnight)
Command:
curl -X GET "https://${DOMAIN}/api/cron/sync-holidays" -H "Authorization: Bearer ${CRON_SECRET}"

═══════════════════════════════════════════════════════════════

ENVIRONMENT VARIABLE TO ADD IN HOSTINGER:
Name: CRON_SECRET
Value: ${CRON_SECRET}

═══════════════════════════════════════════════════════════════
EOF

echo "💾 Commands also saved to: $OUTPUT_FILE"
echo ""

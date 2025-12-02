#!/bin/bash

# Hikvision Biometric Integration Setup Script
# This script helps configure the Hikvision fingerprint reader integration

set -e

echo "========================================="
echo "Hikvision Biometric Integration Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}Created .env file. Please update it with your configuration.${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js and npm are installed${NC}"

# Check Prisma
if ! command_exists prisma; then
    echo -e "${YELLOW}Prisma CLI not found globally. Using npx...${NC}"
fi

# Get Hikvision device details from user
echo ""
echo "========================================="
echo "Device Configuration"
echo "========================================="
echo ""
echo "Please enter your Hikvision device details:"
echo ""

read -p "Device IP Address (e.g., 192.168.1.64): " DEVICE_IP
read -p "Device Port (default: 80): " DEVICE_PORT
DEVICE_PORT=${DEVICE_PORT:-80}
read -p "Device Username (default: admin): " DEVICE_USER
DEVICE_USER=${DEVICE_USER:-admin}
read -sp "Device Password: " DEVICE_PASS
echo ""

# Update .env file
echo ""
echo "Updating .env file..."

# Check if Hikvision config already exists in .env
if grep -q "HIKVISION_HOST" .env; then
    echo -e "${YELLOW}Hikvision configuration already exists in .env${NC}"
    read -p "Do you want to update it? (y/n): " UPDATE_ENV
    if [ "$UPDATE_ENV" = "y" ] || [ "$UPDATE_ENV" = "Y" ]; then
        # Update existing values
        sed -i.bak "s|HIKVISION_HOST=.*|HIKVISION_HOST=$DEVICE_IP|" .env
        sed -i.bak "s|HIKVISION_PORT=.*|HIKVISION_PORT=$DEVICE_PORT|" .env
        sed -i.bak "s|HIKVISION_USERNAME=.*|HIKVISION_USERNAME=$DEVICE_USER|" .env
        sed -i.bak "s|HIKVISION_PASSWORD=.*|HIKVISION_PASSWORD=$DEVICE_PASS|" .env
        rm .env.bak 2>/dev/null || true
        echo -e "${GREEN}✓ .env updated${NC}"
    fi
else
    # Add new values
    cat >> .env <<EOF

# Hikvision Biometric Device Configuration
HIKVISION_HOST=$DEVICE_IP
HIKVISION_PORT=$DEVICE_PORT
HIKVISION_USERNAME=$DEVICE_USER
HIKVISION_PASSWORD=$DEVICE_PASS
HIKVISION_PROTOCOL=http
EOF
    echo -e "${GREEN}✓ Hikvision configuration added to .env${NC}"
fi

# Test device connection
echo ""
echo "Testing device connection..."

CURL_CMD="curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 -u $DEVICE_USER:$DEVICE_PASS http://$DEVICE_IP:$DEVICE_PORT/ISAPI/System/deviceInfo"
HTTP_CODE=$(eval $CURL_CMD)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Successfully connected to Hikvision device!${NC}"
else
    echo -e "${RED}✗ Failed to connect to device (HTTP $HTTP_CODE)${NC}"
    echo "Please check:"
    echo "  - Device IP address and port"
    echo "  - Username and password"
    echo "  - Network connectivity"
    echo "  - Device is powered on"
    exit 1
fi

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
npx prisma generate
echo -e "${GREEN}✓ Prisma client generated${NC}"

# Ask about database migration
echo ""
read -p "Do you want to run database migration now? (y/n): " RUN_MIGRATION

if [ "$RUN_MIGRATION" = "y" ] || [ "$RUN_MIGRATION" = "Y" ]; then
    echo "Running database migration..."
    npx prisma migrate dev --name add_biometric_integration
    echo -e "${GREEN}✓ Database migration completed${NC}"
else
    echo -e "${YELLOW}Skipping migration. Run 'npx prisma migrate dev' manually later.${NC}"
fi

# Summary
echo ""
echo "========================================="
echo "Setup Summary"
echo "========================================="
echo ""
echo -e "${GREEN}✓ Device connection verified${NC}"
echo -e "${GREEN}✓ Environment variables configured${NC}"
echo -e "${GREEN}✓ Prisma client generated${NC}"
echo ""
echo "Next steps:"
echo "1. Register device in the system (use API or admin panel)"
echo "2. Map employees to device employee numbers"
echo "3. Test attendance sync"
echo ""
echo "For detailed instructions, see HIKVISION_SETUP.md"
echo ""
echo -e "${GREEN}Setup completed successfully!${NC}"

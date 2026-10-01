#!/bin/bash
# Script untuk setup cron job check invoice due date
# Usage: ./scripts/setup-invoice-cron.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Get APP_URL from .env or use default
if [ -f "$PROJECT_DIR/.env" ]; then
    APP_URL=$(grep -E "^APP_URL=" "$PROJECT_DIR/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "http://localhost:3000")
else
    APP_URL="http://localhost:3000"
fi

# Default to localhost if APP_URL is empty
if [ -z "$APP_URL" ]; then
    APP_URL="http://localhost:3000"
fi

CRON_JOB="0 1 * * * curl -X GET \"$APP_URL/api/cron/check-due\" >> $PROJECT_DIR/logs/invoice-cron.log 2>&1"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Setup Invoice Check Cron Job"
echo "=========================================="
echo ""
echo "APP_URL: $APP_URL"
echo "Endpoint: $APP_URL/api/cron/check-due"
echo ""

# Create logs directory if not exists
mkdir -p "$PROJECT_DIR/logs"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "api/cron/check-due"; then
    echo -e "${YELLOW}⚠ Cron job already exists${NC}"
    echo ""
    echo "Current cron jobs:"
    crontab -l 2>/dev/null | grep "api/cron/check-due" || echo "None found"
    echo ""
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove existing cron job
    crontab -l 2>/dev/null | grep -v "api/cron/check-due" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo -e "${GREEN}✓ Cron job added successfully${NC}"
echo ""
echo "Cron job details:"
echo "  Schedule: Every day at 01:00 AM GMT+7 (WIB)"
echo "  Endpoint: $APP_URL/api/cron/check-due"
echo "  Log file: $PROJECT_DIR/logs/invoice-cron.log"
echo ""
echo "Current crontab:"
crontab -l | grep "api/cron/check-due"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "To test cron job manually:"
echo "  curl -X GET \"$APP_URL/api/cron/check-due\""
echo ""
echo "To view cron logs:"
echo "  tail -f $PROJECT_DIR/logs/invoice-cron.log"
echo ""
echo "To remove cron job:"
echo "  crontab -e"
echo "  (then delete the line with api/cron/check-due)"



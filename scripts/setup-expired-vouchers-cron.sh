#!/bin/bash
# Script untuk setup cron job check expired vouchers
# Usage: ./scripts/setup-expired-vouchers-cron.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Get APP_URL from .env or use default
if [ -f "$PROJECT_DIR/.env" ]; then
    APP_URL=$(grep -E "^NEXT_PUBLIC_APP_URL=|^APP_URL=" "$PROJECT_DIR/.env" | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
fi

# Default to production URL if not found
if [ -z "$APP_URL" ]; then
    APP_URL="https://sulut.fibergo.id"
fi

# Get CRON_SECRET from .env
CRON_SECRET=$(grep -E "^CRON_SECRET=" "$PROJECT_DIR/.env" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "change-this-in-production")

CRON_URL="${APP_URL}/api/cron/check-expired-vouchers"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Setup Expired Vouchers Cron Job"
echo "=========================================="
echo ""
echo "APP_URL: $APP_URL"
echo "Endpoint: $CRON_URL"
echo "Schedule: Setiap menit (* * * * *)"
echo ""

# Create logs directory if not exists
mkdir -p "$PROJECT_DIR/logs"

# Create cron job entry (setiap menit)
# Note: Cron uses server timezone, ensure server timezone is set to Asia/Jakarta
CRON_ENTRY="* * * * * curl -X GET -H \"Authorization: Bearer ${CRON_SECRET}\" \"$CRON_URL\" >> $PROJECT_DIR/logs/expired-vouchers-cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "check-expired-vouchers"; then
    echo -e "${YELLOW}⚠ Cron job untuk expired vouchers sudah ada${NC}"
    echo ""
    echo "Current cron jobs:"
    crontab -l 2>/dev/null | grep "check-expired-vouchers" || echo "None found"
    echo ""
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove existing cron job
    crontab -l 2>/dev/null | grep -v "check-expired-vouchers" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo -e "${GREEN}✓ Cron job berhasil ditambahkan${NC}"
echo ""
echo "Cron job details:"
echo "  Schedule: Setiap menit (* * * * *)"
echo "  Endpoint: $CRON_URL"
echo "  Log file: $PROJECT_DIR/logs/expired-vouchers-cron.log"
echo ""
echo "Current crontab:"
crontab -l | grep "check-expired-vouchers"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Note: Pastikan CRON_SECRET di .env sudah di-set dengan benar untuk security."






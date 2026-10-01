#!/bin/bash
# Script untuk setup cron job payment reminder
# Cron job berjalan setiap hari jam 6:00 pagi GMT+7 (WIB)
# Rate limiting: 20 detik antar pengiriman untuk menghindari WhatsApp ban

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

CRON_URL="${APP_URL}/api/cron/payment-reminder"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Setup Payment Reminder Cron Job"
echo "=========================================="
echo ""
echo "APP_URL: $APP_URL"
echo "Endpoint: $CRON_URL"
echo "Schedule: Setiap hari jam 06:00 WIB (GMT+7)"
echo "Rate Limiting: 20 detik antar pengiriman"
echo ""

# Create logs directory if not exists
mkdir -p "$PROJECT_DIR/logs"

# Create cron job entry (6 AM GMT+7 = 6 AM WIB)
# Note: Cron uses server timezone, ensure server timezone is set to Asia/Jakarta
CRON_ENTRY="0 6 * * * curl -X GET \"$CRON_URL\" >> $PROJECT_DIR/logs/payment-reminder-cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "payment-reminder"; then
    echo -e "${YELLOW}⚠ Cron job untuk payment reminder sudah ada${NC}"
    echo ""
    echo "Current cron jobs:"
    crontab -l 2>/dev/null | grep "payment-reminder" || echo "None found"
    echo ""
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove existing cron job
    crontab -l 2>/dev/null | grep -v "payment-reminder" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo -e "${GREEN}✓ Cron job berhasil ditambahkan${NC}"
echo ""
echo "Cron job details:"
echo "  Schedule: Setiap hari jam 06:00 WIB (GMT+7)"
echo "  Endpoint: $CRON_URL"
echo "  Log file: $PROJECT_DIR/logs/payment-reminder-cron.log"
echo ""
echo "Current crontab:"
crontab -l | grep "payment-reminder"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "To test manually:"
echo "  curl -X GET \"$CRON_URL\""
echo ""
echo "To view cron logs:"
echo "  tail -f $PROJECT_DIR/logs/payment-reminder-cron.log"
echo ""
echo "Note: Pastikan server timezone di-set ke Asia/Jakarta (GMT+7)"
echo "      Check dengan: timedatectl (Linux) atau date (macOS)"



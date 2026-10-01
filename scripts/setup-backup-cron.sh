#!/bin/bash
# Script untuk setup cron job backup database
# Usage: ./scripts/setup-backup-cron.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup-database.sh"
CRON_JOB="0 1 * * * cd $PROJECT_DIR && $BACKUP_SCRIPT >> $PROJECT_DIR/backups/postgres/cron.log 2>&1"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Setup Database Backup Cron Job"
echo "=========================================="
echo ""

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}ERROR: Backup script not found at $BACKUP_SCRIPT${NC}"
    exit 1
fi

# Make sure script is executable
chmod +x "$BACKUP_SCRIPT"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-database.sh"; then
    echo -e "${YELLOW}⚠ Cron job already exists${NC}"
    echo ""
    echo "Current cron jobs:"
    crontab -l 2>/dev/null | grep "backup-database.sh" || echo "None found"
    echo ""
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove existing cron job
    crontab -l 2>/dev/null | grep -v "backup-database.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo -e "${GREEN}✓ Cron job added successfully${NC}"
echo ""
echo "Cron job details:"
echo "  Schedule: Every day at 01:00 AM GMT+7 (WIB)"
echo "  Command: $BACKUP_SCRIPT"
echo "  Log file: $PROJECT_DIR/backups/postgres/cron.log"
echo ""
echo "Current crontab:"
crontab -l | grep "backup-database.sh"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "To test backup manually:"
echo "  $BACKUP_SCRIPT"
echo ""
echo "To view cron logs:"
echo "  tail -f $PROJECT_DIR/backups/postgres/cron.log"
echo ""
echo "To remove cron job:"
echo "  crontab -e"
echo "  (then delete the line with backup-database.sh)"



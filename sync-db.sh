#!/bin/bash
# Script untuk sync database ke remote server
# Usage: ./sync-db.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Load config
if [ -f .deploy-config ]; then
    source .deploy-config
else
    echo -e "${RED}Error: .deploy-config tidak ditemukan!${NC}"
    exit 1
fi

# Set defaults
DB_BACKUP_DIR=${DB_BACKUP_DIR:-db}
DB_BACKUP_FILE=${DB_BACKUP_FILE:-isp_app_backup.dump}
REMOTE_HOST=${REMOTE_HOST:-sulut.fibergo.id}
REMOTE_USER=${REMOTE_USER:-gastra}
REMOTE_PATH=${REMOTE_PATH:-/home/gastra/projects/isp-app}

BACKUP_PATH="$DB_BACKUP_DIR/$DB_BACKUP_FILE"

echo "=========================================="
echo "  Sync Database ke Remote"
echo "=========================================="
echo ""

# Check if backup file exists
if [ ! -f "$BACKUP_PATH" ]; then
    echo -e "${RED}Error: File backup $BACKUP_PATH tidak ditemukan!${NC}"
    echo "Jalankan ./backup-db.sh terlebih dahulu."
    exit 1
fi

echo -e "${GREEN}✓${NC} File backup ditemukan: $BACKUP_PATH ($(ls -lh "$BACKUP_PATH" | awk '{print $5}'))"
echo ""

# Step 1: Transfer backup to remote
echo "Step 1: Transferring backup to remote server..."
rsync -avz -e "ssh -p ${SSH_PORT:-22}" "$BACKUP_PATH" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/$DB_BACKUP_DIR/"
echo -e "${GREEN}✓${NC} Backup file sudah di-transfer"
echo ""

# Step 2: Restore database on remote
echo "Step 2: Restoring database on remote server..."
ssh -p ${SSH_PORT:-22} "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && ./restore-db-only.sh"
echo -e "${GREEN}✓${NC} Database sudah di-restore di remote server"
echo ""

echo "=========================================="
echo -e "${GREEN}  Database Sync Selesai!${NC}"
echo "=========================================="



#!/bin/bash
# Script khusus untuk sync database dari remote ke local
# Usage: ./scripts/sync-remote-db-to-local.sh

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

REMOTE_HOST=${REMOTE_HOST:-sulut.fibergo.id}
REMOTE_USER=${REMOTE_USER:-gastra}
REMOTE_PATH=${REMOTE_PATH:-/home/gastra/projects/isp-app}
DB_BACKUP_FILE=${DB_BACKUP_FILE:-isp_app_backup.dump}
SSH_PORT=${SSH_PORT:-22}

echo "=========================================="
echo "  Sync Database dari Remote ke Local"
echo "=========================================="
echo ""

# Step 1: Create backup on remote
echo "Step 1: Creating database backup on remote server..."
ssh -p $SSH_PORT "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && docker exec isp-postgres pg_dump -U postgres -d isp_app -F c > /tmp/$DB_BACKUP_FILE && docker cp isp-postgres:/tmp/$DB_BACKUP_FILE db/$DB_BACKUP_FILE && docker exec isp-postgres rm -f /tmp/$DB_BACKUP_FILE"
echo -e "${GREEN}✓${NC} Backup dibuat di remote"
echo ""

# Step 2: Transfer backup to local
echo "Step 2: Transferring backup to local..."
mkdir -p db
rsync -avz -e "ssh -p $SSH_PORT" \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/db/$DB_BACKUP_FILE" \
    ./db/
echo -e "${GREEN}✓${NC} Backup sudah di-transfer ke local"
echo ""

# Step 3: Restore locally
read -p "Restore database ke local sekarang? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Step 3: Restoring database locally..."
    ./restore-db-only.sh
    echo -e "${GREEN}✓${NC} Database sudah di-restore di local"
else
    echo ""
    echo -e "${YELLOW}⚠${NC} Database backup sudah ada di db/$DB_BACKUP_FILE"
    echo "   Jalankan ./restore-db-only.sh untuk restore manual"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Sync Database Selesai!${NC}"
echo "=========================================="


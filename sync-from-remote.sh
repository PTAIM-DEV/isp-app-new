#!/bin/bash
# Script untuk sync code dan database dari remote server ke local
# Usage: ./sync-from-remote.sh [--code-only] [--db-only]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
SYNC_CODE=true
SYNC_DB=true

for arg in "$@"; do
    case $arg in
        --code-only)
            SYNC_DB=false
            shift
            ;;
        --db-only)
            SYNC_CODE=false
            shift
            ;;
        *)
            ;;
    esac
done

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
SSH_PORT=${SSH_PORT:-22}

echo "=========================================="
echo "  Sync dari Remote ke Local"
echo "=========================================="
echo ""
echo "Remote: $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"
echo ""

# Step 1: Sync code (if enabled)
if [ "$SYNC_CODE" = true ]; then
    echo "Step 1: Syncing code from remote..."
    echo ""
    
    # Create rsync exclude file if not exists
    if [ ! -f rsync-exclude.txt ]; then
        echo -e "${YELLOW}⚠${NC} rsync-exclude.txt tidak ditemukan, menggunakan default excludes"
        EXCLUDE_FILE=""
    else
        EXCLUDE_FILE="--exclude-from=rsync-exclude.txt"
    fi
    
    # Sync from remote to local (reverse direction)
    rsync -avz --delete \
        -e "ssh -p $SSH_PORT" \
        $EXCLUDE_FILE \
        "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/" \
        ./
    
    echo -e "${GREEN}✓${NC} Code sudah di-sync dari remote"
    echo ""
fi

# Step 2: Sync database (if enabled)
if [ "$SYNC_DB" = true ]; then
    echo "Step 2: Syncing database from remote..."
    echo ""
    
    # Create db directory if not exists
    mkdir -p db
    
    # Backup database di remote dulu
    echo "Creating database backup on remote server..."
    ssh -p $SSH_PORT "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && ./backup-db.sh" || {
        echo -e "${YELLOW}⚠${NC} Backup script tidak ditemukan di remote, menggunakan pg_dump langsung..."
        ssh -p $SSH_PORT "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && docker exec isp-postgres pg_dump -U postgres -d isp_app -F c > db/isp_app_backup.dump"
    }
    
    # Transfer backup file dari remote ke local
    echo "Transferring database backup from remote..."
    rsync -avz -e "ssh -p $SSH_PORT" \
        "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/db/isp_app_backup.dump" \
        ./db/
    
    echo -e "${GREEN}✓${NC} Database backup sudah di-transfer"
    echo ""
    
    # Restore database lokal (optional - tanya dulu)
    read -p "Restore database ke local? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Restoring database locally..."
        ./restore-db-only.sh
        echo -e "${GREEN}✓${NC} Database sudah di-restore di local"
    else
        echo -e "${YELLOW}⚠${NC} Database backup sudah ada di db/isp_app_backup.dump"
        echo "   Jalankan ./restore-db-only.sh untuk restore manual"
    fi
    echo ""
fi

echo "=========================================="
echo -e "${GREEN}  Sync dari Remote Selesai!${NC}"
echo "=========================================="
echo ""


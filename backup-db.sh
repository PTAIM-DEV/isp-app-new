#!/bin/bash
# Script untuk backup database lokal
# Usage: ./backup-db.sh

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
DB_NAME=${DB_NAME:-isp_app}
DB_USER=${DB_USER:-postgres}

# Create backup directory
mkdir -p "$DB_BACKUP_DIR"

# Backup file path
BACKUP_PATH="$DB_BACKUP_DIR/$DB_BACKUP_FILE"

echo "=========================================="
echo "  Backup Database"
echo "=========================================="
echo ""

# Check if PostgreSQL container is running
if ! docker compose ps postgres | grep -q "Up"; then
    echo -e "${YELLOW}⚠${NC} PostgreSQL container tidak berjalan. Starting..."
    docker compose up -d postgres
    echo "   Menunggu PostgreSQL ready..."
    for i in {1..30}; do
        if docker exec isp-postgres pg_isready -U "$DB_USER" > /dev/null 2>&1; then
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}✗${NC} PostgreSQL tidak ready setelah 30 detik"
            exit 1
        fi
        sleep 1
    done
fi

echo "Step 1: Creating database backup..."
docker exec isp-postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -f /tmp/"$DB_BACKUP_FILE"

echo "Step 2: Copying backup from container..."
docker cp isp-postgres:/tmp/"$DB_BACKUP_FILE" "$BACKUP_PATH"

echo "Step 3: Cleaning up container..."
docker exec isp-postgres rm -f /tmp/"$DB_BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_PATH" ]; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_PATH" | awk '{print $5}')
    echo -e "${GREEN}✓${NC} Backup berhasil: $BACKUP_PATH ($BACKUP_SIZE)"
    echo ""
    echo "Backup selesai!"
else
    echo -e "${RED}✗${NC} Backup gagal!"
    exit 1
fi



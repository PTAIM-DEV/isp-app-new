#!/bin/bash
# Script untuk restore database saja dari backup
# Usage: ./restore-db-only.sh

set -e  # Exit on error

echo "=========================================="
echo "  Restore Database dari Backup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file exists
BACKUP_FILE="db/isp_app_backup.dump"
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: File backup $BACKUP_FILE tidak ditemukan!${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} File backup ditemukan: $BACKUP_FILE ($(ls -lh $BACKUP_FILE | awk '{print $5}'))"
echo ""

# Step 1: Check if PostgreSQL is running
echo "Step 1: Checking PostgreSQL container..."
if ! docker compose ps postgres | grep -q "Up"; then
    echo -e "${YELLOW}⚠${NC} PostgreSQL container tidak berjalan. Starting..."
    docker compose up -d postgres
    echo "   Menunggu PostgreSQL ready..."
    for i in {1..30}; do
        if docker exec isp-postgres pg_isready -U postgres > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} PostgreSQL sudah ready"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}✗${NC} PostgreSQL tidak ready setelah 30 detik"
            exit 1
        fi
        sleep 1
        echo -n "."
    done
    echo ""
else
    echo -e "${GREEN}✓${NC} PostgreSQL container sudah berjalan"
fi
echo ""

# Step 2: Verify PostgreSQL connection
echo "Step 2: Verifying PostgreSQL connection..."
docker exec isp-postgres psql -U postgres -d postgres -c "SELECT version();" > /dev/null
echo -e "${GREEN}✓${NC} Koneksi PostgreSQL berhasil"
echo ""

# Step 3: Copy backup file to container
echo "Step 3: Copying backup file to container..."
docker cp "$BACKUP_FILE" isp-postgres:/tmp/isp_app_backup.dump
echo -e "${GREEN}✓${NC} File backup sudah di-copy ke container"
echo ""

# Step 4: Create database if not exists
echo "Step 4: Creating database isp_app (jika belum ada)..."
docker exec isp-postgres psql -U postgres -c "CREATE DATABASE isp_app;" 2>/dev/null && echo -e "${GREEN}✓${NC} Database isp_app dibuat" || echo -e "${YELLOW}⚠${NC} Database mungkin sudah ada"
echo ""

# Step 5: Restore database
echo "Step 5: Restoring database from backup..."
echo "   Ini mungkin memakan waktu beberapa saat..."
if docker exec isp-postgres pg_restore -U postgres -d isp_app -c --no-owner --no-privileges -v /tmp/isp_app_backup.dump 2>&1 | tee /tmp/restore.log | tail -20; then
    echo -e "${GREEN}✓${NC} Restore database berhasil"
else
    RESTORE_EXIT_CODE=$?
    if grep -q "WARNING: errors ignored on restore" /tmp/restore.log || [ $RESTORE_EXIT_CODE -eq 1 ]; then
        echo -e "${YELLOW}⚠${NC} Ada beberapa warning, tapi restore mungkin berhasil"
        echo "   Cek log di /tmp/restore.log untuk detail"
    else
        echo -e "${RED}✗${NC} Restore database gagal!"
        exit 1
    fi
fi
echo ""

# Step 6: Verify restore
echo "Step 6: Verifying restore..."
echo "   Checking tables..."
TABLE_COUNT=$(docker exec isp-postgres psql -U postgres -d isp_app -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
echo -e "${GREEN}✓${NC} Jumlah tabel: $TABLE_COUNT"

echo "   Checking data..."
USER_COUNT=$(docker exec isp-postgres psql -U postgres -d isp_app -t -c 'SELECT COUNT(*) FROM "User";' 2>/dev/null | tr -d ' ' || echo "0")
echo -e "${GREEN}✓${NC} Jumlah user: $USER_COUNT"

PACKAGE_COUNT=$(docker exec isp-postgres psql -U postgres -d isp_app -t -c 'SELECT COUNT(*) FROM "ServicePackage";' 2>/dev/null | tr -d ' ' || echo "0")
echo -e "${GREEN}✓${NC} Jumlah package: $PACKAGE_COUNT"

PAYMENT_FLOW_COUNT=$(docker exec isp-postgres psql -U postgres -d isp_app -t -c 'SELECT COUNT(*) FROM "PaymentFlow";' 2>/dev/null | tr -d ' ' || echo "0")
echo -e "${GREEN}✓${NC} Jumlah payment flow: $PAYMENT_FLOW_COUNT"
echo ""

echo "=========================================="
echo -e "${GREEN}  Restore Database Selesai!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Database: isp_app"
echo "  - Tables: $TABLE_COUNT"
echo "  - Users: $USER_COUNT"
echo "  - Packages: $PACKAGE_COUNT"
echo "  - Payment Flows: $PAYMENT_FLOW_COUNT"
echo ""
echo "Database sudah di-restore dari backup."


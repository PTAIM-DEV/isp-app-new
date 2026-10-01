#!/bin/bash
# Script untuk restore database dari backup
# Usage: ./restore-db.sh

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
BACKUP_FILE="isp_app_backup.dump"
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: File backup $BACKUP_FILE tidak ditemukan!${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} File backup ditemukan: $BACKUP_FILE ($(ls -lh $BACKUP_FILE | awk '{print $5}'))"
echo ""

# Step 1: Update .env file
echo "Step 1: Update .env file..."
cat > .env << 'ENVEOF'
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/isp_app?schema=public"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=isp_app
POSTGRES_PORT=5432

# Application Port
APP_PORT=3000
NODE_ENV=production

# Xendit Payment Gateway
XENDIT_SECRET_KEY=xnd_production_DgHUO7h4a8sqiJSdHt8YL7sSfSR3frSB8pSaH4TSvJq4cpovtQJvuxHeEa6OWlaX

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
ENVEOF
echo -e "${GREEN}✓${NC} .env file sudah di-update"
echo ""

# Step 2: Stop PostgreSQL
echo "Step 2: Stopping PostgreSQL container..."
docker compose down postgres 2>/dev/null || echo "Container sudah tidak berjalan"
echo -e "${GREEN}✓${NC} PostgreSQL container sudah di-stop"
echo ""

# Step 3: Remove old volume
echo "Step 3: Removing old PostgreSQL volume..."
docker volume rm isp-app_postgres_data 2>/dev/null && echo -e "${GREEN}✓${NC} Volume lama sudah dihapus" || echo -e "${YELLOW}⚠${NC} Volume sudah tidak ada atau tidak bisa dihapus"
echo ""

# Step 4: Start PostgreSQL
echo "Step 4: Starting PostgreSQL dengan konfigurasi baru..."
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
echo ""

# Step 5: Verify PostgreSQL
echo "Step 5: Verifying PostgreSQL connection..."
docker exec isp-postgres psql -U postgres -d postgres -c "SELECT version();" > /dev/null
echo -e "${GREEN}✓${NC} Koneksi PostgreSQL berhasil"
echo ""

# Step 6: Copy backup file to container
echo "Step 6: Copying backup file to container..."
docker cp "$BACKUP_FILE" isp-postgres:/tmp/isp_app_backup.dump
echo -e "${GREEN}✓${NC} File backup sudah di-copy ke container"
echo ""

# Step 7: Create database if not exists
echo "Step 7: Creating database isp_app..."
docker exec isp-postgres psql -U postgres -c "CREATE DATABASE isp_app;" 2>/dev/null && echo -e "${GREEN}✓${NC} Database isp_app dibuat" || echo -e "${YELLOW}⚠${NC} Database mungkin sudah ada"
echo ""

# Step 8: Restore database
echo "Step 8: Restoring database from backup..."
echo "   Ini mungkin memakan waktu beberapa saat..."
if docker exec isp-postgres pg_restore -U postgres -d isp_app -c --no-owner --no-privileges -v /tmp/isp_app_backup.dump 2>&1 | tee /tmp/restore.log; then
    echo -e "${GREEN}✓${NC} Restore database berhasil"
else
    echo -e "${YELLOW}⚠${NC} Ada beberapa warning, tapi restore mungkin berhasil"
    echo "   Cek log di /tmp/restore.log untuk detail"
fi
echo ""

# Step 9: Verify restore
echo "Step 9: Verifying restore..."
echo "   Checking tables..."
TABLE_COUNT=$(docker exec isp-postgres psql -U postgres -d isp_app -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
echo -e "${GREEN}✓${NC} Jumlah tabel: $TABLE_COUNT"

echo "   Checking data..."
USER_COUNT=$(docker exec isp-postgres psql -U postgres -d isp_app -t -c 'SELECT COUNT(*) FROM "User";' 2>/dev/null | tr -d ' ' || echo "0")
echo -e "${GREEN}✓${NC} Jumlah user: $USER_COUNT"

PACKAGE_COUNT=$(docker exec isp-postgres psql -U postgres -d isp_app -t -c 'SELECT COUNT(*) FROM "ServicePackage";' 2>/dev/null | tr -d ' ' || echo "0")
echo -e "${GREEN}✓${NC} Jumlah package: $PACKAGE_COUNT"
echo ""

# Step 10: Run Prisma migrations
echo "Step 10: Running Prisma migrations..."
if docker compose exec -T app npx prisma migrate deploy 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Prisma migrations berhasil"
else
    echo -e "${YELLOW}⚠${NC} Prisma migrations mungkin sudah up-to-date atau app container belum running"
fi
echo ""

# Step 11: Restart application
echo "Step 11: Restarting application..."
docker compose restart app 2>/dev/null || docker compose up -d app
echo -e "${GREEN}✓${NC} Aplikasi sudah di-restart"
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
echo ""
echo "Silakan test aplikasi di browser untuk memastikan semuanya berjalan dengan baik."


#!/bin/bash
# Script untuk verifikasi status migrasi Prisma
# Usage: ./scripts/verify-migrations.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Verifikasi Status Migrasi Prisma"
echo "=========================================="
echo ""

# Load DATABASE_URL
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env tidak ditemukan!${NC}"
    exit 1
fi

export $(cat .env | grep DATABASE_URL | xargs) 2>/dev/null || true

# Step 1: Check migration status
echo "Step 1: Checking migration status..."
MIGRATE_STATUS=$(npx prisma migrate status 2>&1)
echo "$MIGRATE_STATUS"
echo ""

# Step 2: Check if there are pending migrations
if echo "$MIGRATE_STATUS" | grep -q "following migration\|not yet been applied\|Database schema is out of date"; then
    echo -e "${YELLOW}⚠${NC} Ada migration yang belum di-apply!"
    echo ""
    read -p "Jalankan migrasi sekarang? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Menjalankan migrasi..."
        npx prisma migrate deploy
        echo -e "${GREEN}✓${NC} Migrasi selesai"
    fi
elif echo "$MIGRATE_STATUS" | grep -q "Database schema is up to date"; then
    echo -e "${GREEN}✓${NC} Semua migrasi sudah up-to-date"
else
    echo -e "${YELLOW}⚠${NC} Status tidak jelas, cek manual:"
    echo "   npx prisma migrate status"
fi
echo ""

# Step 3: Check migration files
echo "Step 2: Checking migration files..."
MIGRATION_COUNT=$(ls -1 prisma/migrations/*/migration.sql 2>/dev/null | wc -l)
echo "   Total migration files: $MIGRATION_COUNT"
echo ""

# Step 4: Check if schema matches database
echo "Step 3: Checking schema sync..."
SCHEMA_DIFF=$(npx prisma migrate diff \
    --from-schema-datamodel prisma/schema.prisma \
    --to-schema-datasource prisma/schema.prisma \
    --script 2>&1 || echo "Schema matches database")

if [ -z "$SCHEMA_DIFF" ] || echo "$SCHEMA_DIFF" | grep -q "No difference detected\|No schema changes"; then
    echo -e "${GREEN}✓${NC} Schema sudah sync dengan database"
else
    echo -e "${YELLOW}⚠${NC} Ada perbedaan antara schema dan database:"
    echo "$SCHEMA_DIFF" | head -20
    echo ""
    echo "Jika perlu, jalankan: npx prisma migrate deploy"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}  Verifikasi Selesai!${NC}"
echo "=========================================="





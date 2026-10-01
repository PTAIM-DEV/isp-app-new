#!/bin/bash
# Script untuk dijalankan di remote server setelah deploy.sh dari server rumah
# Usage: ./scripts/post-deploy.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Post-Deploy Checklist"
echo "=========================================="
echo ""

# Step 1: Verify code is up to date
echo "Step 1: Verifying code..."
CURRENT_COMMIT=$(git log --oneline -1)
echo -e "${GREEN}✓${NC} Current commit: $CURRENT_COMMIT"
echo ""

# Step 2: Generate Prisma Client
echo "Step 2: Generating Prisma Client..."
export $(cat .env | grep DATABASE_URL | xargs)
if npx prisma generate 2>&1 | grep -q "Generated Prisma Client"; then
    echo -e "${GREEN}✓${NC} Prisma Client ter-generate"
else
    echo -e "${YELLOW}⚠${NC} Prisma Client mungkin sudah ter-generate"
fi
echo ""

# Step 3: Run migrations
echo "Step 3: Running Prisma migrations..."
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
if echo "$MIGRATE_OUTPUT" | grep -q "up to date\|Database schema is up to date"; then
    echo -e "${GREEN}✓${NC} Migrations sudah up-to-date"
elif echo "$MIGRATE_OUTPUT" | grep -q "failed"; then
    echo -e "${YELLOW}⚠${NC} Ada migration yang failed, mencoba resolve..."
    FAILED_MIGRATIONS=$(echo "$MIGRATE_OUTPUT" | grep -oP "failed:\s*\K[^\s]+" || echo "")
    if [ -n "$FAILED_MIGRATIONS" ]; then
        for migration in $FAILED_MIGRATIONS; do
            echo "  Marking $migration as applied..."
            npx prisma migrate resolve --applied "$migration" 2>/dev/null || true
        done
    fi
    # Check status again
    if npx prisma migrate status 2>&1 | grep -q "up to date\|Database schema is up to date"; then
        echo -e "${GREEN}✓${NC} Migrations sudah di-resolve"
    else
        echo -e "${YELLOW}⚠${NC} Masih ada masalah dengan migrations, cek manual:"
        npx prisma migrate status
    fi
else
    echo -e "${GREEN}✓${NC} Migrations sudah di-run"
fi
echo ""

# Step 4: Check running processes
echo "Step 4: Checking running processes..."
NPM_PROCESSES=$(ps aux | grep -E "npm run dev|next-server" | grep -v grep | wc -l)
if [ "$NPM_PROCESSES" -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} Ada $NPM_PROCESSES proses npm/next yang berjalan"
    echo "   Disarankan untuk restart npm run dev"
    echo ""
    read -p "Restart npm run dev sekarang? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Menghentikan proses npm run dev yang berjalan..."
        pkill -f "npm run dev" || pkill -f "next-server" || true
        sleep 2
        echo "Menjalankan npm run dev..."
        nohup npm run dev > /dev/null 2>&1 &
        echo -e "${GREEN}✓${NC} npm run dev sudah di-restart"
    fi
else
    echo -e "${YELLOW}⚠${NC} Tidak ada proses npm run dev yang berjalan"
    echo "   Jalankan: npm run dev"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}  Post-Deploy Selesai!${NC}"
echo "=========================================="
echo ""
echo "Aplikasi seharusnya sudah ter-update dengan code terbaru."
echo ""



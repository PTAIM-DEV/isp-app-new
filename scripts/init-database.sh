#!/bin/bash
# Script untuk initialize database isp_app jika belum ada
# Usage: ./scripts/init-database.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Initialize Database isp_app"
echo "=========================================="
echo ""

# Check if database exists
DB_EXISTS=$(docker exec isp-postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='isp_app'" 2>&1 | tr -d ' \n' || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${GREEN}✓ Database isp_app sudah ada${NC}"
else
    echo -e "${YELLOW}⚠ Database isp_app tidak ada, membuat database...${NC}"
    docker exec isp-postgres psql -U postgres -c "CREATE DATABASE isp_app;" 2>&1
    echo -e "${GREEN}✓ Database isp_app berhasil dibuat${NC}"
fi

echo ""
echo "Running Prisma migrations..."
cd "$(dirname "$0")/.."
export $(cat .env | grep DATABASE_URL | xargs)
npx prisma migrate deploy 2>&1 | tail -10

echo ""
echo -e "${GREEN}✓ Database initialization complete!${NC}"
echo ""



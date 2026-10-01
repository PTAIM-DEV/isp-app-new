#!/bin/bash
# Script untuk restore database dari backup
# Usage: ./scripts/restore-database.sh [backup_file]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups/postgres"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Database Restore"
echo "=========================================="
echo ""

# Check if backup file provided
if [ -z "$1" ]; then
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -10 || echo "No backups found"
    echo ""
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 backups/postgres/isp_app_20251201_010000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# If relative path, make it absolute
if [[ ! "$BACKUP_FILE" = /* ]]; then
    BACKUP_FILE="$PROJECT_DIR/$BACKUP_FILE"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Check if PostgreSQL container is running
if ! docker ps | grep -q isp-postgres; then
    echo -e "${RED}ERROR: PostgreSQL container (isp-postgres) is not running${NC}"
    exit 1
fi

# Get database credentials
ENV_FILE="$PROJECT_DIR/.env"
POSTGRES_USER=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' || echo "postgres")
POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' || echo "password")
POSTGRES_DB=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' || echo "isp_app")

echo -e "${YELLOW}⚠ WARNING: This will replace the current database!${NC}"
echo ""
echo "Backup file: $BACKUP_FILE"
echo "Database: $POSTGRES_DB"
echo "User: $POSTGRES_USER"
echo ""
read -p "Are you sure you want to continue? (yes/no) " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Restoring database..."
echo ""

# Drop and recreate database (or just drop all tables)
echo "Dropping existing database objects..."
docker exec isp-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>&1 || true

# Restore from backup
echo "Restoring from backup..."
if gunzip -c "$BACKUP_FILE" | docker exec -i isp-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>&1; then
    echo -e "${GREEN}✓ Database restored successfully${NC}"
    echo ""
    echo "Running Prisma migrations to ensure schema is up to date..."
    cd "$PROJECT_DIR"
    export $(cat .env | grep DATABASE_URL | xargs)
    npx prisma migrate deploy 2>&1 | tail -5 || echo "Migration check completed"
    echo ""
    echo -e "${GREEN}Restore complete!${NC}"
else
    echo -e "${RED}✗ Restore failed${NC}"
    exit 1
fi



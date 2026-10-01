#!/bin/bash
# Script untuk backup database PostgreSQL
# Usage: ./scripts/backup-database.sh

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"  # Simpan backup selama 7 hari
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/isp_app_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Starting database backup..."
log "=========================================="

# Check if PostgreSQL container is running
if ! docker ps | grep -q isp-postgres; then
    log "${RED}ERROR: PostgreSQL container (isp-postgres) is not running${NC}"
    exit 1
fi

# Get database credentials from .env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    log "${RED}ERROR: .env file not found at $ENV_FILE${NC}"
    exit 1
fi

# Extract database credentials
POSTGRES_USER=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' || echo "postgres")
POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' || echo "password")
POSTGRES_DB=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' || echo "isp_app")

log "Database: $POSTGRES_DB"
log "User: $POSTGRES_USER"
log "Backup file: $BACKUP_FILE"

# Perform backup
log "Creating backup..."
if docker exec isp-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl 2>&1 | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "${GREEN}✓ Backup created successfully${NC}"
    log "Backup size: $BACKUP_SIZE"
    log "Backup file: $BACKUP_FILE"
else
    log "${RED}✗ Backup failed${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Cleanup old backups
log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "isp_app_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    log "Deleted $DELETED_COUNT old backup(s)"
else
    log "No old backups to delete"
fi

# Show backup summary
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "isp_app_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log "=========================================="
log "Backup Summary:"
log "  Total backups: $TOTAL_BACKUPS"
log "  Total size: $TOTAL_SIZE"
log "  Retention: $RETENTION_DAYS days"
log "=========================================="
log "Backup completed successfully!"
log ""

exit 0



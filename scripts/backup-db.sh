#!/bin/bash

# Configuration
# Load environment variables if .env exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Default values matches docker-compose.yml
CONTAINER_NAME="isp-postgres"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-isp_app}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="db_backup_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "[Backup] Starting backup for database '${DB_NAME}' from container '${CONTAINER_NAME}'..."

# Run backup
# We use -t to allocate a pseudo-TTY which might be needed, but sometimes problematic in scripts. 
# Removing -t for safer piping.
# Using -U for user and selecting the database.
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/$FILENAME"; then
  echo "[Backup] ✅ Backup successful: $BACKUP_DIR/$FILENAME"
  
  # Print file size
  FILE_SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
  echo "[Backup] Size: $FILE_SIZE"

  # Optional: Retention Policy (Keep last 7 days)
  echo "[Backup] Cleaning up backups older than 7 days..."
  find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete
  
else
  echo "[Backup] ❌ Backup failed!"
  exit 1
fi

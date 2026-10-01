#!/bin/bash

# Script untuk backup database dan volumes

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

echo "💾 ISP App Backup"
echo "================="
echo ""

# Create backup directory
mkdir -p "$BACKUP_PATH"

echo "📦 Backing up PostgreSQL database..."
docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER:-ispuser} ${POSTGRES_DB:-ispdb} > "$BACKUP_PATH/database.sql"
echo "✅ Database backup: $BACKUP_PATH/database.sql"

echo ""
echo "📁 Backing up volumes..."

# Backup postgres data
echo "  - PostgreSQL data..."
docker run --rm \
  -v isp-app_postgres_data:/data \
  -v "$(pwd)/$BACKUP_PATH":/backup \
  alpine tar czf /backup/postgres_data.tar.gz -C /data . || echo "⚠️  PostgreSQL volume backup skipped"

# Backup uploads
echo "  - Uploads data..."
docker run --rm \
  -v isp-app_uploads_data:/data \
  -v "$(pwd)/$BACKUP_PATH":/backup \
  alpine tar czf /backup/uploads_data.tar.gz -C /data . || echo "⚠️  Uploads volume backup skipped"

# Backup WhatsApp auth
echo "  - WhatsApp auth data..."
docker run --rm \
  -v isp-app_baileys_auth_data:/data \
  -v "$(pwd)/$BACKUP_PATH":/backup \
  alpine tar czf /backup/baileys_auth.tar.gz -C /data . || echo "⚠️  WhatsApp auth volume backup skipped"

echo ""
echo "✅ Backup completed!"
echo "📂 Location: $BACKUP_PATH"
echo ""
echo "📊 Backup size:"
du -sh "$BACKUP_PATH"

echo ""
echo "🔄 To restore:"
echo "   Database: docker-compose exec -T postgres psql -U ispuser ispdb < $BACKUP_PATH/database.sql"
echo "   Volumes: See DOCKER.md for restore instructions"




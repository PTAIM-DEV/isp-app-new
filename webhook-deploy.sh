#!/bin/bash
# Script yang dijalankan oleh webhook untuk auto-deploy
# File ini akan dijalankan di remote server saat webhook trigger

set -e

cd /home/gastra/projects/isp-app

echo "[$(date)] Webhook triggered - Starting deployment..."

# Pull latest code
echo "[$(date)] Pulling latest code..."
git pull origin main

# Restore database jika ada backup baru (opsional)
# Uncomment jika ingin auto-restore database dari backup
# if [ -f db/isp_app_backup.dump ]; then
#     echo "[$(date)] Restoring database..."
#     ./restore-db-only.sh
# fi

# Run Prisma migrations
echo "[$(date)] Running Prisma migrations..."
docker compose exec -T app npx prisma migrate deploy || echo "Migrations already up-to-date"

# Restart services
echo "[$(date)] Restarting services..."
docker compose restart app || docker compose up -d app

echo "[$(date)] Deployment completed successfully!"


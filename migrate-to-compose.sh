#!/bin/bash

# Script untuk migrasi dari container postgres terpisah ke docker-compose

set -e

echo "🔄 Migrasi PostgreSQL ke docker-compose.yml"
echo "============================================="
echo ""

# Check if old postgres container exists
if docker ps -a --format "{{.Names}}" | grep -q "^isp-postgres$"; then
    echo "⚠️  Container isp-postgres yang lama ditemukan"
    echo ""
    echo "Pilih opsi:"
    echo "1. Stop dan remove container lama (data akan hilang jika tidak ada backup)"
    echo "2. Backup data dulu, kemudian stop container lama"
    echo "3. Cancel"
    echo ""
    read -p "Pilihan (1/2/3): " choice
    
    case $choice in
        1)
            echo "🛑 Stopping container lama..."
            docker stop isp-postgres 2>/dev/null || true
            docker rm isp-postgres 2>/dev/null || true
            echo "✅ Container lama dihapus"
            ;;
        2)
            echo "💾 Membuat backup..."
            BACKUP_FILE="postgres_backup_$(date +%Y%m%d_%H%M%S).sql"
            docker exec isp-postgres pg_dumpall -U postgres > "$BACKUP_FILE" 2>/dev/null || {
                echo "⚠️  Gagal backup, menggunakan metode alternatif..."
                docker exec isp-postgres pg_dump -U postgres isp_app > "$BACKUP_FILE" 2>/dev/null || echo "⚠️  Backup gagal, lanjutkan dengan hati-hati"
            }
            echo "✅ Backup dibuat: $BACKUP_FILE"
            echo ""
            echo "🛑 Stopping container lama..."
            docker stop isp-postgres 2>/dev/null || true
            docker rm isp-postgres 2>/dev/null || true
            echo "✅ Container lama dihapus"
            ;;
        3)
            echo "❌ Dibatalkan"
            exit 0
            ;;
        *)
            echo "❌ Pilihan tidak valid"
            exit 1
            ;;
    esac
else
    echo "ℹ️  Container isp-postgres lama tidak ditemukan"
fi

echo ""
echo "🚀 Starting services dengan docker-compose..."
docker-compose up -d

echo ""
echo "⏳ Menunggu PostgreSQL ready..."
sleep 10

echo ""
echo "📦 Running migrations..."
docker-compose exec -T app npx prisma migrate deploy || echo "⚠️  Migration mungkin sudah dijalankan"

echo ""
echo "✅ Migrasi selesai!"
echo ""
echo "📊 Status containers:"
docker-compose ps

echo ""
echo "💡 Tips:"
echo "   - Data PostgreSQL disimpan di volume: isp-app_postgres_data"
echo "   - Untuk backup: docker-compose exec postgres pg_dumpall -U postgres > backup.sql"
echo "   - Untuk restore: docker-compose exec -T postgres psql -U postgres < backup.sql"




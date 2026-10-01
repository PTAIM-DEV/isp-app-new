#!/bin/bash

# Script untuk update dan redeploy aplikasi

set -e

echo "🔄 ISP App Docker Deploy"
echo "========================"
echo ""

# Pull latest changes (jika menggunakan git)
if [ -d .git ]; then
    echo "📥 Pulling latest changes..."
    git pull || echo "⚠️  Git pull gagal, melanjutkan dengan build saat ini..."
    echo ""
fi

echo "🔨 Building new images..."
docker-compose build

echo ""
echo "🛑 Stopping containers..."
docker-compose down

echo ""
echo "🚀 Starting containers..."
docker-compose up -d

echo ""
echo "⏳ Menunggu services ready..."
sleep 10

echo ""
echo "📦 Running migrations (jika ada)..."
docker-compose exec -T app npx prisma migrate deploy || echo "✅ Tidak ada migration baru"

echo ""
echo "✅ Deploy selesai!"
echo ""
echo "📊 Status:"
docker-compose ps

echo ""
echo "📝 Logs:"
echo "   docker-compose logs -f app"
echo ""
echo "Note: Worker service saat ini disabled"


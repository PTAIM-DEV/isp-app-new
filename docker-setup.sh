#!/bin/bash

# Script untuk setup awal Docker deployment

set -e

echo "🚀 ISP App Docker Setup"
echo "======================"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker tidak ditemukan. Silakan install Docker terlebih dahulu."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose tidak ditemukan. Silakan install Docker Compose terlebih dahulu."
    exit 1
fi

echo "✅ Docker dan Docker Compose ditemukan"
echo ""

# Check .env file
if [ ! -f .env ]; then
    echo "📝 Membuat file .env dari template..."
    if [ -f env.template ]; then
        cp env.template .env
        echo "✅ File .env dibuat. Silakan edit file .env dan isi dengan konfigurasi yang sesuai."
        echo ""
        echo "⚠️  PENTING: Edit file .env sebelum melanjutkan!"
        echo "   - DATABASE_URL (gunakan PostgreSQL yang sudah ada)"
        echo "   - XENDIT_SECRET_KEY"
        echo "   - XENDIT_CALLBACK_TOKEN"
        echo "   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
        echo ""
        read -p "Tekan Enter setelah selesai mengedit .env..."
    else
        echo "❌ File env.template tidak ditemukan!"
        exit 1
    fi
else
    echo "✅ File .env sudah ada"
fi

echo ""
echo "🔨 Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting containers..."
docker-compose up -d

echo ""
echo "⏳ Menunggu aplikasi start..."
sleep 5

echo ""
echo "📦 Running database migrations..."
docker-compose exec -T app npx prisma migrate deploy || echo "⚠️  Migration mungkin sudah dijalankan sebelumnya"

echo ""
echo "🌱 Seeding payment flows..."
docker-compose exec -T app npx ts-node prisma/seed-payment-flows.ts || echo "⚠️  Seed mungkin sudah dijalankan sebelumnya"

echo ""
echo "✅ Setup selesai!"
echo ""
echo "📊 Status containers:"
docker-compose ps

echo ""
echo "📝 Logs dapat dilihat dengan:"
echo "   docker-compose logs -f"
echo ""
echo "🌐 Aplikasi tersedia di: http://localhost:3000"
echo ""


#!/bin/bash

# Script untuk connect container isp-postgres ke network docker-compose

echo "🔗 Connecting PostgreSQL container ke Docker network..."
echo ""

# Get network name from docker-compose
NETWORK_NAME=$(docker-compose config 2>/dev/null | grep -A 5 "networks:" | grep "name:" | awk '{print $2}' | head -1)

if [ -z "$NETWORK_NAME" ]; then
    NETWORK_NAME="isp-app_default"
fi

echo "Network name: $NETWORK_NAME"
echo ""

# Check if network exists
if ! docker network inspect "$NETWORK_NAME" &> /dev/null; then
    echo "⚠️  Network $NETWORK_NAME belum ada"
    echo "   Network akan dibuat saat docker-compose up"
    echo ""
    echo "Jalankan: docker-compose up -d (akan membuat network)"
    echo "Kemudian jalankan script ini lagi"
    exit 1
fi

# Connect isp-postgres to network
if docker network connect "$NETWORK_NAME" isp-postgres 2>/dev/null; then
    echo "✅ Container isp-postgres berhasil di-connect ke network $NETWORK_NAME"
elif docker network inspect "$NETWORK_NAME" | grep -q "isp-postgres"; then
    echo "✅ Container isp-postgres sudah terhubung ke network $NETWORK_NAME"
else
    echo "❌ Gagal connect container isp-postgres"
    echo "   Pastikan container isp-postgres sudah berjalan"
    exit 1
fi

echo ""
echo "✅ Selesai! Sekarang container isp-app bisa connect ke isp-postgres"
echo ""
echo "DATABASE_URL yang digunakan:"
echo "postgresql://postgres:password@isp-postgres:5432/isp_app?schema=public"




#!/bin/bash

# Script untuk test koneksi PostgreSQL ke remote server
# Usage: ./test-postgres-connection.sh [host] [port] [user] [database]

HOST="${1:-sulut.fibergo.id}"
PORT="${2:-5432}"
USER="${3:-postgres}"
DB="${4:-postgres}"

echo "🔍 Testing PostgreSQL Connection"
echo "================================"
echo "Host: $HOST"
echo "Port: $PORT"
echo "User: $USER"
echo "Database: $DB"
echo ""

# Test 1: Ping server
echo "1️⃣ Testing server connectivity..."
if ping -c 2 -W 2 "$HOST" &>/dev/null; then
    echo "   ✅ Server dapat dijangkau"
else
    echo "   ❌ Server tidak dapat dijangkau"
    exit 1
fi

# Test 2: Check port
echo ""
echo "2️⃣ Testing port $PORT..."
if nc -zv -w 5 "$HOST" "$PORT" 2>&1 | grep -q "succeeded\|open"; then
    echo "   ✅ Port $PORT terbuka"
elif nc -zv -w 5 "$HOST" "$PORT" 2>&1 | grep -q "timeout\|refused"; then
    echo "   ❌ Port $PORT tidak dapat diakses (timeout atau refused)"
    echo "   💡 Kemungkinan:"
    echo "      - Port tertutup oleh firewall"
    echo "      - PostgreSQL hanya listen di localhost"
    echo "      - PostgreSQL tidak running"
else
    echo "   ⚠️  Status port tidak jelas"
fi

# Test 3: Try psql connection (if available)
echo ""
echo "3️⃣ Testing PostgreSQL connection..."
if command -v psql &> /dev/null; then
    export PGPASSWORD="${PGPASSWORD:-password}"
    if psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -c "SELECT version();" 2>&1 | grep -q "PostgreSQL"; then
        echo "   ✅ Koneksi PostgreSQL berhasil!"
        psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -c "SELECT version();" 2>&1 | head -3
    else
        echo "   ❌ Koneksi PostgreSQL gagal"
        echo "   💡 Pastikan:"
        echo "      - PostgreSQL running di server"
        echo "      - Port 5432 terbuka di firewall"
        echo "      - postgresql.conf: listen_addresses = '*'"
        echo "      - pg_hba.conf: allow connection dari IP Anda"
    fi
else
    echo "   ⚠️  psql tidak terinstall (skip test koneksi)"
    echo "   💡 Install dengan: brew install postgresql (macOS) atau apt install postgresql-client (Linux)"
fi

echo ""
echo "📝 Rekomendasi:"
echo "   Jika port tertutup, cek di server:"
echo "   1. sudo ufw status (firewall)"
echo "   2. sudo netstat -tlnp | grep 5432 (cek apakah PostgreSQL listen)"
echo "   3. sudo cat /etc/postgresql/*/main/postgresql.conf | grep listen_addresses"
echo "   4. sudo cat /etc/postgresql/*/main/pg_hba.conf (cek allowed hosts)"



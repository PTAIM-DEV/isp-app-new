#!/bin/bash

# Script untuk mengecek PostgreSQL di sistem

echo "🔍 Checking PostgreSQL Installation"
echo "===================================="
echo ""

# Check if PostgreSQL is installed
echo "1️⃣ Checking PostgreSQL installation..."
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | head -n 1)
    echo "✅ PostgreSQL ditemukan: $PSQL_VERSION"
else
    echo "❌ PostgreSQL CLI (psql) tidak ditemukan"
fi

if command -v pg_isready &> /dev/null; then
    echo "✅ pg_isready ditemukan"
else
    echo "⚠️  pg_isready tidak ditemukan"
fi

echo ""

# Check if PostgreSQL service is running
echo "2️⃣ Checking PostgreSQL service status..."

# Try different service managers
if command -v systemctl &> /dev/null; then
    # Linux with systemd
    if systemctl is-active --quiet postgresql || systemctl is-active --quiet postgresql@*; then
        echo "✅ PostgreSQL service berjalan (systemd)"
        systemctl status postgresql --no-pager -l | head -n 5 || systemctl status postgresql@* --no-pager -l | head -n 5
    else
        echo "⚠️  PostgreSQL service tidak berjalan (systemd)"
        echo "   Coba jalankan: sudo systemctl start postgresql"
    fi
elif command -v service &> /dev/null; then
    # Linux with service command
    if service postgresql status &> /dev/null || service postgres status &> /dev/null; then
        echo "✅ PostgreSQL service ditemukan"
        service postgresql status 2>/dev/null || service postgres status 2>/dev/null | head -n 5
    else
        echo "⚠️  PostgreSQL service tidak ditemukan"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if brew services list 2>/dev/null | grep -q postgresql; then
        echo "✅ PostgreSQL ditemukan di Homebrew"
        brew services list | grep postgresql
    elif launchctl list | grep -q postgresql; then
        echo "✅ PostgreSQL service ditemukan (launchctl)"
    else
        echo "⚠️  PostgreSQL service tidak ditemukan di Homebrew"
    fi
fi

echo ""

# Check PostgreSQL connection
echo "3️⃣ Testing PostgreSQL connection..."

# Try common connection methods
CONNECTION_STRINGS=(
    "postgresql://postgres@localhost:5432/postgres"
    "postgresql://localhost:5432/postgres"
    "postgresql://$(whoami)@localhost:5432/postgres"
)

CONNECTED=false
for conn_str in "${CONNECTION_STRINGS[@]}"; do
    if PGPASSWORD="" psql "$conn_str" -c "SELECT version();" &> /dev/null 2>&1; then
        echo "✅ Berhasil connect ke PostgreSQL!"
        echo "   Connection string: $conn_str"
        psql "$conn_str" -c "SELECT version();" | head -n 3
        CONNECTED=true
        break
    fi
done

if [ "$CONNECTED" = false ]; then
    echo "⚠️  Tidak bisa connect ke PostgreSQL dengan default settings"
    echo ""
    echo "💡 Tips untuk connect:"
    echo "   - Pastikan PostgreSQL sudah berjalan"
    echo "   - Cek port: netstat -an | grep 5432 atau lsof -i :5432"
    echo "   - Coba dengan user yang berbeda"
fi

echo ""

# Check PostgreSQL port
echo "4️⃣ Checking PostgreSQL port (5432)..."
if lsof -i :5432 &> /dev/null || netstat -an 2>/dev/null | grep -q ":5432" || ss -tuln 2>/dev/null | grep -q ":5432"; then
    echo "✅ Port 5432 sedang digunakan"
    echo ""
    echo "Process yang menggunakan port 5432:"
    lsof -i :5432 2>/dev/null || netstat -anp 2>/dev/null | grep ":5432" || ss -tulnp 2>/dev/null | grep ":5432" || echo "   (tidak bisa menampilkan detail)"
else
    echo "⚠️  Port 5432 tidak digunakan (PostgreSQL mungkin tidak berjalan)"
fi

echo ""

# List databases (if connected)
if [ "$CONNECTED" = true ]; then
    echo "5️⃣ Listing databases..."
    psql "$conn_str" -c "\l" 2>/dev/null | head -n 20 || echo "⚠️  Tidak bisa list databases"
    echo ""
fi

# Check Docker PostgreSQL containers
echo "6️⃣ Checking Docker PostgreSQL containers..."
if command -v docker &> /dev/null; then
    DOCKER_POSTGRES=$(docker ps -a --filter "name=postgres" --format "{{.Names}}" 2>/dev/null)
    if [ -n "$DOCKER_POSTGRES" ]; then
        echo "✅ PostgreSQL containers ditemukan:"
        echo "$DOCKER_POSTGRES" | while read -r container; do
            echo "   - $container"
            STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
            echo "     Status: $STATUS"
        done
    else
        echo "ℹ️  Tidak ada PostgreSQL container di Docker"
    fi
else
    echo "ℹ️  Docker tidak terinstall"
fi

echo ""
echo "===================================="
echo "📝 Summary:"
echo ""
echo "Untuk menggunakan PostgreSQL yang sudah ada, edit file .env:"
echo ""
echo "DATABASE_URL=postgresql://user:password@host.docker.internal:5432/dbname?schema=public"
echo ""
echo "Atau jika PostgreSQL di container Docker:"
echo "DATABASE_URL=postgresql://user:password@container-name:5432/dbname?schema=public"
echo ""




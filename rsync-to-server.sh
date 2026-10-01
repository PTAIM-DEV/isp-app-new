#!/bin/bash

# Script untuk rsync ke remote server dengan exclude yang benar
# Usage: ./rsync-to-server.sh user@remote-server:/path/to/isp-app

set -e

if [ -z "$1" ]; then
    echo "❌ Usage: $0 user@remote-server:/path/to/isp-app"
    echo ""
    echo "Example:"
    echo "  $0 root@192.168.1.100:/opt/isp-app"
    exit 1
fi

REMOTE_PATH="$1"

echo "📤 Rsync ke Remote Server"
echo "========================="
echo "Remote: $REMOTE_PATH"
echo ""

# Check if rsync is available
if ! command -v rsync &> /dev/null; then
    echo "❌ rsync tidak ditemukan. Install dulu:"
    echo "   macOS: brew install rsync"
    echo "   Linux: sudo apt install rsync"
    exit 1
fi

echo "📋 Excluding folders:"
echo "   ❌ node_modules/ (770MB - akan di-build di Docker)"
echo "   ❌ .next/ (102MB - akan di-build di Docker)"
echo "   ❌ .git/ (tidak diperlukan)"
echo "   ❌ baileys_auth_info/ (akan dibuat di container)"
echo "   ❌ public/uploads/ (akan dibuat di container)"
echo "   ❌ docker-images-export/ (temporary)"
echo "   ❌ docs/ (opsional)"
echo "   ❌ *.log, *.tar.gz, dll"
echo ""

# Rsync dengan exclude
rsync -avz \
    --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'build' \
    --exclude 'docker-images-export' \
    --exclude 'baileys_auth_info' \
    --exclude 'public/uploads' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    --exclude '.env.local' \
    --exclude '.env.development.local' \
    --exclude '.env.test.local' \
    --exclude '.env.production.local' \
    --exclude '*.swp' \
    --exclude '*.swo' \
    --exclude '.vscode' \
    --exclude '.idea' \
    --exclude '*.tsbuildinfo' \
    --exclude 'next-env.d.ts' \
    --exclude 'coverage' \
    --exclude '.nyc_output' \
    --exclude '.vercel' \
    --exclude 'docs' \
    --exclude '*.sql' \
    --exclude 'backup.sql' \
    --exclude 'scripts' \
    --exclude '*.sh' \
    --exclude '*.tar.gz' \
    ./ "$REMOTE_PATH/"

echo ""
echo "✅ Rsync completed!"
echo ""
echo "📝 Next steps on server:"
echo "   1. cd $(echo $REMOTE_PATH | cut -d: -f2)"
echo "   2. cp env.template .env"
echo "   3. nano .env  # Edit dengan konfigurasi server"
echo "   4. docker-compose build"
echo "   5. docker-compose up -d"
echo "   6. docker-compose exec app npx prisma@6.19.0 db push"



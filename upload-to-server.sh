#!/bin/bash

# Script untuk upload source code ke remote server (exclude node_modules, .next, dll)
# Usage: ./upload-to-server.sh user@remote-server:/path/to/isp-app

set -e

if [ -z "$1" ]; then
    echo "❌ Usage: $0 user@remote-server:/path/to/isp-app"
    echo ""
    echo "Example:"
    echo "  $0 root@192.168.1.100:/opt/isp-app"
    exit 1
fi

REMOTE_PATH="$1"
REMOTE_USER=$(echo "$REMOTE_PATH" | cut -d@ -f1)
REMOTE_HOST=$(echo "$REMOTE_PATH" | cut -d@ -f2 | cut -d: -f1)
REMOTE_DIR=$(echo "$REMOTE_PATH" | cut -d: -f2)

echo "📤 Uploading Source Code to Server"
echo "===================================="
echo "Remote: $REMOTE_PATH"
echo ""

# Check if rsync is available (lebih efisien dari scp)
if command -v rsync &> /dev/null; then
    echo "✅ Using rsync (recommended - lebih cepat)"
    echo ""
    
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
        --exclude 'coverage' \
        --exclude '.nyc_output' \
        ./ "$REMOTE_PATH/"
    
    echo ""
    echo "✅ Upload completed!"
    
else
    echo "⚠️  rsync tidak tersedia, menggunakan scp (lebih lambat)"
    echo ""
    
    # Create temporary exclude file
    EXCLUDE_FILE=$(mktemp)
    cat > "$EXCLUDE_FILE" << 'EOF'
node_modules
.next
.git
dist
build
docker-images-export
baileys_auth_info
public/uploads
*.log
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local
*.swp
*.swo
.vscode
.idea
coverage
.nyc_output
EOF
    
    echo "📦 Creating tar archive (excluding unnecessary files)..."
    tar -czf /tmp/isp-app-source.tar.gz \
        --exclude-from="$EXCLUDE_FILE" \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='.git' \
        .
    
    echo "📤 Uploading archive..."
    scp /tmp/isp-app-source.tar.gz "$REMOTE_PATH/"
    
    echo "📦 Extracting on remote server..."
    ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && tar -xzf isp-app-source.tar.gz && rm isp-app-source.tar.gz"
    
    # Cleanup
    rm -f "$EXCLUDE_FILE" /tmp/isp-app-source.tar.gz
    
    echo ""
    echo "✅ Upload completed!"
fi

echo ""
echo "📝 Next steps on server:"
echo "   1. cd $REMOTE_DIR"
echo "   2. cp env.template .env"
echo "   3. nano .env  # Edit dengan konfigurasi server"
echo "   4. docker-compose build"
echo "   5. docker-compose up -d"
echo "   6. docker-compose exec app npx prisma@6.19.0 db push"



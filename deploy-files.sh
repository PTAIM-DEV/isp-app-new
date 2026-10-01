#!/bin/bash

# Script untuk membuat list file yang perlu di-upload ke remote server

set -e

echo "📦 Preparing Deployment Files"
echo "=============================="
echo ""

# Create deployment directory
DEPLOY_DIR="deploy-package"
mkdir -p "$DEPLOY_DIR"

echo "📁 Copying required files..."

# Copy essential files
cp docker-compose.yml "$DEPLOY_DIR/"
cp Dockerfile "$DEPLOY_DIR/"
cp Dockerfile.worker "$DEPLOY_DIR/"
cp .dockerignore "$DEPLOY_DIR/"
cp env.template "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/" 2>/dev/null || echo "⚠️  package-lock.json not found"
cp next.config.js "$DEPLOY_DIR/"
cp tsconfig.json "$DEPLOY_DIR/"

# Copy directories
echo "📂 Copying directories..."
cp -r prisma "$DEPLOY_DIR/"
cp -r app "$DEPLOY_DIR/"
cp -r components "$DEPLOY_DIR/"
cp -r lib "$DEPLOY_DIR/"
cp -r public "$DEPLOY_DIR/"

# Copy optional scripts
if [ -d "scripts" ]; then
    cp -r scripts "$DEPLOY_DIR/"
fi

# Copy deployment guide
cp DEPLOY.md "$DEPLOY_DIR/"

echo ""
echo "✅ Files copied to: $DEPLOY_DIR/"
echo ""
echo "📋 File structure:"
tree -L 2 "$DEPLOY_DIR" 2>/dev/null || find "$DEPLOY_DIR" -type f | head -20

echo ""
echo "📦 Creating archive..."
tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"
echo "✅ Archive created: ${DEPLOY_DIR}.tar.gz"
echo ""
echo "📊 Archive size:"
du -h "${DEPLOY_DIR}.tar.gz"
echo ""
echo "🚀 Ready to upload!"
echo ""
echo "To upload to remote server:"
echo "  scp ${DEPLOY_DIR}.tar.gz user@remote-server:/path/to/"
echo ""
echo "On remote server, extract and setup:"
echo "  tar -xzf ${DEPLOY_DIR}.tar.gz"
echo "  cd $DEPLOY_DIR"
echo "  cp env.template .env"
echo "  nano .env  # Edit dengan konfigurasi server"
echo "  docker-compose up -d"




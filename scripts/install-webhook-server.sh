#!/bin/bash
# Script untuk install webhook server di remote server
# Jalankan di remote server: bash <(curl -s) atau copy-paste

set -e

echo "=========================================="
echo "  Install Webhook Server untuk Auto-Deploy"
echo "=========================================="
echo ""

# Check if Node.js installed
if ! command -v node &> /dev/null; then
    echo "Node.js tidak ditemukan. Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check if PM2 installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Create webhook directory
WEBHOOK_DIR="/home/gastra/webhook-server"
mkdir -p "$WEBHOOK_DIR"

# Copy webhook server script
echo "Setting up webhook server..."
# Script akan di-copy dari project directory

# Create systemd service atau PM2 config
echo "Creating PM2 config..."

# Set environment variables
read -p "Webhook Secret Key (untuk GitHub webhook): " WEBHOOK_SECRET
read -p "Webhook Port (default 9000): " WEBHOOK_PORT
WEBHOOK_PORT=${WEBHOOK_PORT:-9000}

# Create .env file for webhook
cat > "$WEBHOOK_DIR/.env" << EOF
WEBHOOK_SECRET=$WEBHOOK_SECRET
WEBHOOK_PORT=$WEBHOOK_PORT
DEPLOY_SCRIPT=/home/gastra/projects/isp-app/webhook-deploy.sh
GITHUB_BRANCH=main
EOF

echo ""
echo -e "${GREEN}✓${NC} Webhook server setup selesai"
echo ""
echo "Next steps:"
echo "1. Copy scripts/webhook-server.js ke $WEBHOOK_DIR/"
echo "2. Start dengan PM2: pm2 start $WEBHOOK_DIR/webhook-server.js --name webhook-deploy"
echo "3. Setup GitHub webhook dengan secret: $WEBHOOK_SECRET"
echo ""


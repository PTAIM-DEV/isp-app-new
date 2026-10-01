#!/bin/bash
# Script untuk setup GitHub webhook untuk auto-deploy
# Usage: ./scripts/setup-webhook.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load config
if [ -f .deploy-config ]; then
    source .deploy-config
else
    echo -e "${RED}Error: .deploy-config tidak ditemukan!${NC}"
    exit 1
fi

REMOTE_HOST=${REMOTE_HOST:-sulut.fibergo.id}
REMOTE_USER=${REMOTE_USER:-gastra}
REMOTE_PATH=${REMOTE_PATH:-/home/gastra/projects/isp-app}
GITHUB_BRANCH=${GITHUB_BRANCH:-main}

echo "=========================================="
echo "  Setup GitHub Webhook untuk Auto-Deploy"
echo "=========================================="
echo ""

# Step 1: Create webhook endpoint script on remote
echo "Step 1: Creating webhook endpoint on remote server..."
cat > /tmp/webhook-deploy.sh << 'WEBHOOKEOF'
#!/bin/bash
# Webhook endpoint untuk auto-deploy
# File ini akan dijalankan oleh webhook server

cd /home/gastra/projects/isp-app

# Pull latest code
git pull origin main

# Restore database (jika ada backup baru)
if [ -f db/isp_app_backup.dump ]; then
    ./restore-db-only.sh
fi

# Restart services
docker compose restart app || docker compose up -d app

echo "Deployment completed at $(date)"
WEBHOOKEOF

# Transfer script to remote
scp -P ${SSH_PORT:-22} /tmp/webhook-deploy.sh "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/webhook-deploy.sh"
ssh -p ${SSH_PORT:-22} "$REMOTE_USER@$REMOTE_HOST" "chmod +x $REMOTE_PATH/webhook-deploy.sh"
rm -f /tmp/webhook-deploy.sh

echo -e "${GREEN}✓${NC} Webhook script sudah dibuat di remote"
echo ""

# Step 2: Instructions for GitHub webhook setup
echo "Step 2: Setup GitHub Webhook"
echo ""
echo -e "${BLUE}Langkah-langkah:${NC}"
echo ""
echo "1. Buka GitHub repository Anda"
echo "2. Pergi ke Settings > Webhooks > Add webhook"
echo "3. Isi form:"
echo "   - Payload URL: http://$REMOTE_HOST:9000/webhook (atau port yang Anda pilih)"
echo "   - Content type: application/json"
echo "   - Secret: (buat secret key, simpan untuk webhook server)"
echo "   - Events: Pilih 'Just the push event'"
echo "   - Active: ✓"
echo ""
echo "4. Install dan setup webhook server di remote:"
echo ""
echo "   Option A: Menggunakan webhook (simple)"
echo "   - Install: sudo apt install webhook"
echo "   - Create config: /etc/webhook.conf"
echo ""
echo "   Option B: Menggunakan Node.js webhook server (recommended)"
echo "   - File sudah dibuat: scripts/webhook-server.js"
echo "   - Install: npm install -g pm2"
echo "   - Run: pm2 start scripts/webhook-server.js"
echo ""
echo -e "${YELLOW}Note:${NC} Webhook server perlu di-setup manual di remote server"
echo ""


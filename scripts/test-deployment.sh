#!/bin/bash
# Script untuk test deployment (dijalankan di server rumah)
# Usage: ./scripts/test-deployment.sh

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
SSH_PORT=${SSH_PORT:-22022}

echo "=========================================="
echo "  Test Deployment Setup"
echo "=========================================="
echo ""

# Step 1: Test SSH connection
echo "Step 1: Testing SSH connection..."
if ssh -p "$SSH_PORT" -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "echo 'SSH OK'" 2>&1; then
    echo -e "${GREEN}✓${NC} SSH connection OK"
else
    echo -e "${RED}✗${NC} SSH connection failed"
    echo ""
    echo "Troubleshooting:"
    echo "1. Pastikan SSH key sudah di-setup"
    echo "2. Test manual: ssh -p $SSH_PORT $REMOTE_USER@$REMOTE_HOST"
    echo "3. Jika host key verification failed, jalankan:"
    echo "   ssh-keyscan -p $SSH_PORT $REMOTE_HOST >> ~/.ssh/known_hosts"
    exit 1
fi
echo ""

# Step 2: Check remote directory
echo "Step 2: Checking remote directory..."
if ssh -p "$SSH_PORT" "$REMOTE_USER@$REMOTE_HOST" "[ -d $REMOTE_PATH ] && echo 'OK' || echo 'NOT FOUND'"; then
    echo -e "${GREEN}✓${NC} Remote directory exists"
else
    echo -e "${YELLOW}⚠${NC} Remote directory tidak ditemukan"
    echo "   Jalankan setup di remote: ./scripts/setup-remote.sh"
fi
echo ""

# Step 3: Check Git repository on remote
echo "Step 3: Checking Git repository on remote..."
REMOTE_GIT_STATUS=$(ssh -p "$SSH_PORT" "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && git remote -v 2>&1" || echo "NOT A GIT REPO")
if echo "$REMOTE_GIT_STATUS" | grep -q "origin"; then
    echo -e "${GREEN}✓${NC} Git remote configured on remote server"
    echo "$REMOTE_GIT_STATUS" | head -2
else
    echo -e "${YELLOW}⚠${NC} Git remote belum dikonfigurasi di remote server"
    echo "   Jalankan: ssh -p $SSH_PORT $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_PATH && bash scripts/setup-remote.sh'"
fi
echo ""

# Step 4: Check Docker on remote
echo "Step 4: Checking Docker on remote..."
REMOTE_DOCKER=$(ssh -p "$SSH_PORT" "$REMOTE_USER@$REMOTE_HOST" "docker compose ps postgres 2>&1" || echo "ERROR")
if echo "$REMOTE_DOCKER" | grep -q "Up"; then
    echo -e "${GREEN}✓${NC} PostgreSQL container running on remote"
else
    echo -e "${YELLOW}⚠${NC} PostgreSQL container tidak berjalan di remote"
fi
echo ""

# Step 5: Check scripts on remote
echo "Step 5: Checking deployment scripts on remote..."
REMOTE_SCRIPTS=$(ssh -p "$SSH_PORT" "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && ls -1 deploy.sh restore-db-only.sh 2>&1" || echo "NOT FOUND")
if echo "$REMOTE_SCRIPTS" | grep -q "deploy.sh"; then
    echo -e "${GREEN}✓${NC} Deployment scripts found on remote"
else
    echo -e "${YELLOW}⚠${NC} Deployment scripts tidak ditemukan di remote"
    echo "   Scripts perlu di-sync dari GitHub atau di-copy manual"
fi
echo ""

echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo ""
echo "Jika semua test OK, Anda bisa deploy dengan:"
echo "  ./deploy.sh"
echo ""
echo "Jika ada warning, ikuti instruksi di atas untuk memperbaikinya."
echo ""


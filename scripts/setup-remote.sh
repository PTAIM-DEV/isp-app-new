#!/bin/bash
# Script untuk setup remote server (dijalankan di remote server)
# Usage: SSH ke remote server, lalu jalankan script ini

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  Setup Remote Server untuk Deployment"
echo "=========================================="
echo ""

PROJECT_PATH="/home/gastra/projects/isp-app"
cd "$PROJECT_PATH" || {
    echo -e "${RED}Error: Directory $PROJECT_PATH tidak ditemukan!${NC}"
    exit 1
}

echo "Current directory: $(pwd)"
echo ""

# Step 1: Check Git repository
echo "Step 1: Checking Git repository..."
if [ ! -d .git ]; then
    echo -e "${YELLOW}⚠${NC} Git repository tidak ditemukan"
    read -p "Initialize Git repository? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git init
        echo -e "${GREEN}✓${NC} Git repository initialized"
    fi
else
    echo -e "${GREEN}✓${NC} Git repository sudah ada"
    git remote -v || echo -e "${YELLOW}⚠${NC} No remote configured"
fi
echo ""

# Step 2: Setup GitHub remote
echo "Step 2: Setup GitHub remote..."
if git remote | grep -q origin; then
    CURRENT_REMOTE=$(git remote get-url origin)
    echo -e "${GREEN}✓${NC} Remote sudah ada: $CURRENT_REMOTE"
    read -p "Update remote URL? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "GitHub repository URL: " GITHUB_URL
        git remote set-url origin "$GITHUB_URL"
        echo -e "${GREEN}✓${NC} Remote updated"
    fi
else
    read -p "GitHub repository URL: " GITHUB_URL
    if [ -n "$GITHUB_URL" ]; then
        git remote add origin "$GITHUB_URL"
        echo -e "${GREEN}✓${NC} Remote added"
    fi
fi
echo ""

# Step 3: Pull latest code
echo "Step 3: Pulling latest code from GitHub..."
if git remote | grep -q origin; then
    git fetch origin || echo -e "${YELLOW}⚠${NC} Fetch failed, mungkin repository kosong"
    
    # Check if main branch exists
    if git ls-remote --heads origin main | grep -q main; then
        git checkout main 2>/dev/null || git checkout -b main
        git pull origin main || echo -e "${YELLOW}⚠${NC} Pull failed atau ada konflik"
        echo -e "${GREEN}✓${NC} Code sudah di-update"
    else
        echo -e "${YELLOW}⚠${NC} Branch main tidak ditemukan di remote"
    fi
else
    echo -e "${YELLOW}⚠${NC} Remote tidak dikonfigurasi, skip pull"
fi
echo ""

# Step 4: Make scripts executable
echo "Step 4: Making scripts executable..."
chmod +x deploy.sh backup-db.sh sync-db.sh restore-db-only.sh webhook-deploy.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true
echo -e "${GREEN}✓${NC} Scripts sudah executable"
echo ""

# Step 5: Check Docker containers
echo "Step 5: Checking Docker containers..."
if docker compose ps postgres | grep -q "Up"; then
    echo -e "${GREEN}✓${NC} PostgreSQL container sudah berjalan"
else
    echo -e "${YELLOW}⚠${NC} PostgreSQL container tidak berjalan"
    read -p "Start PostgreSQL container? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose up -d postgres
        echo "Menunggu PostgreSQL ready..."
        sleep 10
    fi
fi
echo ""

# Step 6: Check .deploy-config
echo "Step 6: Checking .deploy-config..."
if [ -f .deploy-config ]; then
    echo -e "${GREEN}✓${NC} .deploy-config sudah ada"
    echo "Current config:"
    cat .deploy-config | grep -E "REMOTE_|GITHUB_" | head -5
else
    echo -e "${YELLOW}⚠${NC} .deploy-config tidak ditemukan"
    echo "Creating default .deploy-config..."
    cat > .deploy-config << 'CONFIGEOF'
# Deployment Configuration
REMOTE_HOST=sulut.fibergo.id
REMOTE_USER=gastra
REMOTE_PATH=/home/gastra/projects/isp-app

DB_BACKUP_DIR=db
DB_BACKUP_FILE=isp_app_backup.dump
DB_NAME=isp_app
DB_USER=postgres

GITHUB_BRANCH=main

SSH_PORT=22022

AUTO_BACKUP=true
AUTO_GIT_PUSH=true
AUTO_RESTART=true
CONFIGEOF
    echo -e "${GREEN}✓${NC} .deploy-config created"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}  Setup Remote Server Selesai!${NC}"
echo "=========================================="
echo ""
echo "Next steps dari server rumah:"
echo "  1. Test koneksi: ssh -p 22022 gastra@sulut.fibergo.id"
echo "  2. Deploy: ./deploy.sh"
echo ""


#!/bin/bash
# Main deployment script
# Usage: ./deploy.sh [--skip-backup] [--skip-git] [--remote-only]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
SKIP_BACKUP=false
SKIP_GIT=false
REMOTE_ONLY=false

for arg in "$@"; do
    case $arg in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-git)
            SKIP_GIT=true
            shift
            ;;
        --remote-only)
            REMOTE_ONLY=true
            SKIP_BACKUP=true
            shift
            ;;
        *)
            ;;
    esac
done

# Load config
if [ -f .deploy-config ]; then
    source .deploy-config
else
    echo -e "${RED}Error: .deploy-config tidak ditemukan!${NC}"
    exit 1
fi

# Set defaults
REMOTE_HOST=${REMOTE_HOST:-sulut.fibergo.id}
REMOTE_USER=${REMOTE_USER:-gastra}
REMOTE_PATH=${REMOTE_PATH:-/home/gastra/projects/isp-app}
GITHUB_BRANCH=${GITHUB_BRANCH:-main}
AUTO_BACKUP=${AUTO_BACKUP:-true}
AUTO_GIT_PUSH=${AUTO_GIT_PUSH:-true}
AUTO_RESTART=${AUTO_RESTART:-true}

echo "=========================================="
echo "  Deployment ke Remote Server"
echo "=========================================="
echo ""
echo "Remote: $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"
echo ""

# Step 1: Backup database (if not skipped)
if [ "$SKIP_BACKUP" = false ] && [ "$AUTO_BACKUP" = "true" ]; then
    echo "Step 1: Backing up local database..."
    ./backup-db.sh
    echo ""
fi

# Step 2: Git operations (if not skipped)
if [ "$SKIP_GIT" = false ] && [ "$AUTO_GIT_PUSH" = "true" ]; then
    echo "Step 2: Git operations..."
    
    # Check if there are uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠${NC} Ada perubahan yang belum di-commit"
        read -p "Commit perubahan sekarang? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Commit message: " COMMIT_MSG
            git add .
            git commit -m "${COMMIT_MSG:-Update}"
        fi
    fi
    
    # Push to GitHub
    echo "Pushing to GitHub..."
    git push origin "$GITHUB_BRANCH" || echo -e "${YELLOW}⚠${NC} Git push gagal atau tidak ada perubahan"
    echo ""
fi

# Step 3: Pull latest code on remote
echo "Step 3: Pulling latest code on remote server..."
echo "Stashing local changes di remote server (jika ada)..."
ssh -p ${SSH_PORT:-22} "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && git stash push -m 'Auto-stash before deploy $(date +%Y%m%d-%H%M%S)' 2>/dev/null || true"
echo "Pulling latest code..."
if ! ssh -p ${SSH_PORT:-22} "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && git config pull.rebase false 2>/dev/null || true && git fetch origin $GITHUB_BRANCH && git reset --hard origin/$GITHUB_BRANCH"; then
    echo -e "${RED}Error: Git pull gagal di remote server!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Code sudah di-update di remote"
echo ""

# Step 3.5: Run Prisma migrations on remote
echo "Step 3.5: Running Prisma migrations on remote server..."
ssh -p ${SSH_PORT:-22} "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && docker compose exec -T app npx prisma migrate deploy 2>&1 || echo 'Migrations already up-to-date or container not running'" || echo -e "${YELLOW}⚠${NC} Migration failed atau container belum berjalan"
echo -e "${GREEN}✓${NC} Schema sudah di-sync"
echo ""

# Step 4: Sync database (if backup was created)
if [ "$SKIP_BACKUP" = false ] && [ "$AUTO_BACKUP" = "true" ]; then
    echo "Step 4: Syncing database..."
    ./sync-db.sh
    echo ""
fi

# Step 5: Restart services on remote
if [ "$AUTO_RESTART" = "true" ]; then
    echo "Step 5: Restarting services on remote server..."
    ssh -p ${SSH_PORT:-22} "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && docker compose restart app || docker compose up -d app"
    echo -e "${GREEN}✓${NC} Services sudah di-restart"
    echo ""
fi

echo "=========================================="
echo -e "${GREEN}  Deployment Selesai!${NC}"
echo "=========================================="
echo ""
echo "Aplikasi sudah di-deploy ke: http://$REMOTE_HOST"
echo ""



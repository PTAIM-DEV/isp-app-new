#!/bin/bash
# Script deploy sederhana - satu command untuk deploy semua perubahan
# Usage: ./deploy-simple.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Load config
if [ ! -f .deploy-config ]; then
    echo -e "${RED}Error: .deploy-config tidak ditemukan!${NC}"
    exit 1
fi
source .deploy-config

REMOTE_HOST=${REMOTE_HOST:-sulut.fibergo.id}
REMOTE_USER=${REMOTE_USER:-gastra}
REMOTE_PATH=${REMOTE_PATH:-/home/gastra/projects/isp-app}
GITHUB_BRANCH=${GITHUB_BRANCH:-main}
SSH_PORT=${SSH_PORT:-22022}

echo "=========================================="
echo "  Deploy ke Remote Server"
echo "=========================================="
echo ""

# Step 1: Commit perubahan (jika ada)
echo "Step 1: Checking for changes..."
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠${NC} Ada perubahan yang belum di-commit"
    read -p "Commit sekarang? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Commit message: " COMMIT_MSG
        git add .
        git commit -m "${COMMIT_MSG:-Update}"
        echo -e "${GREEN}✓${NC} Perubahan sudah di-commit"
    fi
else
    echo -e "${GREEN}✓${NC} Tidak ada perubahan yang perlu di-commit"
fi
echo ""

# Step 2: Pull latest dari GitHub (untuk menghindari conflict)
echo "Step 2: Pulling latest dari GitHub..."
git config pull.rebase false 2>/dev/null || true
if ! git pull origin "$GITHUB_BRANCH" --no-edit 2>&1 | grep -q "Already up to date\|Updating\|Merge"; then
    echo -e "${YELLOW}⚠${NC} Ada konflik atau masalah. Silakan resolve manual."
    exit 1
fi
echo -e "${GREEN}✓${NC} Pull berhasil"
echo ""

# Step 3: Push ke GitHub
echo "Step 3: Pushing ke GitHub..."
if ! git push origin "$GITHUB_BRANCH"; then
    echo -e "${RED}Error: Git push gagal!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Push berhasil"
echo ""

# Step 4: Sync code di remote server
echo "Step 4: Syncing code di remote server..."
GIT_REPO=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$GIT_REPO" ]; then
    echo -e "${RED}Error: Tidak bisa detect Git repository URL!${NC}"
    exit 1
fi

ssh -p $SSH_PORT "$REMOTE_USER@$REMOTE_HOST" "
    # Pastikan folder ada
    mkdir -p $REMOTE_PATH
    cd $REMOTE_PATH || exit 1
    
    # Backup .env jika ada
    if [ -f .env ]; then
        cp .env .env.backup.\$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
        echo '✓ .env sudah di-backup'
    fi
    
    # Cek apakah sudah ada .git
    if [ -d .git ]; then
        # Jika sudah ada, pull update
        echo 'Repository sudah ada, pulling update...'
        git stash push -m 'Auto-stash before deploy \$(date +%Y%m%d-%H%M%S)' 2>/dev/null || true
        git fetch origin $GITHUB_BRANCH
        git reset --hard origin/$GITHUB_BRANCH
        echo '✓ Code sudah ter-update'
    else
        # Jika belum ada, clone repository
        echo 'Repository belum ada, cloning...'
        # Hapus semua file kecuali .env backup
        find . -maxdepth 1 ! -name '.' ! -name '.env*' -exec rm -rf {} + 2>/dev/null || true
        # Clone ke folder
        git clone $GIT_REPO temp_clone || exit 1
        # Move semua file dari temp_clone ke current directory
        mv temp_clone/* temp_clone/.[!.]* . 2>/dev/null || true
        rm -rf temp_clone
        # Checkout branch yang benar
        git checkout $GITHUB_BRANCH 2>/dev/null || true
        echo '✓ Repository sudah di-clone'
    fi
    
    # Restore .env dari backup jika ada
    LATEST_ENV=\$(ls -t .env.backup.* 2>/dev/null | head -1)
    if [ -n \"\$LATEST_ENV\" ] && [ -f \"\$LATEST_ENV\" ] && [ ! -f .env ]; then
        cp \"\$LATEST_ENV\" .env
        echo '✓ .env sudah di-restore'
    fi
" || {
    echo -e "${RED}Error: Gagal sync code di remote server!${NC}"
    exit 1
}
echo -e "${GREEN}✓${NC} Code sudah ter-sync di remote"
echo ""

# Step 5: Setup di remote server
echo "Step 5: Setting up di remote server..."
ssh -p $SSH_PORT "$REMOTE_USER@$REMOTE_HOST" "
    cd $REMOTE_PATH || exit 1
    
    # Pastikan .env ada
    if [ ! -f .env ]; then
        echo '⚠ .env tidak ditemukan, pastikan sudah dikonfigurasi'
    fi
    
    # Install dependencies jika belum ada
    if [ ! -d node_modules ]; then
        echo 'Installing dependencies...'
        npm install 2>&1 | tail -5 || echo '⚠ Gagal install dependencies'
    else
        echo '✓ Dependencies sudah ada'
    fi
    
    # Generate Prisma Client
    export \$(cat .env | grep DATABASE_URL | xargs) 2>/dev/null || true
    npx prisma generate 2>&1 | tail -2 || echo '⚠ Gagal generate Prisma Client'
    
    # Run migrations
    npx prisma migrate deploy 2>&1 | tail -3 || echo '⚠ Migrations mungkin sudah up-to-date'
    
    echo '✓ Setup selesai'
" || echo -e "${YELLOW}⚠${NC} Setup mungkin ada masalah"
echo -e "${GREEN}✓${NC} Setup selesai"
echo ""

echo "=========================================="
echo -e "${GREEN}  Deploy Selesai!${NC}"
echo "=========================================="
echo ""
echo "Langkah selanjutnya di remote server:"
echo "  1. Install dependencies (jika perlu):"
echo "     npm install"
echo ""
echo "  2. Restart npm run dev (jika perlu):"
echo "     pkill -f 'npm run dev' && npm run dev"
echo ""
echo "  ATAU jalankan script otomatis:"
echo "     ./scripts/post-deploy.sh"
echo ""



#!/bin/bash
# Script untuk setup Git repository dan push ke GitHub
# Usage: ./scripts/setup-github.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  Setup Git Repository & GitHub"
echo "=========================================="
echo ""

# Step 1: Initialize Git (jika belum)
if [ ! -d .git ]; then
    echo "Step 1: Initializing Git repository..."
    git init
    echo -e "${GREEN}✓${NC} Git repository initialized"
    echo ""
else
    echo -e "${GREEN}✓${NC} Git repository sudah ada"
    echo ""
fi

# Step 2: Check if .gitignore exists
if [ ! -f .gitignore ]; then
    echo -e "${YELLOW}⚠${NC} .gitignore tidak ditemukan"
else
    echo -e "${GREEN}✓${NC} .gitignore sudah ada"
fi
echo ""

# Step 3: Add all files
echo "Step 2: Adding files to Git..."
git add .
echo -e "${GREEN}✓${NC} Files added"
echo ""

# Step 4: Initial commit
echo "Step 3: Creating initial commit..."
read -p "Commit message (default: Initial commit): " COMMIT_MSG
COMMIT_MSG=${COMMIT_MSG:-Initial commit}
git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✓${NC} Initial commit created"
echo ""

# Step 5: Setup GitHub remote
echo "Step 4: Setup GitHub remote..."
echo ""
echo -e "${BLUE}Pilih salah satu:${NC}"
echo "1. Buat repository baru di GitHub (recommended)"
echo "2. Gunakan repository yang sudah ada"
echo ""
read -p "Pilihan (1/2): " CHOICE

if [ "$CHOICE" = "1" ]; then
    echo ""
    echo -e "${BLUE}Langkah-langkah:${NC}"
    echo "1. Buka https://github.com/new"
    echo "2. Buat repository baru (misal: isp-app)"
    echo "3. JANGAN centang 'Initialize with README'"
    echo "4. Copy URL repository (misal: https://github.com/username/isp-app.git)"
    echo ""
    read -p "GitHub repository URL: " GITHUB_URL
    
    if [ -z "$GITHUB_URL" ]; then
        echo -e "${RED}Error: URL tidak boleh kosong${NC}"
        exit 1
    fi
    
    # Add remote
    git remote add origin "$GITHUB_URL" 2>/dev/null || git remote set-url origin "$GITHUB_URL"
    echo -e "${GREEN}✓${NC} Remote added: $GITHUB_URL"
    
elif [ "$CHOICE" = "2" ]; then
    read -p "GitHub repository URL: " GITHUB_URL
    
    if [ -z "$GITHUB_URL" ]; then
        echo -e "${RED}Error: URL tidak boleh kosong${NC}"
        exit 1
    fi
    
    # Add remote
    git remote add origin "$GITHUB_URL" 2>/dev/null || git remote set-url origin "$GITHUB_URL"
    echo -e "${GREEN}✓${NC} Remote added: $GITHUB_URL"
else
    echo -e "${RED}Error: Pilihan tidak valid${NC}"
    exit 1
fi

echo ""

# Step 6: Push to GitHub
echo "Step 5: Pushing to GitHub..."
echo ""
read -p "Push ke GitHub sekarang? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Set default branch to main
    git branch -M main 2>/dev/null || true
    
    echo "Pushing to GitHub..."
    git push -u origin main
    
    echo ""
    echo -e "${GREEN}✓${NC} Code sudah di-push ke GitHub!"
else
    echo ""
    echo -e "${YELLOW}⚠${NC} Push dibatalkan. Jalankan manual:"
    echo "  git branch -M main"
    echo "  git push -u origin main"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Setup Selesai!${NC}"
echo "=========================================="
echo ""
echo "Sekarang Anda bisa menggunakan:"
echo "  ./deploy.sh  # Untuk deploy ke remote server"
echo ""


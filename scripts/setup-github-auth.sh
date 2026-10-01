#!/bin/bash
# Script untuk setup GitHub authentication
# Usage: ./scripts/setup-github-auth.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  Setup GitHub Authentication"
echo "=========================================="
echo ""

# Check current remote URL
CURRENT_REMOTE=$(git remote get-url origin)
echo "Current remote: $CURRENT_REMOTE"
echo ""

# Option 1: SSH (Recommended)
echo "Option 1: Setup SSH (Recommended)"
echo "-----------------------------------"
echo "1. Generate SSH key (jika belum ada):"
echo "   ssh-keygen -t ed25519 -C 'your_email@example.com'"
echo ""
echo "2. Add SSH key to GitHub:"
echo "   cat ~/.ssh/id_ed25519.pub"
echo "   Copy output dan paste ke: https://github.com/settings/keys"
echo ""
echo "3. Update remote URL ke SSH:"
echo "   git remote set-url origin git@github.com:artreyu/isp-app.git"
echo ""

# Option 2: Personal Access Token
echo "Option 2: Personal Access Token"
echo "-----------------------------------"
echo "1. Create token di: https://github.com/settings/tokens"
echo "   - Select scopes: repo (all)"
echo ""
echo "2. Push dengan token:"
echo "   git push https://<TOKEN>@github.com/artreyu/isp-app.git main"
echo ""
echo "3. Atau configure credential helper:"
echo "   git config --global credential.helper store"
echo "   git push (akan prompt untuk username dan token)"
echo ""

read -p "Pilih metode (1=SSH, 2=Token, atau tekan Enter untuk skip): " METHOD

if [ "$METHOD" = "1" ]; then
    # Check if SSH key exists
    if [ -f ~/.ssh/id_ed25519.pub ] || [ -f ~/.ssh/id_rsa.pub ]; then
        echo ""
        echo -e "${GREEN}SSH key ditemukan:${NC}"
        if [ -f ~/.ssh/id_ed25519.pub ]; then
            cat ~/.ssh/id_ed25519.pub
        else
            cat ~/.ssh/id_rsa.pub
        fi
        echo ""
        echo "Copy key di atas dan tambahkan ke GitHub"
        read -p "Tekan Enter setelah menambahkan key ke GitHub..."
        
        # Update remote to SSH
        git remote set-url origin git@github.com:artreyu/isp-app.git
        echo -e "${GREEN}✓${NC} Remote URL updated ke SSH"
        
        # Test connection
        echo "Testing SSH connection..."
        if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
            echo -e "${GREEN}✓${NC} SSH authentication OK"
        else
            echo -e "${YELLOW}⚠${NC} SSH test failed, tapi mungkin masih OK"
        fi
    else
        echo -e "${YELLOW}SSH key tidak ditemukan${NC}"
        read -p "Generate SSH key sekarang? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Email untuk SSH key: " EMAIL
            ssh-keygen -t ed25519 -C "$EMAIL" -f ~/.ssh/id_ed25519 -N ""
            echo ""
            echo -e "${GREEN}SSH key generated:${NC}"
            cat ~/.ssh/id_ed25519.pub
            echo ""
            echo "Copy key di atas dan tambahkan ke: https://github.com/settings/keys"
            read -p "Tekan Enter setelah menambahkan key..."
            git remote set-url origin git@github.com:artreyu/isp-app.git
        fi
    fi
elif [ "$METHOD" = "2" ]; then
    echo ""
    read -p "Masukkan Personal Access Token: " TOKEN
    if [ -n "$TOKEN" ]; then
        # Update remote dengan token
        git remote set-url origin "https://${TOKEN}@github.com/artreyu/isp-app.git"
        echo -e "${GREEN}✓${NC} Remote URL updated dengan token"
        echo -e "${YELLOW}⚠${NC} Token tersimpan di Git config (bisa dilihat dengan: git remote -v)"
    fi
fi

echo ""
echo "=========================================="
echo "  Setup Selesai"
echo "=========================================="
echo ""
echo "Test push dengan:"
echo "  git push -u origin main"
echo ""

















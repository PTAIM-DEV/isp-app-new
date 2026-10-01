#!/bin/bash
# Script untuk setup firewall UFW dan fail2ban
# Usage: sudo ./scripts/setup-firewall.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Script harus dijalankan dengan sudo${NC}"
    echo "Usage: sudo ./scripts/setup-firewall.sh"
    exit 1
fi

echo "=========================================="
echo "  Setup Firewall untuk Next.js App"
echo "=========================================="
echo ""

# Step 1: Setup UFW
echo "Step 1: Setting up UFW..."
ufw --force enable
echo -e "${GREEN}✓${NC} UFW enabled"

# Allow SSH (penting! jangan sampai terkunci)
ufw allow 22/tcp comment 'SSH'
ufw allow 22022/tcp comment 'SSH Custom Port'
echo -e "${GREEN}✓${NC} SSH ports allowed"

# Allow HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
echo -e "${GREEN}✓${NC} HTTP/HTTPS allowed"

# Allow Next.js dev port (3000, 3001)
ufw allow 3000/tcp comment 'Next.js Dev'
ufw allow 3001/tcp comment 'Next.js Dev Alt'
echo -e "${GREEN}✓${NC} Next.js ports allowed"

# Allow PostgreSQL (jika perlu akses dari luar)
# ufw allow 5432/tcp comment 'PostgreSQL'

echo ""
echo "UFW Rules:"
ufw status numbered
echo ""

# Step 2: Setup fail2ban untuk Next.js
echo "Step 2: Setting up fail2ban..."
FAIL2BAN_CONFIG="/etc/fail2ban/jail.d/nextjs.conf"

cat > "$FAIL2BAN_CONFIG" << 'FAIL2BAN_EOF'
[nextjs-scanning]
enabled = true
port = http,https,3000,3001
filter = nextjs-scanning
logpath = /var/log/nextjs-access.log
maxretry = 10
findtime = 600
bantime = 3600
action = iptables-multiport[name=nextjs, port="http,https,3000,3001", protocol=tcp]

FAIL2BAN_EOF

# Create filter untuk detect scanning
FILTER_CONFIG="/etc/fail2ban/filter.d/nextjs-scanning.conf"
cat > "$FILTER_CONFIG" << 'FILTER_EOF'
[Definition]
failregex = ^.*"GET /\.(env|git|config|wp-config).*" 404.*$
            ^.*"GET /(\.env|\.git|config\.json|wp-config\.php).*" 404.*$
ignoreregex =

FILTER_EOF

# Restart fail2ban
systemctl restart fail2ban
echo -e "${GREEN}✓${NC} fail2ban configured"

echo ""
echo "=========================================="
echo -e "${GREEN}  Firewall Setup Selesai!${NC}"
echo "=========================================="
echo ""
echo "Firewall sudah dikonfigurasi untuk:"
echo "  ✓ SSH (port 22, 22022)"
echo "  ✓ HTTP/HTTPS (port 80, 443)"
echo "  ✓ Next.js (port 3000, 3001)"
echo "  ✓ fail2ban untuk auto-block scanner"
echo ""
echo "Cek status:"
echo "  sudo ufw status"
echo "  sudo fail2ban-client status"
echo ""


















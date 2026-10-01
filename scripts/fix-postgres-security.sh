#!/bin/bash
# Script untuk fix PostgreSQL security issues
# Usage: ./scripts/fix-postgres-security.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  PostgreSQL Security Fix"
echo "=========================================="
echo ""

# 1. Check current exposure
echo "Step 1: Checking current PostgreSQL exposure..."
CURRENT_BIND=$(docker ps --format "{{.Ports}}" | grep 5432 | grep -o "0.0.0.0" || echo "")
if [ -n "$CURRENT_BIND" ]; then
    echo -e "${RED}⚠ PostgreSQL currently exposed to 0.0.0.0:5432${NC}"
    echo ""
    read -p "Restart PostgreSQL dengan binding ke localhost saja? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Restarting PostgreSQL container..."
        docker-compose restart postgres
        sleep 5
        echo -e "${GREEN}✓ PostgreSQL restarted${NC}"
    fi
else
    echo -e "${GREEN}✓ PostgreSQL sudah ter-restrict ke localhost${NC}"
fi
echo ""

# 2. Generate strong password suggestion
echo "Step 2: Generate strong password..."
STRONG_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo -e "${YELLOW}Suggested strong password: ${STRONG_PASSWORD}${NC}"
echo "   (Copy password ini dan update di .env)"
echo ""

# 3. Enable logging
echo "Step 3: Enable PostgreSQL logging..."
docker exec isp-postgres psql -U postgres -c "
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_authentication_failures = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
SELECT pg_reload_conf();
" 2>&1 | grep -v "does not exist" || echo "Logging enabled"
echo -e "${GREEN}✓ Logging enabled${NC}"
echo ""

# 4. Show current attack stats
echo "Step 4: Current Attack Statistics..."
FAILED_24H=$(docker logs isp-postgres --since 24h 2>&1 | grep -i "password authentication failed" | wc -l)
echo "   Failed attempts (24h): $FAILED_24H"
echo ""

echo "=========================================="
echo -e "${GREEN}  Security Fix Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update POSTGRES_PASSWORD di .env dengan password yang kuat"
echo "2. Restart containers: docker-compose restart"
echo "3. Monitor logs: docker logs -f isp-postgres"
echo "4. Setup firewall jika perlu: sudo ufw deny 5432"
echo ""



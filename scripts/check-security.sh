#!/bin/bash
# Script untuk check security PostgreSQL dan aplikasi
# Usage: ./scripts/check-security.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Security Audit Report"
echo "=========================================="
echo ""

# 1. Check PostgreSQL exposed ports
echo "1. Checking PostgreSQL Port Exposure..."
POSTGRES_PORTS=$(docker ps --filter "name=isp-postgres" --format "{{.Ports}}" | grep 5432 || echo "")
if [ -z "$POSTGRES_PORTS" ]; then
    echo -e "${YELLOW}⚠ PostgreSQL container (isp-postgres) not found${NC}"
elif echo "$POSTGRES_PORTS" | grep -q "0.0.0.0:5432\|:::5432"; then
    echo -e "${RED}⚠ WARNING: PostgreSQL exposed to 0.0.0.0:5432${NC}"
    echo "   PostgreSQL dapat diakses dari internet!"
    echo "   Current binding: $POSTGRES_PORTS"
elif echo "$POSTGRES_PORTS" | grep -q "127.0.0.1:5432"; then
    echo -e "${GREEN}✓ PostgreSQL hanya bind ke localhost (127.0.0.1:5432)${NC}"
    echo "   PostgreSQL TIDAK dapat diakses dari internet"
    echo "   Current binding: $POSTGRES_PORTS"
else
    echo -e "${GREEN}✓ PostgreSQL tidak exposed ke internet${NC}"
    echo "   Current binding: $POSTGRES_PORTS"
fi
echo ""

# 2. Check failed authentication attempts
echo "2. Checking Failed Authentication Attempts (Last 24h)..."
FAILED_AUTH=$(docker logs isp-postgres --since 24h 2>&1 | grep -i "password authentication failed" | wc -l)
if [ "$FAILED_AUTH" -gt 10 ]; then
    echo -e "${RED}⚠ WARNING: $FAILED_AUTH failed authentication attempts in last 24h${NC}"
    
    echo "   Top usernames attempted:"
    docker logs isp-postgres --since 24h 2>&1 | grep -i "password authentication failed" | grep -oP "user \"\K[^\"]+" | sort | uniq -c | sort -rn | head -5 | while read count user; do
        echo "     - $user: $count attempts"
    done
else
    echo -e "${GREEN}✓ Only $FAILED_AUTH failed attempts (normal)${NC}"
fi
echo ""

# 3. Check database users
echo "3. Checking Database Users..."
docker exec isp-postgres psql -U postgres -c "\du" 2>&1 | grep -v "postgres" | grep -v "template" | grep -v "^---" | grep -v "Role" | grep -v "^$" || echo "   No additional users found"
echo ""

# 4. Check suspicious access logs
echo "4. Checking Application Access Logs..."
if docker exec isp-postgres psql -U postgres -d isp_app -c "SELECT COUNT(*) FROM \"AccessLog\";" 2>&1 | grep -q "does not exist"; then
    echo "   Database isp_app tidak ditemukan di container ini"
else
    SUSPICIOUS_IPS=$(docker exec isp-postgres psql -U postgres -d isp_app -t -c "SELECT ip, COUNT(*) as attempts FROM \"AccessLog\" WHERE path LIKE '%admin%' OR path LIKE '%login%' GROUP BY ip HAVING COUNT(*) > 10 ORDER BY attempts DESC LIMIT 5;" 2>&1 | grep -v "does not exist" | head -10)
    if [ -n "$SUSPICIOUS_IPS" ]; then
        echo -e "${YELLOW}   Suspicious IPs with many admin/login attempts:${NC}"
        echo "$SUSPICIOUS_IPS" | while read line; do
            echo "     $line"
        done
    else
        echo -e "${GREEN}✓ No suspicious access patterns found${NC}"
    fi
fi
echo ""

# 5. Check blacklist
echo "5. Checking Blacklist..."
BLOCKED_COUNT=$(docker exec isp-postgres psql -U postgres -d isp_app -t -c "SELECT COUNT(*) FROM \"Blacklist\";" 2>&1 | grep -v "does not exist" | tr -d ' \n' || echo "0")
if [ -n "$BLOCKED_COUNT" ] && [ "$BLOCKED_COUNT" -gt 0 ] 2>/dev/null; then
    echo -e "${YELLOW}   $BLOCKED_COUNT IPs currently blocked${NC}"
else
    echo "   No IPs blocked"
fi
echo ""

# 6. Recommendations
echo "=========================================="
echo "  Security Recommendations"
echo "=========================================="
echo ""

# Check if PostgreSQL is already secured
POSTGRES_PORTS=$(docker ps --filter "name=isp-postgres" --format "{{.Ports}}" | grep 5432 || echo "")
if echo "$POSTGRES_PORTS" | grep -q "0.0.0.0:5432\|:::5432"; then
    echo -e "1. ${RED}URGENT: Restrict PostgreSQL access${NC}"
    echo "   - Change docker-compose.yml to bind to 127.0.0.1:5432"
    echo "   - Or setup firewall to block port 5432 from internet"
    echo ""
else
    echo -e "1. ${GREEN}✓ PostgreSQL sudah ter-restrict ke localhost${NC}"
    echo ""
fi

echo "2. Enable PostgreSQL logging for failed attempts"
echo "   - Add to postgresql.conf: log_connections = on"
echo "   - Add: log_authentication_failures = on"
echo ""
echo "3. Consider using fail2ban for automatic IP blocking"
echo ""
echo "4. Change PostgreSQL password to strong password"
echo ""
echo "5. Monitor access logs regularly"
echo ""


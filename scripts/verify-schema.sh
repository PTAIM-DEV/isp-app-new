#!/bin/bash
# Script untuk verify semua schema sudah sesuai dengan Prisma schema
# Usage: ./scripts/verify-schema.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Schema Verification Report"
echo "=========================================="
echo ""

# Expected models from schema.prisma
EXPECTED_MODELS=(
    "User"
    "Installation"
    "Subscription"
    "Invoice"
    "SystemSetting"
    "Technician"
    "WhatsAppChat"
    "WhatsAppConversation"
    "AIPrompt"
    "AITokenUsage"
    "WhatsAppMessage"
    "WhatsAppOutgoing"
    "ServicePackage"
    "PaymentFlow"
    "Promo"
    "PromoUsage"
    "Province"
    "City"
    "District"
    "Village"
    "PaymentTransaction"
    "AccessLog"
    "Blacklist"
)

echo "1. Checking Tables..."
MISSING_TABLES=()
for model in "${EXPECTED_MODELS[@]}"; do
    EXISTS=$(docker exec isp-postgres psql -U postgres -d isp_app -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$model'" 2>&1 | tr -d ' \n' || echo "0")
    if [ "$EXISTS" = "1" ]; then
        echo -e "   ${GREEN}✓${NC} $model"
    else
        echo -e "   ${RED}✗${NC} $model (MISSING)"
        MISSING_TABLES+=("$model")
    fi
done

echo ""
echo "2. Checking Enums..."
EXPECTED_ENUMS=("Role" "UserStatus" "InstallStatus" "InvoiceStatus" "InvoiceType" "InvoiceCategory")
for enum in "${EXPECTED_ENUMS[@]}"; do
    EXISTS=$(docker exec isp-postgres psql -U postgres -d isp_app -tAc "SELECT 1 FROM pg_type WHERE typname = '$enum'" 2>&1 | tr -d ' \n' || echo "0")
    if [ "$EXISTS" = "1" ]; then
        echo -e "   ${GREEN}✓${NC} $enum"
    else
        echo -e "   ${RED}✗${NC} $enum (MISSING)"
    fi
done

echo ""
echo "3. Checking Key Columns..."
# Check User table important columns
USER_COLS=("selectedPackageId" "ktpImageUrl" "signatureData" "agreedToTerms" "provinceId" "cityId")
for col in "${USER_COLS[@]}"; do
    EXISTS=$(docker exec isp-postgres psql -U postgres -d isp_app -tAc "SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = '$col'" 2>&1 | tr -d ' \n' || echo "0")
    if [ "$EXISTS" = "1" ]; then
        echo -e "   ${GREEN}✓${NC} User.$col"
    else
        echo -e "   ${RED}✗${NC} User.$col (MISSING)"
    fi
done

echo ""
echo "4. Summary..."
TOTAL_TABLES=$(docker exec isp-postgres psql -U postgres -d isp_app -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'" 2>&1 | tr -d ' \n')
echo "   Total tables: $TOTAL_TABLES"
echo "   Expected tables: ${#EXPECTED_MODELS[@]}"

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo -e "   ${GREEN}✓ All tables present${NC}"
else
    echo -e "   ${RED}✗ Missing tables: ${MISSING_TABLES[*]}${NC}"
fi

echo ""
echo "=========================================="
if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo -e "${GREEN}  Schema Verification: PASSED${NC}"
    exit 0
else
    echo -e "${RED}  Schema Verification: FAILED${NC}"
    exit 1
fi



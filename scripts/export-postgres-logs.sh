#!/bin/bash
# Script untuk export PostgreSQL logs sebelum restart
# Usage: ./scripts/export-postgres-logs.sh [days_back]

DAYS_BACK=${1:-7}
OUTPUT_DIR="./logs/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$OUTPUT_DIR"

echo "Exporting PostgreSQL logs..."
echo "Days back: $DAYS_BACK"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Export all logs
echo "1. Exporting all logs..."
docker logs isp-postgres --since "${DAYS_BACK}d" > "$OUTPUT_DIR/postgres_all_${TIMESTAMP}.log" 2>&1
echo "   Saved: $OUTPUT_DIR/postgres_all_${TIMESTAMP}.log"

# Export failed authentication attempts
echo "2. Exporting failed authentication attempts..."
docker logs isp-postgres --since "${DAYS_BACK}d" 2>&1 | grep -i "password authentication failed" > "$OUTPUT_DIR/postgres_failed_auth_${TIMESTAMP}.log"
FAILED_COUNT=$(wc -l < "$OUTPUT_DIR/postgres_failed_auth_${TIMESTAMP}.log")
echo "   Saved: $OUTPUT_DIR/postgres_failed_auth_${TIMESTAMP}.log ($FAILED_COUNT attempts)"

# Export connection errors
echo "3. Exporting connection errors..."
docker logs isp-postgres --since "${DAYS_BACK}d" 2>&1 | grep -iE "fatal|error|connection" > "$OUTPUT_DIR/postgres_errors_${TIMESTAMP}.log"
ERROR_COUNT=$(wc -l < "$OUTPUT_DIR/postgres_errors_${TIMESTAMP}.log")
echo "   Saved: $OUTPUT_DIR/postgres_errors_${TIMESTAMP}.log ($ERROR_COUNT errors)"

# Summary
echo ""
echo "=========================================="
echo "  Export Summary"
echo "=========================================="
echo "Total failed auth attempts: $FAILED_COUNT"
echo "Total errors: $ERROR_COUNT"
echo ""
echo "Files saved in: $OUTPUT_DIR"
echo ""



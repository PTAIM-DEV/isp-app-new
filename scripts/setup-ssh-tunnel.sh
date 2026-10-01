#!/bin/bash
# Script untuk setup SSH tunnel ke database remote
# Usage: ./scripts/setup-ssh-tunnel.sh [start|stop|status]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Load config
if [ -f .deploy-config ]; then
    source .deploy-config
else
    echo -e "${RED}Error: .deploy-config tidak ditemukan!${NC}"
    exit 1
fi

REMOTE_HOST=${REMOTE_HOST:-sulut.fibergo.id}
REMOTE_USER=${REMOTE_USER:-gastra}
SSH_PORT=${SSH_PORT:-22}
LOCAL_PORT=${LOCAL_PORT:-5433}  # Port lokal untuk tunnel
REMOTE_DB_PORT=5432

PID_FILE="/tmp/isp-app-ssh-tunnel.pid"

function start_tunnel() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠${NC} SSH tunnel sudah berjalan (PID: $PID)"
            return
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    echo "Starting SSH tunnel..."
    echo "Local port: $LOCAL_PORT -> Remote: $REMOTE_HOST:$REMOTE_DB_PORT"
    
    ssh -f -N -L "$LOCAL_PORT:localhost:$REMOTE_DB_PORT" \
        -p "$SSH_PORT" \
        "$REMOTE_USER@$REMOTE_HOST" \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3
    
    # Get PID
    sleep 1
    PID=$(ps aux | grep "ssh.*$LOCAL_PORT:localhost:$REMOTE_DB_PORT" | grep -v grep | awk '{print $2}' | head -1)
    
    if [ -n "$PID" ]; then
        echo "$PID" > "$PID_FILE"
        echo -e "${GREEN}✓${NC} SSH tunnel started (PID: $PID)"
        echo ""
        echo "Database connection info:"
        echo "  Host: localhost"
        echo "  Port: $LOCAL_PORT"
        echo "  Database: isp_app"
        echo "  User: postgres"
        echo ""
        echo "Example connection:"
        echo "  psql -h localhost -p $LOCAL_PORT -U postgres -d isp_app"
        echo ""
        echo "To stop tunnel: ./scripts/setup-ssh-tunnel.sh stop"
    else
        echo -e "${RED}✗${NC} Failed to start SSH tunnel"
        exit 1
    fi
}

function stop_tunnel() {
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${YELLOW}⚠${NC} SSH tunnel tidak berjalan"
        return
    fi
    
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        kill "$PID"
        rm -f "$PID_FILE"
        echo -e "${GREEN}✓${NC} SSH tunnel stopped"
    else
        rm -f "$PID_FILE"
        echo -e "${YELLOW}⚠${NC} SSH tunnel sudah tidak berjalan"
    fi
}

function status_tunnel() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} SSH tunnel is running (PID: $PID)"
            echo "Local port: $LOCAL_PORT -> Remote: $REMOTE_HOST:$REMOTE_DB_PORT"
        else
            echo -e "${RED}✗${NC} SSH tunnel is not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "${RED}✗${NC} SSH tunnel is not running"
    fi
}

case "${1:-start}" in
    start)
        start_tunnel
        ;;
    stop)
        stop_tunnel
        ;;
    status)
        status_tunnel
        ;;
    *)
        echo "Usage: $0 [start|stop|status]"
        exit 1
        ;;
esac


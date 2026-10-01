#!/bin/bash

# Script untuk melihat logs dengan mudah

SERVICE=${1:-""}

if [ -z "$SERVICE" ]; then
    echo "📝 ISP App Logs"
    echo "=============="
    echo ""
    echo "Usage:"
    echo "  ./docker-logs.sh          # Semua logs"
    echo "  ./docker-logs.sh app      # Logs aplikasi"
    echo ""
    echo "Note: Worker service saat ini disabled"
    echo ""
    echo "Menampilkan semua logs (Ctrl+C untuk keluar)..."
    echo ""
    docker-compose logs -f
else
    echo "📝 Logs untuk service: $SERVICE"
    echo "======================"
    echo ""
    docker-compose logs -f "$SERVICE"
fi


#!/bin/bash

# Script untuk melihat status semua container terkait project ISP

echo "📊 ISP App Container Status"
echo "=========================="
echo ""

echo "1️⃣ Container dari docker-compose project ini:"
echo "----------------------------------------------"
docker-compose ps 2>/dev/null | grep -v "NAME" || echo "   (tidak ada)"

echo ""
echo "2️⃣ Semua container ISP (termasuk eksternal):"
echo "----------------------------------------------"
docker ps --filter "name=isp" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "   (tidak ada)"

echo ""
echo "3️⃣ Container yang sudah stopped:"
echo "---------------------------------"
docker ps -a --filter "name=isp" --filter "status=exited" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" 2>/dev/null || echo "   (tidak ada)"

echo ""
echo "4️⃣ Network yang digunakan:"
echo "--------------------------"
docker network ls --filter "name=isp" --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}" 2>/dev/null || echo "   (tidak ada)"

echo ""
echo "5️⃣ Volumes yang digunakan:"
echo "---------------------------"
docker volume ls --filter "name=isp" --format "table {{.Name}}\t{{.Driver}}" 2>/dev/null || echo "   (tidak ada)"

echo ""
echo "=========================="
echo "💡 Tips:"
echo "   - docker-compose ps     : Hanya container dari docker-compose.yml"
echo "   - docker ps -a          : Semua container di sistem"
echo "   - docker ps -a --filter 'name=isp' : Semua container dengan nama 'isp'"




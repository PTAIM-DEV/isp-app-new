#!/bin/bash

# Script untuk export Docker images untuk deployment ke remote server

set -e

echo "📦 Exporting Docker Images"
echo "=========================="
echo ""

# Check if images exist
if ! docker images | grep -q "isp-app-app"; then
    echo "❌ Image isp-app-app tidak ditemukan"
    echo "   Build dulu dengan: docker-compose build app"
    exit 1
fi

# Create export directory
EXPORT_DIR="docker-images-export"
mkdir -p "$EXPORT_DIR"

echo "🔍 Checking images..."
docker images | grep -E "isp-app|postgres:16-alpine" || true

echo ""
echo "📦 Exporting images..."

# Export app image
echo "  → Exporting isp-app-app..."
docker save isp-app-app:latest | gzip > "$EXPORT_DIR/isp-app-image.tar.gz"
echo "  ✅ isp-app-image.tar.gz created"

# Check if worker image exists
if docker images | grep -q "isp-app-worker"; then
    echo "  → Exporting isp-app-worker..."
    docker save isp-app-worker:latest | gzip > "$EXPORT_DIR/isp-app-worker-image.tar.gz"
    echo "  ✅ isp-app-worker-image.tar.gz created"
fi

# Export postgres image (optional, biasanya sudah ada di server)
if [ "$1" == "--include-postgres" ]; then
    echo "  → Exporting postgres:16-alpine..."
    docker save postgres:16-alpine | gzip > "$EXPORT_DIR/postgres-image.tar.gz"
    echo "  ✅ postgres-image.tar.gz created"
fi

echo ""
echo "📋 Creating config package..."

# Copy required config files
# Use docker-compose.prod.yml if exists (for pre-built images), otherwise use docker-compose.yml
if [ -f "docker-compose.prod.yml" ]; then
    cp docker-compose.prod.yml "$EXPORT_DIR/docker-compose.yml"
else
    cp docker-compose.yml "$EXPORT_DIR/"
fi
cp env.template "$EXPORT_DIR/"
cp -r prisma "$EXPORT_DIR/"

# Create import script for server
cat > "$EXPORT_DIR/import-images.sh" << 'EOF'
#!/bin/bash

# Script untuk import Docker images di remote server

set -e

echo "📥 Importing Docker Images"
echo "=========================="
echo ""

if [ ! -f "isp-app-image.tar.gz" ]; then
    echo "❌ File isp-app-image.tar.gz tidak ditemukan"
    exit 1
fi

echo "📦 Loading images..."
docker load < isp-app-image.tar.gz
echo "✅ isp-app-app image loaded"

if [ -f "isp-app-worker-image.tar.gz" ]; then
    docker load < isp-app-worker-image.tar.gz
    echo "✅ isp-app-worker image loaded"
fi

if [ -f "postgres-image.tar.gz" ]; then
    docker load < postgres-image.tar.gz
    echo "✅ postgres image loaded"
fi

echo ""
echo "✅ All images imported successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. cp env.template .env"
echo "   2. nano .env  # Edit dengan konfigurasi server"
echo "   3. docker-compose up -d"
echo "   4. docker-compose exec app npx prisma@6.19.0 db push"
EOF

chmod +x "$EXPORT_DIR/import-images.sh"

# Create README
cat > "$EXPORT_DIR/README.md" << 'EOF'
# Docker Images Export Package

## 📦 Contents

- `isp-app-image.tar.gz` - Main application image
- `isp-app-worker-image.tar.gz` - Worker image (if exists)
- `postgres-image.tar.gz` - PostgreSQL image (optional)
- `docker-compose.yml` - Docker Compose configuration
- `env.template` - Environment variables template
- `prisma/` - Database schema and migrations
- `import-images.sh` - Script to import images

## 🚀 Deployment Steps

### 1. Upload ke Server

```bash
scp -r docker-images-export/* user@remote-server:/path/to/isp-app/
```

### 2. Di Server: Import Images

```bash
cd /path/to/isp-app
chmod +x import-images.sh
./import-images.sh
```

### 3. Setup Environment

```bash
cp env.template .env
nano .env  # Edit dengan konfigurasi server
```

### 4. Start Containers

```bash
docker-compose up -d
```

### 5. Setup Database

```bash
docker-compose exec app npx prisma@6.19.0 db push
```

## 📊 File Sizes

Check sizes:
```bash
du -h *.tar.gz
```

## 🔄 Update Image

Jika ada update, export ulang image di local dan upload ke server:

```bash
# Di local
./export-images.sh
scp docker-images-export/isp-app-image.tar.gz user@server:/path/to/isp-app/

# Di server
docker load < isp-app-image.tar.gz
docker-compose up -d --force-recreate app
```
EOF

echo ""
echo "✅ Export completed!"
echo ""
echo "📊 File sizes:"
du -h "$EXPORT_DIR"/*.tar.gz 2>/dev/null || echo "  (no tar.gz files)"
echo ""
echo "📁 Export directory: $EXPORT_DIR/"
echo ""
echo "🚀 To upload to server:"
echo "   scp -r $EXPORT_DIR/* user@remote-server:/path/to/isp-app/"
echo ""
echo "💡 Tip: Compress entire directory for easier upload:"
echo "   tar -czf docker-images-export.tar.gz $EXPORT_DIR/"


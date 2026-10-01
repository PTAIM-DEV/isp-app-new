# 🚀 Quick Start - Docker Deployment

Panduan cepat untuk menjalankan aplikasi ISP Management System di VPS menggunakan Docker.

## Prerequisites

- Docker & Docker Compose terinstall
- Minimal 2GB RAM
- Port 3000 tersedia

## Langkah Cepat

### 1. Setup Awal (First Time)

```bash
# Copy template environment
cp env.template .env

# Edit .env dengan konfigurasi Anda
nano .env  # atau gunakan editor lain

# Jalankan setup script
./docker-setup.sh
```

**Isi file .env dengan:**
- `DATABASE_URL` - Connection string ke PostgreSQL yang sudah ada
  - Untuk PostgreSQL di host: `postgresql://user:password@host.docker.internal:5432/dbname?schema=public`
  - Untuk PostgreSQL di container lain: `postgresql://user:password@container-name:5432/dbname?schema=public`
- `XENDIT_SECRET_KEY` - dari dashboard Xendit
- `XENDIT_CALLBACK_TOKEN` - dari dashboard Xendit  
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - dari Google Cloud Console

### 2. Akses Aplikasi

Setelah setup selesai, aplikasi tersedia di:
- **Web App**: http://localhost:3000 (atau IP VPS Anda)

### 3. Management Commands

```bash
# Lihat status
docker-compose ps

# Lihat logs
./docker-logs.sh          # Semua logs
./docker-logs.sh app      # Logs aplikasi saja

# Stop aplikasi
docker-compose down

# Start aplikasi
docker-compose up -d

# Restart service
docker-compose restart app

# Update aplikasi
./docker-deploy.sh

# Backup
./docker-backup.sh
```

## Troubleshooting

### Database tidak connect
```bash
# Pastikan PostgreSQL sudah berjalan
# Test connection dari container
docker-compose exec app npx prisma db pull

# Pastikan DATABASE_URL di .env sudah benar
# Untuk PostgreSQL di host, gunakan: host.docker.internal
```

### Aplikasi tidak start
```bash
docker-compose logs app
docker-compose exec app npx prisma migrate deploy
```

### Note tentang WhatsApp Worker
```bash
# WhatsApp Worker saat ini disabled karena ada issue
# Untuk enable kembali, uncomment service worker di docker-compose.yml
```

## Production Setup

Untuk production, setup:
1. **Reverse Proxy** (Nginx) - lihat DOCKER.md
2. **SSL Certificate** (Let's Encrypt)
3. **Firewall** (buka port 80, 443, 22)
4. **Backup Schedule** (cron job)

Lihat **DOCKER.md** untuk panduan lengkap.


# Docker Deployment Guide

Panduan untuk menjalankan aplikasi ISP Management System menggunakan Docker di VPS.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Minimal 2GB RAM
- Minimal 10GB storage

## Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd isp-app
```

### 2. Setup Environment Variables

Copy file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Edit file `.env` dan isi dengan konfigurasi yang sesuai:

- `DATABASE_URL` - Connection string PostgreSQL ke database yang sudah ada
  - Untuk PostgreSQL di host: `postgresql://user:password@host.docker.internal:5432/dbname?schema=public`
  - Untuk PostgreSQL di container lain: `postgresql://user:password@container-name:5432/dbname?schema=public`
- `XENDIT_SECRET_KEY` - API key dari Xendit
- `XENDIT_CALLBACK_TOKEN` - Callback token dari Xendit
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - API key Google Maps

### 3. Build dan Jalankan

```bash
# Build images
docker-compose build

# Jalankan semua services
docker-compose up -d

# Lihat logs
docker-compose logs -f

# Lihat logs service tertentu
docker-compose logs -f app
docker-compose logs -f worker
docker-compose logs -f postgres
```

### 4. Setup Database (First Time)

**PENTING**: Pastikan PostgreSQL sudah berjalan dan database sudah dibuat sebelum menjalankan migrations.

Setelah container berjalan, jalankan migrations dan seed:

```bash
# Pastikan DATABASE_URL di .env sudah benar
# Kemudian jalankan migrations:
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx ts-node prisma/seed-payment-flows.ts
```

### 5. Akses Aplikasi

- **Web App**: http://localhost:3000 (atau IP VPS Anda)
- **PostgreSQL**: Gunakan PostgreSQL yang sudah ada (tidak di-manage oleh docker-compose)

## Services

Aplikasi terdiri dari 2 services:

1. **app** - Next.js application (port 3000)
2. **worker** - WhatsApp worker service

**Catatan**: Aplikasi menggunakan PostgreSQL yang sudah ada (tidak membuat container baru). Pastikan PostgreSQL sudah berjalan dan konfigurasi `DATABASE_URL` di file `.env` sudah benar.

## Volumes

Data persistent disimpan di volumes:

- `uploads_data` - File uploads (KTP, WhatsApp media)
- `baileys_auth_data` - WhatsApp authentication session

**Catatan**: Database PostgreSQL tidak menggunakan volume karena menggunakan PostgreSQL yang sudah ada.

## Management Commands

```bash
# Stop semua services
docker-compose down

# Stop dan hapus volumes (HATI-HATI: akan menghapus data!)
docker-compose down -v

# Restart service tertentu
docker-compose restart app
docker-compose restart worker

# Update aplikasi
git pull
docker-compose build
docker-compose up -d

# Lihat status services
docker-compose ps

# Masuk ke container
docker-compose exec app sh
docker-compose exec worker sh
docker-compose exec postgres psql -U ispuser -d ispdb
```

## Production Deployment

### 1. Setup Reverse Proxy (Nginx)

Contoh konfigurasi Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Setup SSL dengan Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Firewall

```bash
# Buka port yang diperlukan
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 4. Monitoring

Gunakan tools seperti:
- `docker stats` - Monitor resource usage
- `docker-compose logs` - Monitor logs
- Setup monitoring tools seperti Prometheus/Grafana untuk production

## Troubleshooting

### Database connection error

```bash
# Cek apakah PostgreSQL sudah berjalan (di host atau container lain)
# Test connection dari container
docker-compose exec app npx prisma db pull

# Pastikan DATABASE_URL di .env sudah benar
# Untuk PostgreSQL di host, gunakan: host.docker.internal
# Untuk PostgreSQL di container lain, gunakan nama container atau IP
```

### WhatsApp Worker tidak connect

```bash
# Cek logs worker
docker-compose logs -f worker

# Pastikan volume baileys_auth_data terpasang
docker volume inspect isp-app_baileys_auth_data

# Reset WhatsApp auth (HATI-HATI: akan logout WhatsApp)
docker-compose exec worker rm -rf /app/baileys_auth_info/*
docker-compose restart worker
```

### File uploads tidak tersimpan

```bash
# Cek volume uploads
docker volume inspect isp-app_uploads_data

# Pastikan directory permissions
docker-compose exec app ls -la /app/public/uploads
```

### Build error

```bash
# Clear build cache
docker-compose build --no-cache

# Rebuild dari awal
docker-compose down
docker-compose build
docker-compose up -d
```

## Backup & Restore

### Backup Database

```bash
# Backup PostgreSQL (sesuaikan dengan konfigurasi PostgreSQL Anda)
# Jika PostgreSQL di host:
pg_dump -U user -h localhost -d dbname > backup_$(date +%Y%m%d).sql

# Jika PostgreSQL di container lain:
docker exec container-name pg_dump -U user -d dbname > backup_$(date +%Y%m%d).sql

# Restore
psql -U user -h localhost -d dbname < backup_20250120.sql
```

### Backup Volumes

```bash
# Backup volumes aplikasi
docker run --rm -v isp-app_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup.tar.gz /data
docker run --rm -v isp-app_baileys_auth_data:/data -v $(pwd):/backup alpine tar czf /backup/baileys_backup.tar.gz /data
```

## Security Notes

1. **Ganti password default** di `.env` file
2. **Jangan expose PostgreSQL port** ke public (hapus ports di docker-compose.yml untuk production)
3. **Gunakan HTTPS** dengan reverse proxy
4. **Regular updates** untuk Docker images dan dependencies
5. **Backup rutin** database dan volumes


# Database Backup & Restore Guide

## 📋 Overview

Sistem backup otomatis untuk database PostgreSQL menggunakan cron job yang berjalan setiap hari jam 01:00 AM GMT+7 (WIB).

## 🚀 Quick Start

### Setup Cron Job

```bash
# Setup cron job untuk backup otomatis
./scripts/setup-backup-cron.sh
```

Script ini akan:
- Menambahkan cron job ke crontab
- Backup akan berjalan setiap hari jam 01:00 AM GMT+7
- Log akan tersimpan di `backups/postgres/cron.log`

### Manual Backup

```bash
# Backup database secara manual
./scripts/backup-database.sh
```

### Restore Database

```bash
# Restore dari backup
./scripts/restore-database.sh backups/postgres/isp_app_20251201_010000.sql.gz
```

---

## 📁 File Structure

```
isp-app/
├── scripts/
│   ├── backup-database.sh      # Script backup utama
│   ├── restore-database.sh      # Script restore
│   └── setup-backup-cron.sh     # Setup cron job
└── backups/
    └── postgres/
        ├── isp_app_YYYYMMDD_HHMMSS.sql.gz  # Backup files
        ├── backup.log                      # Backup log
        └── cron.log                        # Cron execution log
```

---

## ⚙️ Configuration

### Environment Variables

Script membaca konfigurasi dari `.env`:
- `POSTGRES_USER` - Database user (default: postgres)
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DB` - Database name (default: isp_app)

### Backup Settings

Edit `backup-database.sh` untuk mengubah:
- `BACKUP_DIR` - Lokasi penyimpanan backup (default: `./backups/postgres`)
- `RETENTION_DAYS` - Lama penyimpanan backup (default: 7 hari)

---

## 📅 Cron Schedule

**Schedule**: Setiap hari jam 01:00 AM GMT+7 (WIB)

**Cron Expression**: `0 1 * * *`

**Timezone**: Asia/Jakarta (GMT+7)

**Equivalent UTC**: 18:00 UTC (sehari sebelumnya)

---

## 🔍 Monitoring

### Check Backup Status

```bash
# Lihat log backup terakhir
tail -f backups/postgres/backup.log

# Lihat log cron execution
tail -f backups/postgres/cron.log

# List semua backup
ls -lh backups/postgres/*.sql.gz
```

### Check Cron Job

```bash
# Lihat cron jobs yang aktif
crontab -l

# Edit cron jobs
crontab -e
```

### Verify Backup

```bash
# Test restore backup (dry run)
gunzip -c backups/postgres/isp_app_YYYYMMDD_HHMMSS.sql.gz | head -20
```

---

## 🛠️ Troubleshooting

### Backup Gagal

**Error**: `PostgreSQL container (isp-postgres) is not running`

**Solution**:
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Atau restart container
docker-compose restart postgres
```

### Cron Job Tidak Berjalan

**Check**:
```bash
# Verify cron service running
sudo systemctl status cron

# Check cron logs
sudo tail -f /var/log/syslog | grep CRON

# Test manual execution
./scripts/backup-database.sh
```

### Backup File Tidak Ada

**Check**:
```bash
# Verify backup directory exists
ls -la backups/postgres/

# Check permissions
chmod +x scripts/backup-database.sh
```

### Disk Space Penuh

**Solution**:
```bash
# Check disk usage
df -h

# Reduce retention days (edit backup-database.sh)
RETENTION_DAYS=3  # Simpan hanya 3 hari

# Manual cleanup old backups
find backups/postgres/ -name "*.sql.gz" -mtime +7 -delete
```

---

## 📊 Backup Retention

- **Default**: 7 hari
- **Auto Cleanup**: Backup lama otomatis dihapus
- **Manual Cleanup**: Bisa diubah di script

### Change Retention

Edit `scripts/backup-database.sh`:
```bash
RETENTION_DAYS=14  # Simpan 14 hari
```

---

## 🔐 Security Notes

1. **Backup Files**: Jangan commit backup ke git (sudah di `.gitignore`)
2. **Credentials**: Backup script membaca dari `.env` (jangan commit `.env`)
3. **Permissions**: Backup files hanya bisa diakses oleh user yang membuat
4. **Remote Backup**: Pertimbangkan untuk copy backup ke remote storage

---

## 📦 Backup Format

- **Format**: SQL dump (gzip compressed)
- **Naming**: `isp_app_YYYYMMDD_HHMMSS.sql.gz`
- **Example**: `isp_app_20251201_010000.sql.gz`

### Backup Contents

- All tables and data
- Schema definitions
- Indexes and constraints
- **NOT included**: `_prisma_migrations` table (akan di-recreate saat restore)

---

## 🔄 Restore Process

### Full Restore

```bash
# 1. Stop application (optional)
docker-compose stop app

# 2. Restore database
./scripts/restore-database.sh backups/postgres/isp_app_20251201_010000.sql.gz

# 3. Run Prisma migrations (auto dalam script)
# Script akan otomatis run: npx prisma migrate deploy

# 4. Restart application
docker-compose start app
```

### Partial Restore (Single Table)

```bash
# Extract specific table from backup
gunzip -c backups/postgres/isp_app_YYYYMMDD_HHMMSS.sql.gz | \
  grep -A 1000 "COPY public.User" | \
  docker exec -i isp-postgres psql -U postgres -d isp_app
```

---

## 📈 Best Practices

1. **Regular Testing**: Test restore secara berkala
2. **Monitor Disk Space**: Pastikan cukup space untuk backup
3. **Remote Backup**: Copy backup ke server lain atau cloud storage
4. **Verify Backups**: Check backup file integrity secara berkala
5. **Documentation**: Catat lokasi backup dan prosedur restore

---

## 🚨 Emergency Restore

Jika database corrupt atau hilang:

```bash
# 1. Stop application
docker-compose stop app

# 2. Drop and recreate database
docker exec isp-postgres psql -U postgres -c "DROP DATABASE IF EXISTS isp_app;"
docker exec isp-postgres psql -U postgres -c "CREATE DATABASE isp_app;"

# 3. Restore from latest backup
./scripts/restore-database.sh backups/postgres/isp_app_YYYYMMDD_HHMMSS.sql.gz

# 4. Verify restore
docker exec isp-postgres psql -U postgres -d isp_app -c "\dt"

# 5. Start application
docker-compose start app
```

---

## 📝 Logs

### Backup Log

Location: `backups/postgres/backup.log`

Format:
```
[YYYY-MM-DD HH:MM:SS] Message
```

### Cron Log

Location: `backups/postgres/cron.log`

Contains: Output dari setiap cron execution

---

## 🔗 Related Scripts

- `scripts/init-database.sh` - Initialize database
- `scripts/verify-schema.sh` - Verify schema completeness
- `scripts/check-security.sh` - Security audit

---

**Last Updated**: 2025-12-01  
**Maintainer**: System Admin



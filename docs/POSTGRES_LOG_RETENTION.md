# PostgreSQL Log Retention & Backup

## ⚠️ Status Log Saat Ini

**Masalah**: Setelah restart container, log lama dari hari sebelumnya **TIDAK TERSEDIA**.

### Kenapa Log Hilang?

1. **Docker Log Driver**: Default menggunakan `json-file` tanpa retention policy
2. **Container Restart**: Log hanya tersimpan sejak container terakhir dibuat/restart
3. **No Log Rotation**: Tidak ada konfigurasi untuk menyimpan log lama

### Container Info
- **Created**: 2025-12-01T13:24:46 (setelah restart terakhir)
- **Logs Available**: Hanya dari tanggal ini ke depan
- **Logs Missing**: Semua log sebelum restart

---

## ✅ Solusi: Setup Log Retention

### Opsi 1: Konfigurasi Log Rotation di Docker Compose (RECOMMENDED)

Tambahkan logging configuration di `docker-compose.yml`:

```yaml
services:
  postgres:
    # ... existing config ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"      # Rotate setelah 10MB
        max-file: "7"        # Simpan 7 file (7 hari)
        compress: "true"     # Compress log lama
```

**Keuntungan**:
- ✅ Log otomatis di-rotate
- ✅ Log lama tersimpan (7 hari)
- ✅ Compressed untuk hemat space
- ✅ Tidak perlu manual backup

### Opsi 2: Export Log Secara Berkala

Gunakan script `export-postgres-logs.sh`:

```bash
# Export log 7 hari terakhir
./scripts/export-postgres-logs.sh 7

# Export log 30 hari terakhir
./scripts/export-postgres-logs.sh 30
```

**Output**: Log tersimpan di `./logs/postgres/`

### Opsi 3: PostgreSQL Native Logging

Setup PostgreSQL untuk log ke file di volume:

```yaml
services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - postgres_logs:/var/log/postgresql  # Tambah volume untuk logs
    command: >
      postgres
      -c log_destination=stderr,file
      -c logging_collector=on
      -c log_directory=/var/log/postgresql
      -c log_filename=postgresql-%Y-%m-%d.log
      -c log_rotation_age=1d
      -c log_rotation_size=100MB
```

**Keuntungan**:
- ✅ Log tersimpan di volume (persistent)
- ✅ Log rotation otomatis
- ✅ Bisa diakses bahkan setelah container restart

---

## 📋 Rekomendasi Implementasi

### Langkah 1: Update docker-compose.yml

```yaml
postgres:
  image: postgres:16-alpine
  container_name: isp-postgres
  restart: unless-stopped
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-postgres}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
    POSTGRES_DB: ${POSTGRES_DB:-isp_app}
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"
  logging:                    # ← TAMBAH INI
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "7"
      compress: "true"
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Langkah 2: Restart Container

```bash
docker-compose down postgres
docker-compose up -d postgres
```

### Langkah 3: Setup Cron untuk Backup Log (Opsional)

```bash
# Tambah ke crontab
0 2 * * * /home/gastra/projects/isp-app/scripts/export-postgres-logs.sh 7
```

---

## 🔍 Cara Akses Log

### Log Real-time
```bash
docker logs -f isp-postgres
```

### Log dengan Filter
```bash
# Failed authentication
docker logs isp-postgres --since 24h | grep "password authentication failed"

# Errors only
docker logs isp-postgres --since 24h | grep -i "error\|fatal"

# Specific date range
docker logs isp-postgres --since "2025-12-01T00:00:00" --until "2025-12-02T00:00:00"
```

### Export Log
```bash
# Export semua log
docker logs isp-postgres --since 7d > postgres_logs_$(date +%Y%m%d).log

# Export failed auth attempts
docker logs isp-postgres --since 7d | grep "password authentication failed" > failed_auth_$(date +%Y%m%d).log
```

---

## 📊 Log Retention Policy

| Method | Retention | Space | Setup |
|--------|-----------|-------|-------|
| Docker json-file (default) | Sampai restart | Minimal | Otomatis |
| Docker json-file + rotation | 7 hari (configurable) | Sedang | Easy |
| PostgreSQL file logging | Unlimited | Besar | Medium |
| Manual export script | Sesuai backup | Besar | Easy |

---

## ⚠️ Catatan Penting

1. **Log dari hari kemarin sudah hilang** - tidak bisa di-recover
2. **Setup log rotation sekarang** untuk mencegah kehilangan log di masa depan
3. **Regular backup** log penting untuk audit dan security monitoring
4. **Monitor disk space** jika menggunakan file logging

---

**Last Updated**: 2025-12-01  
**Next Action**: Implement log rotation di docker-compose.yml



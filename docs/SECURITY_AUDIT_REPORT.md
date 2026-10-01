# Security Audit Report - PostgreSQL Attack Detection

**Tanggal**: 2025-11-23  
**Status**: ⚠️ **SERANGAN BRUTE FORCE DETECTED**

---

## 🚨 Temuan Kritis

### 1. PostgreSQL Exposed ke Internet
- **Port**: `0.0.0.0:5432` (EXPOSED)
- **Status**: ⚠️ **SANGAT BERISIKO**
- PostgreSQL dapat diakses langsung dari internet tanpa firewall protection

### 2. Brute Force Attack Terdeteksi
- **Total Failed Attempts (24h)**: **303 attempts**
- **Pattern**: Serangan terjadi setiap ~5 menit
- **Status**: ⚠️ **AKTIF**

#### Username yang Dicoba:
| Username | Attempts | Status |
|----------|----------|--------|
| `pgadmin` | 115 | ❌ Failed |
| `postgre` | 110 | ❌ Failed |
| `pgsql` | 70 | ❌ Failed |
| `postgres` | 59 | ❌ Failed |
| `postgres1` | 14 | ❌ Failed |
| `pguser` | 4 | ❌ Failed |
| `pgbouncer` | 4 | ❌ Failed |
| `pgsql123` | 2 | ❌ Failed |
| `постгрес` (Cyrillic) | 2 | ❌ Failed |
| `postgresql` | 2 | ❌ Failed |

**Total**: 382 failed attempts dengan berbagai username

### 3. Timeline Serangan
- Serangan terjadi setiap ~5 menit secara konsisten
- Terakhir terdeteksi: 2025-12-01 13:16 UTC
- Pattern menunjukkan automated bot attack

---

## 📊 Analisis Serangan

### Karakteristik Serangan:
1. **Automated Bot**: Pattern yang konsisten setiap 5 menit
2. **Common Username Dictionary**: Menggunakan username umum PostgreSQL
3. **Persistent**: Serangan terus berlanjut meskipun gagal
4. **Multi-username**: Mencoba berbagai variasi username

### Target:
- Port 5432 (PostgreSQL default port)
- Username umum: postgres, pgadmin, pgsql, dll
- Password brute force (tidak terlihat di log, tapi kemungkinan besar)

---

## ✅ Status Keamanan Saat Ini

### Yang Sudah Baik:
- ✅ Semua authentication attempts **GAGAL**
- ✅ Password tidak ter-compromise (belum ada successful login)
- ✅ Database masih aman

### Yang Perlu Diperbaiki:
- ❌ PostgreSQL exposed ke internet
- ❌ Tidak ada rate limiting
- ❌ Tidak ada automatic IP blocking
- ❌ Password mungkin terlalu lemah (perlu dicek)

---

## 🔒 Rekomendasi Perbaikan URGENT

### 1. **SEGERA**: Restrict PostgreSQL Access (PRIORITAS TINGGI)

**Opsi A: Bind ke localhost saja**
```yaml
# docker-compose.yml
postgres:
  ports:
    - "127.0.0.1:5432:5432"  # Hanya localhost
```

**Opsi B: Setup Firewall**
```bash
# Block port 5432 dari internet
sudo ufw deny 5432
# Atau
sudo iptables -A INPUT -p tcp --dport 5432 -s ! 127.0.0.1 -j DROP
```

**Opsi C: Gunakan SSH Tunnel** (RECOMMENDED)
- Akses PostgreSQL hanya via SSH tunnel
- Tidak perlu expose port ke internet

### 2. **SEGERA**: Change PostgreSQL Password
```bash
# Generate strong password
openssl rand -base64 32

# Update di .env
POSTGRES_PASSWORD=<strong-password>

# Update password di database
docker exec -it isp-postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'new-strong-password';"
```

### 3. Enable PostgreSQL Logging
```bash
# Edit postgresql.conf atau via docker
docker exec -it isp-postgres psql -U postgres -c "
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_authentication_failures = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
SELECT pg_reload_conf();
"
```

### 4. Setup Fail2Ban (Automatic IP Blocking)
```bash
# Install fail2ban
sudo apt install fail2ban

# Create filter untuk PostgreSQL
sudo nano /etc/fail2ban/filter.d/postgresql.conf
```

### 5. Monitor Access Logs
- Setup alert untuk failed attempts > 10 per IP
- Regular review access logs
- Monitor untuk pattern yang mencurigakan

---

## 📋 Checklist Tindakan

- [ ] **URGENT**: Restrict PostgreSQL port ke localhost atau setup firewall
- [ ] **URGENT**: Change PostgreSQL password ke strong password
- [ ] Enable PostgreSQL logging untuk failed attempts
- [ ] Setup fail2ban untuk automatic IP blocking
- [ ] Review dan monitor access logs secara berkala
- [ ] Setup alert untuk failed authentication attempts
- [ ] Backup database sebelum perubahan besar
- [ ] Document security procedures

---

## 🔍 Monitoring Commands

### Check Failed Attempts:
```bash
docker logs isp-postgres --since 24h | grep "password authentication failed" | wc -l
```

### Check Top Usernames Attempted:
```bash
docker logs isp-postgres --since 24h | grep "password authentication failed" | grep -oP "user \"\K[^\"]+" | sort | uniq -c | sort -rn
```

### Check Connection Sources:
```bash
docker logs isp-postgres | grep "connection from" | tail -20
```

### Run Security Check Script:
```bash
./scripts/check-security.sh
```

---

## 📝 Notes

- Serangan masih aktif dan terus berlanjut
- Semua attempts gagal (password tidak ter-compromise)
- Perlu action segera untuk mencegah successful breach
- Consider menggunakan VPN atau SSH tunnel untuk akses remote

---

**Last Updated**: 2025-11-23  
**Next Review**: Setelah implementasi perbaikan


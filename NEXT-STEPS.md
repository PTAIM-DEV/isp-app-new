# Next Steps - Setup Deployment

Setelah push ke GitHub, ikuti langkah-langkah berikut:

## ✅ Checklist Setup

### 1. Verifikasi GitHub Repository
- [ ] Code sudah di-push ke GitHub
- [ ] Repository URL sudah benar
- [ ] Branch yang digunakan: `main`

### 2. Setup di Remote Server

#### A. Clone Repository di Remote Server
```bash
# SSH ke remote server
ssh -p 22022 gastra@sulut.fibergo.id

# Clone repository (jika belum ada)
cd /home/gastra/projects
git clone <your-github-repo-url> isp-app
cd isp-app

# Atau jika sudah ada, pull latest code
cd /home/gastra/projects/isp-app
git pull origin main
```

#### B. Setup Scripts di Remote Server
```bash
# Pastikan semua script executable
chmod +x deploy.sh backup-db.sh sync-db.sh restore-db-only.sh webhook-deploy.sh
chmod +x scripts/*.sh

# Copy .deploy-config dari local (atau buat manual)
# Edit sesuai kebutuhan remote server
nano .deploy-config
```

#### C. Setup Database di Remote Server
```bash
# Pastikan PostgreSQL container berjalan
docker compose up -d postgres

# Restore database dari backup (jika ada)
./restore-db-only.sh
```

### 3. Test Deployment dari Server Rumah

```bash
# Test koneksi SSH dulu
ssh -p 22022 gastra@sulut.fibergo.id "echo 'SSH OK'"

# Test backup database lokal
./backup-db.sh

# Test deploy pertama kali
./deploy.sh
```

### 4. Setup Auto-Deploy (Opsional - Nanti)

Setelah deployment manual berjalan dengan baik, baru setup webhook:

```bash
# Di remote server
npm install express crypto
npm install -g pm2

# Setup webhook server
export WEBHOOK_SECRET="your-secret-key"
pm2 start scripts/webhook-server.js --name webhook-deploy
pm2 save
```

## 🚀 Quick Start Commands

### Deploy dari Server Rumah
```bash
./deploy.sh
```

### Sync dari Remote ke Local
```bash
./sync-from-remote.sh
```

### Setup SSH Tunnel (untuk kerja dari laptop)
```bash
./scripts/setup-ssh-tunnel.sh start
```

## 📝 Notes

- SSH Port: 22022 (sudah di-set di .deploy-config)
- Pastikan firewall remote server mengizinkan port 22022
- Database akan di-overwrite saat sync (backup dulu jika ada data penting)


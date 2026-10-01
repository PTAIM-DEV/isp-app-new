# Deployment Guide

Dokumentasi untuk deployment workflow antara server rumah dan remote server.

## 📋 Prerequisites

- Git & GitHub repository sudah setup
- SSH access ke remote server sudah dikonfigurasi
- Docker & Docker Compose sudah terinstall di kedua server

## 🚀 Quick Start

### 1. Setup Awal

```bash
# Buat file konfigurasi (sudah dibuat)
# Edit .deploy-config jika perlu

# Berikan permission execute pada script
chmod +x deploy.sh backup-db.sh sync-db.sh restore-db-only.sh
chmod +x scripts/*.sh
```

### 2. Deploy dari Server Rumah

```bash
# Deploy lengkap (backup DB + git push + sync + restart)
./deploy.sh

# Deploy tanpa backup database
./deploy.sh --skip-backup

# Deploy tanpa git push (jika sudah push manual)
./deploy.sh --skip-git
```

### 3. Deploy dari Laptop (di luar rumah)

```bash
# Option A: Via SSH ke server rumah
git add .
git commit -m "Update feature"
git push origin main
ssh user@home-server "cd /path/to/isp-app && ./deploy.sh"

# Option B: Deploy langsung ke remote (skip backup local)
git add .
git commit -m "Update feature"
git push origin main
./deploy.sh --remote-only
```

## 📁 File Structure

```
isp-app/
├── deploy.sh                    # Main deployment script
├── backup-db.sh                 # Backup database lokal
├── sync-db.sh                   # Sync database ke remote
├── restore-db-only.sh           # Restore database di remote
├── .deploy-config               # Deployment configuration
├── scripts/
│   ├── setup-ssh-tunnel.sh     # Setup SSH tunnel untuk database
│   ├── setup-webhook.sh         # Setup GitHub webhook
│   └── webhook-server.js        # Webhook server (Node.js)
└── db/
    └── isp_app_backup.dump      # Database backup
```

## 🔧 Configuration

Edit file `.deploy-config` untuk mengubah konfigurasi:

```bash
REMOTE_HOST=sulut.fibergo.id
REMOTE_USER=gastra
REMOTE_PATH=/home/gastra/projects/isp-app
GITHUB_BRANCH=main
```

## 💻 Kerja dari Laptop

### Setup SSH Tunnel untuk Database

```bash
# Start SSH tunnel
./scripts/setup-ssh-tunnel.sh start

# Status tunnel
./scripts/setup-ssh-tunnel.sh status

# Stop tunnel
./scripts/setup-ssh-tunnel.sh stop
```

Setelah tunnel aktif, koneksi database:
- Host: `localhost`
- Port: `5433` (default)
- Database: `isp_app`
- User: `postgres`

### Update .env di Laptop

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5433/isp_app?schema=public"
```

## 🔄 Auto-Deploy via GitHub Webhook

### Setup di Remote Server

1. Install dependencies:
```bash
npm install express crypto
npm install -g pm2
```

2. Setup webhook server:
```bash
# Edit scripts/webhook-server.js, set SECRET
export WEBHOOK_SECRET="your-secret-key"
export WEBHOOK_PORT=9000

# Start dengan PM2
pm2 start scripts/webhook-server.js --name webhook-deploy
pm2 save
pm2 startup
```

3. Setup GitHub Webhook:
   - Buka GitHub repo > Settings > Webhooks > Add webhook
   - Payload URL: `http://sulut.fibergo.id:9000/webhook`
   - Content type: `application/json`
   - Secret: (sama dengan WEBHOOK_SECRET)
   - Events: `Just the push event`

4. Test webhook:
```bash
curl http://sulut.fibergo.id:9000/health
```

## 📝 Workflow Detail

### Dari Server Rumah

1. Development & testing
2. `./deploy.sh` → otomatis:
   - Backup database lokal
   - Git commit & push (jika ada perubahan)
   - Pull code di remote dari GitHub
   - Sync database ke remote
   - Restart services di remote

### Dari Laptop

1. Development
2. Git commit & push
3. `./deploy.sh --remote-only` → otomatis:
   - Pull code di remote dari GitHub
   - Sync database (jika ada backup baru)
   - Restart services di remote

### Auto-Deploy (via Webhook)

1. Push ke GitHub
2. GitHub webhook trigger
3. Remote server otomatis:
   - Pull latest code
   - Restore database (jika ada backup baru)
   - Restart services

## 🔍 Troubleshooting

### Database sync gagal
```bash
# Cek koneksi SSH
ssh gastra@sulut.fibergo.id

# Cek file backup ada di remote
ssh gastra@sulut.fibergo.id "ls -lh /home/gastra/projects/isp-app/db/"

# Manual restore
ssh gastra@sulut.fibergo.id "cd /home/gastra/projects/isp-app && ./restore-db-only.sh"
```

### Git push gagal
```bash
# Cek remote repository
git remote -v

# Manual push
git push origin main
```

### Webhook tidak trigger
```bash
# Cek webhook server running
pm2 list
pm2 logs webhook-deploy

# Test webhook manual
curl -X POST http://sulut.fibergo.id:9000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"ref":"refs/heads/main"}'
```

## 📌 Tips

1. **Selalu backup sebelum deploy** jika ada data penting
2. **Test di local dulu** sebelum deploy ke production
3. **Monitor logs** setelah deploy: `docker compose logs app`
4. **Gunakan Git branches** untuk testing sebelum merge ke main
5. **Setup monitoring** untuk webhook server (PM2 monitoring)

## 🔐 Security Notes

- Jangan commit file `.deploy-config` ke Git (sudah di .gitignore)
- Gunakan SSH key authentication (jangan password)
- Set webhook secret yang kuat
- Restrict webhook endpoint dengan firewall jika perlu
- Gunakan HTTPS untuk webhook jika memungkinkan


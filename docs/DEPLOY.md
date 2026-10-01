# 🚀 Deployment Guide - ISP App ke Remote Server

## 📦 Opsi Deployment

### Opsi 1: Export/Import Docker Image (Recommended untuk VPS)
**Keuntungan:**
- ✅ Tidak perlu build di server (lebih cepat)
- ✅ Menghemat bandwidth (hanya upload image, bukan source code)
- ✅ Tidak perlu install Node.js di server
- ✅ Build sudah di-test di local

**Kekurangan:**
- ⚠️ Image file bisa besar (1-2GB)
- ⚠️ Perlu upload image setiap kali ada perubahan

### Opsi 2: Upload Source Code + Build di Server
**Keuntungan:**
- ✅ File lebih kecil (source code saja)
- ✅ Mudah update (git pull + rebuild)

**Kekurangan:**
- ⚠️ Perlu waktu build di server
- ⚠️ Perlu upload semua source code
- ⚠️ Server perlu resource untuk build

---

## 🚀 Opsi 1: Export/Import Docker Image

### Step 1: Build Image di Local

```bash
# Build image
docker-compose build app

# (Optional) Build worker jika diperlukan
docker-compose build worker
```

### Step 2: Export Image ke File

```bash
# Export image aplikasi
docker save isp-app-app:latest | gzip > isp-app-image.tar.gz

# (Optional) Export postgres image jika belum ada di server
docker save postgres:16-alpine | gzip > postgres-image.tar.gz
```

### Step 3: Upload ke Remote Server

```bash
# Upload image aplikasi
scp isp-app-image.tar.gz user@remote-server:/path/to/isp-app/

# (Optional) Upload postgres image
scp postgres-image.tar.gz user@remote-server:/path/to/isp-app/
```

### Step 4: Import Image di Remote Server

```bash
# SSH ke server
ssh user@remote-server

# Import image aplikasi
docker load < isp-app-image.tar.gz

# (Optional) Import postgres image
docker load < postgres-image.tar.gz
```

### Step 5: Upload File Konfigurasi

**File yang tetap perlu di-upload:**
```
✅ docker-compose.yml
✅ .env (atau env.template)
✅ prisma/schema.prisma
✅ prisma/migrations/ (jika ada migration baru)
```

**Upload file konfigurasi:**
```bash
scp docker-compose.yml user@remote-server:/path/to/isp-app/
scp env.template user@remote-server:/path/to/isp-app/
scp -r prisma/ user@remote-server:/path/to/isp-app/
```

### Step 6: Setup di Server

```bash
# Buat .env
cp env.template .env
nano .env

# Start containers (akan menggunakan image yang sudah di-import)
docker-compose up -d

# Setup database
docker-compose exec app npx prisma@6.19.0 db push
```

---

## 📝 Opsi 2: Upload Source Code + Build di Server

### File yang Perlu Di-Upload

```
✅ docker-compose.yml
✅ Dockerfile
✅ Dockerfile.worker
✅ .dockerignore
✅ env.template
✅ package.json
✅ package-lock.json
✅ next.config.js
✅ tsconfig.json
✅ prisma/ (seluruh folder)
✅ app/ (seluruh folder)
✅ components/ (seluruh folder)
✅ lib/ (seluruh folder)
✅ public/ (seluruh folder)
```

### Setup di Server

```bash
# Upload semua file (gunakan Git atau SCP)
git clone <repo-url> isp-app
# atau
scp -r * user@remote-server:/path/to/isp-app/

# Di server
cd isp-app
cp env.template .env
nano .env

# Build dan start
docker-compose build
docker-compose up -d

# Setup database
docker-compose exec app npx prisma@6.19.0 db push
```

---

## 🔄 Update Aplikasi

### Jika Menggunakan Image Export (Opsi 1)

```bash
# Di local: Build ulang dan export
docker-compose build app
docker save isp-app-app:latest | gzip > isp-app-image.tar.gz

# Upload ke server
scp isp-app-image.tar.gz user@remote-server:/path/to/isp-app/

# Di server: Import dan restart
docker load < isp-app-image.tar.gz
docker-compose up -d --force-recreate app
```

### Jika Menggunakan Source Code (Opsi 2)

```bash
# Di server: Pull update dan rebuild
git pull
docker-compose build app
docker-compose up -d

# Run migrations jika ada
docker-compose exec app npx prisma@6.19.0 migrate deploy
```

---

## 💡 Rekomendasi

**Gunakan Opsi 1 (Export Image) jika:**
- ✅ Server VPS dengan resource terbatas
- ✅ Koneksi internet server lambat
- ✅ Tidak ingin expose source code ke server
- ✅ Ingin deployment cepat

**Gunakan Opsi 2 (Source Code) jika:**
- ✅ Server memiliki resource cukup
- ✅ Ingin mudah update dengan Git
- ✅ Perlu customisasi di server
- ✅ Development/staging environment

---

## 📊 Perbandingan Ukuran File

```
Export Image:        ~1-2 GB (compressed: ~500MB-1GB)
Source Code:         ~50-100 MB (tanpa node_modules)
Source Code + Build: ~500MB-1GB (setelah build)
```

---

## 🔒 Security Notes

- Jangan commit `.env` ke Git
- Gunakan password kuat untuk PostgreSQL
- Setup firewall di server
- Gunakan HTTPS dengan reverse proxy
- Backup database secara berkala

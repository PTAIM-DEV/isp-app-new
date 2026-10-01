# 📤 Panduan Upload ke Remote Server

## ⚠️ JANGAN Gunakan `scp *` atau `scp -r *`

Menggunakan `scp *` akan meng-upload **SEMUA** file termasuk:
- ❌ `node_modules/` (770 MB, 31,000+ file)
- ❌ `.next/` (build artifacts)
- ❌ `.git/` (git history)
- ❌ File-file tidak perlu lainnya

**Hasilnya:** Upload sangat lambat dan boros bandwidth!

---

## ✅ Cara yang Benar

### Opsi 1: Gunakan Script `upload-to-server.sh` (Recommended)

```bash
# Berikan permission execute
chmod +x upload-to-server.sh

# Upload ke server
./upload-to-server.sh user@remote-server:/path/to/isp-app

# Contoh:
./upload-to-server.sh root@192.168.1.100:/opt/isp-app
```

**Script ini akan:**
- ✅ Exclude `node_modules`, `.next`, `.git`, dll
- ✅ Menggunakan `rsync` jika tersedia (lebih cepat)
- ✅ Menampilkan progress bar
- ✅ Hanya upload file yang diperlukan

---

### Opsi 2: Manual dengan rsync (Recommended jika rsync tersedia)

```bash
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'build' \
    --exclude 'docker-images-export' \
    --exclude 'baileys_auth_info' \
    --exclude 'public/uploads' \
    --exclude '*.log' \
    ./ user@remote-server:/path/to/isp-app/
```

**Keuntungan rsync:**
- ✅ Hanya upload file yang berubah (incremental)
- ✅ Lebih cepat dari scp
- ✅ Progress bar
- ✅ Resume jika terputus

---

### Opsi 3: Manual dengan tar + scp

```bash
# Buat archive (exclude file tidak perlu)
tar -czf isp-app-source.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='docker-images-export' \
    --exclude='baileys_auth_info' \
    --exclude='public/uploads' \
    --exclude='*.log' \
    .

# Upload archive
scp isp-app-source.tar.gz user@remote-server:/path/to/isp-app/

# Di server: Extract
ssh user@remote-server
cd /path/to/isp-app
tar -xzf isp-app-source.tar.gz
rm isp-app-source.tar.gz
```

---

### Opsi 4: Upload File Spesifik Saja

```bash
# Upload hanya file yang diperlukan
scp docker-compose.yml Dockerfile Dockerfile.worker .dockerignore env.template package.json package-lock.json next.config.ts tsconfig.json user@remote-server:/path/to/isp-app/

# Upload folder (exclude node_modules)
scp -r app/ components/ lib/ prisma/ public/ user@remote-server:/path/to/isp-app/
```

---

## 📋 File yang PERLU Di-Upload

### ✅ File Wajib (Root)
```
docker-compose.yml
Dockerfile
Dockerfile.worker
.dockerignore
env.template
package.json
package-lock.json
next.config.ts (atau .js)
tsconfig.json
```

### ✅ Folder Wajib
```
app/              (seluruh folder)
components/       (seluruh folder)
lib/              (seluruh folder)
prisma/           (seluruh folder)
public/           (seluruh folder, tapi exclude uploads/)
```

### 📝 File Opsional
```
docs/             (dokumentasi)
scripts/          (helper scripts)
*.sh              (deployment scripts)
```

---

## ❌ File yang TIDAK Perlu Di-Upload

```
node_modules/     ❌ (akan di-build di Docker)
.next/            ❌ (akan di-build di Docker)
.git/             ❌ (opsional, tidak diperlukan)
dist/             ❌ (build artifacts)
build/            ❌ (build artifacts)
docker-images-export/  ❌ (temporary)
baileys_auth_info/     ❌ (akan dibuat di container)
public/uploads/        ❌ (akan dibuat di container)
*.log             ❌ (log files)
.DS_Store         ❌ (macOS)
.env.local        ❌ (buat .env baru di server)
```

---

## 🚀 Setup di Server Setelah Upload

```bash
# 1. SSH ke server
ssh user@remote-server

# 2. Masuk ke direktori
cd /path/to/isp-app

# 3. Setup environment
cp env.template .env
nano .env  # Edit dengan konfigurasi server

# 4. Build Docker images
docker-compose build

# 5. Start containers
docker-compose up -d

# 6. Setup database
docker-compose exec app npx prisma@6.19.0 db push
```

---

## 📊 Perbandingan Ukuran

```
scp * (salah):           ~875 MB (termasuk node_modules)
rsync (benar):           ~50-100 MB (source code saja)
tar.gz (benar):          ~20-50 MB (compressed)
```

---

## 💡 Tips

1. **Gunakan rsync** jika tersedia (lebih cepat dan efisien)
2. **Gunakan script** `upload-to-server.sh` untuk kemudahan
3. **Jangan upload** `node_modules` - Docker akan build sendiri
4. **Gunakan Git** jika memungkinkan (lebih mudah update)
5. **Pertimbangkan Opsi 1** (Export Image) untuk deployment pertama

---

## 🔄 Update Aplikasi

### Jika Menggunakan rsync:
```bash
# Hanya upload file yang berubah
./upload-to-server.sh user@server:/path/to/isp-app

# Di server: Rebuild dan restart
docker-compose build app
docker-compose up -d
```

### Jika Menggunakan Git:
```bash
# Di server
git pull
docker-compose build app
docker-compose up -d
```



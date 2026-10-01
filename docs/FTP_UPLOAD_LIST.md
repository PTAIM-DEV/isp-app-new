# 📋 Daftar File untuk Upload ke Remote Server

## Opsi 1: Upload Docker Image (Recommended)

**File yang perlu di-upload:**
```
✅ docker-images-export/
   ├── isp-app-image.tar.gz      (Docker image aplikasi)
   ├── docker-compose.yml         (Konfigurasi Docker)
   ├── env.template               (Template environment variables)
   ├── prisma/                    (Database schema & migrations)
   └── import-images.sh           (Script import images)
```

**Cara:**
```bash
# Di local: Export images
./export-images.sh

# Upload ke server
scp -r docker-images-export/* user@server:/path/to/isp-app/
```

---

## Opsi 2: Upload Source Code

**File yang perlu di-upload:**

### ✅ File Wajib (Root Directory)
```
docker-compose.yml
Dockerfile
Dockerfile.worker
.dockerignore
env.template
package.json
package-lock.json
next.config.js (atau next.config.ts)
tsconfig.json
```

### ✅ Folder Wajib
```
prisma/          (seluruh folder beserta isinya)
app/              (seluruh folder beserta isinya)
components/       (seluruh folder beserta isinya)
lib/              (seluruh folder beserta isinya)
public/           (seluruh folder beserta isinya)
```

### 📝 File Opsional
```
docker-setup.sh
docker-deploy.sh
docker-status.sh
docker-logs.sh
```

### ❌ Jangan Upload
```
node_modules/     (akan di-build di Docker)
.next/            (akan di-build di Docker)
.env.local        (buat .env baru di server)
*.log             (log files)
.git/             (opsional)
```

---

## 📝 Setup di Server

### Jika Menggunakan Image Export (Opsi 1)

```bash
# 1. Import images
./import-images.sh

# 2. Setup environment
cp env.template .env
nano .env

# 3. Start containers
docker-compose up -d

# 4. Setup database
docker-compose exec app npx prisma@6.19.0 db push
```

### Jika Menggunakan Source Code (Opsi 2)

```bash
# 1. Setup environment
cp env.template .env
nano .env

# 2. Build dan start
docker-compose build
docker-compose up -d

# 3. Setup database
docker-compose exec app npx prisma@6.19.0 db push
```




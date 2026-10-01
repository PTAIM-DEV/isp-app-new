# Prisma Schema Synchronization

## ✅ Yang Di-Sync via Git

### 1. **Prisma Schema** (`prisma/schema.prisma`)
- ✅ Struktur database (tables, columns, relations)
- ✅ Types dan enums
- ✅ Indexes dan constraints
- ✅ Semua perubahan schema akan otomatis di-sync ke remote

### 2. **Migration Files** (`prisma/migrations/`)
- ✅ Semua file migration SQL
- ✅ Migration history
- ✅ Migration lock file

## ❌ Yang TIDAK Di-Sync via Git

### 1. **Database Data**
- ❌ Data di database tidak di-sync via Git
- ✅ Gunakan `backup-db.sh` dan `sync-db.sh` untuk sync data

### 2. **Prisma Client**
- ❌ Prisma Client perlu di-generate setelah pull
- ✅ Otomatis di-generate saat build atau run migrations

## 🔄 Workflow Schema Sync

### Saat Deploy dari Server Rumah:

```bash
./deploy.sh
```

**Yang terjadi:**
1. ✅ Code di-push ke GitHub (termasuk `schema.prisma` dan `migrations/`)
2. ✅ Remote server pull code dari GitHub
3. ✅ **Prisma migrations di-run otomatis** (`prisma migrate deploy`)
4. ✅ Database schema di-update sesuai migrations terbaru
5. ✅ Services di-restart

### Saat Ada Perubahan Schema:

**Di Server Rumah:**
```bash
# 1. Edit prisma/schema.prisma
nano prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name add_new_feature

# 3. Commit dan push
git add prisma/
git commit -m "Add new feature migration"
git push origin main

# 4. Deploy (akan auto-run migrations di remote)
./deploy.sh
```

**Di Remote Server:**
- Migrations akan otomatis di-run saat `deploy.sh` atau `webhook-deploy.sh` dijalankan
- Tidak perlu manual run migrations

## 📋 Checklist Saat Ada Perubahan Schema

- [ ] Edit `prisma/schema.prisma`
- [ ] Create migration: `npx prisma migrate dev --name <name>`
- [ ] Test migration di local
- [ ] Commit migration files ke Git
- [ ] Push ke GitHub
- [ ] Deploy ke remote (migrations akan auto-run)

## ⚠️ Important Notes

1. **Jangan edit migration files secara manual** setelah di-commit
2. **Selalu test migrations di local** sebelum deploy
3. **Backup database** sebelum deploy jika ada perubahan schema besar
4. **Migration files harus di-commit** ke Git agar di-sync ke remote

## 🔍 Verifikasi Schema Sync

**Cek apakah schema sudah sync:**
```bash
# Di remote server
cd /home/gastra/projects/isp-app
git log --oneline prisma/schema.prisma | head -5
docker compose exec app npx prisma migrate status
```

**Cek apakah migrations sudah di-run:**
```bash
# Di remote server
docker compose exec app npx prisma migrate status
```

## 🚨 Troubleshooting

### Migration failed di remote:
```bash
# Di remote server
cd /home/gastra/projects/isp-app
docker compose exec app npx prisma migrate status
docker compose exec app npx prisma migrate deploy --skip-seed
```

### Schema berbeda antara local dan remote:
```bash
# Di local
npx prisma db pull  # Pull schema dari database
npx prisma migrate dev --name sync_schema  # Create migration
git add prisma/
git commit -m "Sync schema"
git push origin main
./deploy.sh
```

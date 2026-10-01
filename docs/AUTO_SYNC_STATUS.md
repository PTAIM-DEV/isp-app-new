# Auto Sync Status & Implementation

## Status Implementasi Auto Sync

✅ **Sudah Diimplementasi** - Tapi perlu setup cron job secara manual

### Yang Sudah Dibuat:

1. **Voucher Monitor Service** (`src/lib/services/voucher-monitor-service.ts`)
   - Sync sessions dari semua MikroTik servers
   - Update status voucher berdasarkan penggunaan
   - Mark stopped sessions

2. **Cron Endpoint** (`/api/cron/sync-hotspot-sessions`)
   - POST: Untuk cron job (dengan auth)
   - GET: Untuk manual trigger (tanpa auth)

3. **Dokumentasi Setup** (`docs/HOTSPOT_MONITORING_SETUP.md`)

### Yang Perlu Dilakukan:

**Setup Cron Job** - Sistem belum benar-benar "auto" sampai cron job di-setup:

1. **External Cron Service** (Recommended)
   - Daftar di cron-job.org atau layanan serupa
   - Setup job untuk call endpoint setiap 5 menit
   - URL: `https://your-domain.com/api/cron/sync-hotspot-sessions`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`

2. **Server Cron** (Alternative)
   - Tambahkan ke crontab server
   - Run setiap 5 menit: `*/5 * * * * curl -X POST ...`

## Cara Kerja

1. **Cron job** call endpoint setiap 5 menit
2. **Endpoint** sync sessions dari semua MikroTik servers
3. **Service** update status voucher:
   - `UNUSED` → `ACTIVE` (ketika ada session aktif)
   - `ACTIVE` → `USED` (ketika session berakhir)
   - `ACTIVE` → `EXPIRED` (ketika expired)

## Testing Manual

Test tanpa setup cron:
```
GET https://your-domain.com/api/cron/sync-hotspot-sessions
```

atau untuk server tertentu:
```
GET https://your-domain.com/api/cron/sync-hotspot-sessions?serverId=SERVER_ID
```

## Catatan

- Auto sync **sudah diimplementasi** tapi perlu **setup cron job manual**
- Tanpa cron job, sync hanya bisa dilakukan manual via browser/API
- Monitor dashboard auto-refresh setiap 30 detik (hanya untuk display, tidak sync)







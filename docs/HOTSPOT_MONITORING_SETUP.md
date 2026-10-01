# Hotspot Monitoring & Voucher Status Sync

## Overview

Sistem ini memonitor penggunaan voucher hotspot dengan cara:
1. **Sync berkala** dari MikroTik untuk mendapatkan active sessions
2. **Update status voucher** berdasarkan penggunaan
3. **Track sessions** untuk monitoring dan reporting

## Cara Kerja

### 1. Sync Sessions dari MikroTik

Sistem akan:
- Mengambil semua active sessions dari setiap MikroTik server aktif
- Menyimpan/update session ke database
- Mencocokkan session dengan voucher berdasarkan username/code
- Update status voucher:
  - `UNUSED` → `ACTIVE` ketika voucher mulai digunakan
  - `ACTIVE` → `USED` ketika session berakhir
  - `ACTIVE` → `EXPIRED` ketika voucher expired

### 2. Update Voucher Status

Status voucher diupdate berdasarkan:
- **Active Sessions**: Jika ada session aktif, voucher status = `ACTIVE`
- **Stopped Sessions**: Jika session berakhir, voucher status = `USED`
- **Expired**: Jika `expiresAt` sudah lewat, voucher status = `EXPIRED`

## Setup Cron Job

### Opsi 1: External Cron Service (Recommended)

Gunakan layanan cron eksternal seperti:
- **cron-job.org** (gratis)
- **EasyCron** (gratis)
- **UptimeRobot** (gratis)

**Setup di cron-job.org:**
1. Buat akun di https://cron-job.org
2. Buat job baru:
   - **URL**: `https://your-domain.com/api/cron/sync-hotspot-sessions`
   - **Method**: POST
   - **Headers**: `Authorization: Bearer YOUR_CRON_SECRET`
   - **Schedule**: Setiap 1-5 menit (misalnya: `*/5 * * * *`)
3. Simpan job

### Opsi 2: Server Cron (Linux)

Tambahkan ke crontab server:

```bash
# Edit crontab
crontab -e

# Tambahkan baris ini (sync setiap 5 menit)
*/5 * * * * curl -X POST https://your-domain.com/api/cron/sync-hotspot-sessions -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Opsi 3: Systemd Timer (Linux)

Buat file `/etc/systemd/system/hotspot-sync.timer`:

```ini
[Unit]
Description=Hotspot Sessions Sync Timer
Requires=hotspot-sync.service

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
Unit=hotspot-sync.service

[Install]
WantedBy=timers.target
```

Buat file `/etc/systemd/system/hotspot-sync.service`:

```ini
[Unit]
Description=Hotspot Sessions Sync Service

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -X POST https://your-domain.com/api/cron/sync-hotspot-sessions -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Enable timer:
```bash
sudo systemctl enable hotspot-sync.timer
sudo systemctl start hotspot-sync.timer
```

## Environment Variables

Tambahkan ke `.env`:

```env
# Cron secret untuk authentication
CRON_SECRET=your-secret-key-change-this
```

## Manual Sync

### Via Browser (GET request)
```
https://your-domain.com/api/cron/sync-hotspot-sessions
```

### Via Browser dengan Server ID
```
https://your-domain.com/api/cron/sync-hotspot-sessions?serverId=SERVER_ID
```

### Via cURL
```bash
# Sync all servers
curl -X POST https://your-domain.com/api/cron/sync-hotspot-sessions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Sync single server (GET)
curl https://your-domain.com/api/cron/sync-hotspot-sessions?serverId=SERVER_ID
```

## Monitoring Dashboard

Akses dashboard monitoring di:
```
/admin/hotspot/monitor
```

Dashboard akan menampilkan:
- Active sessions real-time
- Server status
- Voucher usage statistics
- Auto-refresh setiap 30 detik

## API Endpoints

### POST `/api/cron/sync-hotspot-sessions`
Sync semua server dan update voucher status.
- **Auth**: Bearer token dengan `CRON_SECRET`
- **Response**: 
  ```json
  {
    "success": true,
    "serversProcessed": 3,
    "sessionsSynced": 15,
    "vouchersUpdated": 8
  }
  ```

### GET `/api/cron/sync-hotspot-sessions`
Manual trigger untuk testing (tanpa auth).
- **Query params**: `serverId` (optional)
- **Response**: Same as POST

## Troubleshooting

### Voucher tidak ter-update statusnya
1. Pastikan cron job berjalan
2. Check logs di server untuk error
3. Test manual sync via browser
4. Pastikan voucher sudah di-sync ke MikroTik (`syncedToMikrotik: true`)

### Sessions tidak muncul
1. Pastikan MikroTik server aktif dan bisa diakses
2. Check connection status di `/admin/hotspot/servers`
3. Test connection ke MikroTik
4. Pastikan username/code voucher match dengan username di MikroTik

### Cron job tidak jalan
1. Check cron service status
2. Test endpoint manual via browser
3. Check server logs
4. Pastikan `CRON_SECRET` sudah di-set di `.env`

## Best Practices

1. **Sync Frequency**: 
   - Production: Setiap 1-5 menit
   - Development: Setiap 5-10 menit

2. **Error Handling**:
   - Sistem akan continue dengan server lain jika satu server error
   - Check logs secara berkala

3. **Performance**:
   - Sync hanya server aktif (`isActive: true`)
   - Batch update untuk efisiensi

4. **Security**:
   - Selalu gunakan `CRON_SECRET` untuk authentication
   - Jangan expose endpoint tanpa auth di production







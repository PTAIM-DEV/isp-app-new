# Voucher Expiry Flow - Web App Based

## Overview

Sistem expired voucher menggunakan **web app sebagai timer**, bukan scheduler di MikroTik. Ini karena:
- MikroTik tidak punya parameter expired voucher berlaku
- **Uptime** = durasi waktu terkonek user ke internet per sesi (misal: 24 jam)
- **Expired** = lama berlaku voucher sejak sync (misal: 1 jam sejak sync)
- Web app lebih fleksibel untuk manage expired vouchers

## Konsep Dua Waktu

### 1. **Uptime (Limit Uptime)**
- **Definisi**: Lama waktu voucher terkonek ke internet dalam satu sesi
- **Contoh**: 24 jam = user bisa terkonek 24 jam non-stop
- **Lokasi**: Di-set di MikroTik sebagai `limit-uptime` pada user
- **Cara Kerja**: MikroTik otomatis logout user setelah uptime habis
- **Status**: ✅ Sudah benar di system dan MikroTik

### 2. **Expired (Masa Berlaku Voucher)**
- **Definisi**: Lama berlaku voucher sejak di-sync ke MikroTik
- **Contoh**: 1 jam = voucher berlaku 1 jam sejak sync, setelah itu tidak bisa digunakan lagi
- **Lokasi**: Di-hitung dan di-simpan di database (`expiresAt`)
- **Cara Kerja**: Web app cron job check setiap menit, jika expired maka logout dan disable user
- **Status**: ✅ Sudah diimplementasikan dengan benar

## Flow Lengkap

### 1. **Voucher Sync ke MikroTik**

Ketika voucher di-sync ke MikroTik:

```
1. Web app sync voucher ke MikroTik
2. Web app catat waktu sync sebagai `syncedAt` di database
3. Web app hitung waktu expired: `expiresAt = syncedAt + duration (menit)`
4. Web app simpan `syncedAt` dan `expiresAt` di database
```

**Contoh:**
- Voucher dengan expired 1 jam (60 menit)
- Sync ke MikroTik jam 11:00
- `syncedAt` = 11:00
- `expiresAt` = 12:00 (11:00 + 60 menit)

**Code:**
```typescript
// src/lib/services/hotspot-voucher-service.ts
const syncedAt = new Date();
const expiresAt = new Date(syncedAt);
expiresAt.setMinutes(expiresAt.getMinutes() + voucher.duration);

await prisma.hotspotVoucher.update({
  where: { id: voucherId },
  data: {
    syncedAt: syncedAt,
    expiresAt: expiresAt
  }
});
```

### 2. **Cron Job Check Expired Vouchers**

Cron job berjalan **setiap menit** untuk check vouchers yang sudah expired:

```
1. Query vouchers dengan:
   - expiresAt <= now
   - status = ACTIVE atau UNUSED
   - syncedToMikrotik = true

2. Untuk setiap expired voucher:
   a. Logout user aktif (disconnect active sessions)
   b. Disable user di MikroTik
   c. Update status voucher ke EXPIRED di database
```

**Endpoint:** `GET /api/cron/check-expired-vouchers`

**Schedule:** Setiap menit (`* * * * *`)

### 3. **Expire Voucher Process**

Untuk setiap expired voucher:

```
1. Check apakah user masih aktif (ada active sessions)
2. Jika aktif:
   - Disconnect semua active sessions (logout user)
3. Disable user di MikroTik (atau remove jika prefer)
4. Update status voucher ke EXPIRED di database
```

**Code:**
```typescript
// src/lib/services/voucher-expiry-service.ts
async expireVoucher(voucherId: string) {
  // 1. Logout user aktif
  const activeSessions = await routerosService.getActiveSessions(serverId);
  for (const session of userSessions) {
    await routerosService.disconnectSession(serverId, session['.id']);
  }
  
  // 2. Disable user di MikroTik
  await routerosService.updateHotspotUser(serverId, username, {
    disabled: true
  });
  
  // 3. Update status di database
  await prisma.hotspotVoucher.update({
    where: { id: voucherId },
    data: { status: 'EXPIRED' }
  });
}
```

## Setup

### 1. **Setup Cron Job**

Jalankan script setup:

```bash
./scripts/setup-expired-vouchers-cron.sh
```

Script ini akan:
- Membuat cron job yang berjalan setiap menit
- Call endpoint `/api/cron/check-expired-vouchers`
- Log output ke `logs/expired-vouchers-cron.log`

### 2. **Environment Variables**

Pastikan `.env` memiliki:

```env
CRON_SECRET=your-secret-key-here
```

Secret ini digunakan untuk authenticate cron job requests.

### 3. **Manual Test**

Test endpoint secara manual:

```bash
# GET request (dengan auth)
curl -X GET \
  -H "Authorization: Bearer your-secret-key" \
  http://localhost:3000/api/cron/check-expired-vouchers

# POST request (tanpa auth, untuk testing)
curl -X POST \
  http://localhost:3000/api/cron/check-expired-vouchers
```

## Database Schema

Voucher memiliki field:

```prisma
model HotspotVoucher {
  syncedAt    DateTime?  // Waktu sync ke MikroTik
  expiresAt   DateTime?  // Waktu expired (syncedAt + duration)
  status      String     // UNUSED, ACTIVE, EXPIRED, USED
}
```

## Flow Diagram

```
┌─────────────────────────────────────┐
│  Voucher Sync ke MikroTik          │
│  - syncedAt = now()                 │
│  - expiresAt = syncedAt + duration │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Database: Voucher dengan expiresAt │
│  - expiresAt = 12:00                │
│  - status = ACTIVE                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Cron Job (setiap menit)           │
│  - Check: expiresAt <= now()        │
│  - Find expired vouchers            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Expire Voucher Process             │
│  1. Logout user aktif               │
│  2. Disable user di MikroTik        │
│  3. Update status = EXPIRED         │
└─────────────────────────────────────┘
```

## Kelebihan Flow Ini

1. **Fleksibel**: Web app punya kontrol penuh atas expired vouchers
2. **Akurat**: Waktu expired dihitung dari waktu sync, bukan dari waktu login
3. **Reliable**: Tidak bergantung pada scheduler MikroTik
4. **Traceable**: Semua proses bisa di-log dan di-monitor

## Catatan Penting

1. **Cron job harus berjalan setiap menit** untuk akurasi maksimal
2. **Pastikan server timezone benar** (Asia/Jakarta / GMT+7)
3. **CRON_SECRET harus di-set** untuk security
4. **Monitor log file** untuk troubleshooting

## Troubleshooting

### Voucher tidak ter-expire

1. Check cron job berjalan:
   ```bash
   crontab -l | grep check-expired-vouchers
   ```

2. Check log:
   ```bash
   tail -f logs/expired-vouchers-cron.log
   ```

3. Test endpoint manual:
   ```bash
   curl -X POST http://localhost:3000/api/cron/check-expired-vouchers
   ```

### User masih aktif setelah expired

1. Check apakah cron job berjalan
2. Check apakah server MikroTik connected
3. Check log untuk error

### Timezone issue

Pastikan server timezone:
```bash
timedatectl set-timezone Asia/Jakarta
```


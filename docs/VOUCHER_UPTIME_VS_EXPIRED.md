# Perbedaan Uptime vs Expired Voucher

## Konsep Dua Waktu

Sistem voucher memiliki **2 konsep waktu yang berbeda**:

### 1. **Uptime (Limit Uptime)**
**Definisi**: Lama waktu voucher terkonek ke internet dalam **satu sesi**

**Contoh**:
- Uptime = 24 jam
- User login jam 10:00
- User bisa terkonek sampai jam 10:00 + 24 jam = jam 10:00 (hari berikutnya)
- Setelah 24 jam, user **otomatis ter-logout** oleh MikroTik
- Tapi voucher **masih bisa digunakan lagi** untuk login ulang

**Lokasi**: 
- Di-set di MikroTik sebagai `limit-uptime` pada user
- Format: `24h`, `1d`, `1440m`, dll

**Cara Kerja**:
- MikroTik track uptime setiap sesi
- Setelah uptime habis, MikroTik otomatis logout user
- User bisa login lagi dengan voucher yang sama (jika belum expired)

**Status**: ✅ Sudah benar di system dan MikroTik

---

### 2. **Expired (Masa Berlaku Voucher)**
**Definisi**: Lama berlaku voucher sejak di-sync ke MikroTik

**Contoh**:
- Expired = 1 jam (60 menit)
- Voucher di-sync jam 11:00
- `expiresAt` = 12:00 (11:00 + 60 menit)
- Setelah jam 12:00, voucher **tidak bisa digunakan lagi sama sekali**
- User yang sedang login akan di-logout dan user di-disable

**Lokasi**:
- Di-hitung: `expiresAt = syncedAt + duration (menit)`
- Di-simpan di database: `HotspotVoucher.expiresAt`

**Cara Kerja**:
1. Saat voucher di-sync, web app hitung `expiresAt = syncedAt + duration`
2. Cron job check setiap menit: `expiresAt <= now()`
3. Jika expired:
   - Logout user aktif (disconnect sessions)
   - Disable user di MikroTik
   - Update status voucher ke `EXPIRED`

**Status**: ✅ Sudah diimplementasikan dengan benar

---

## Perbandingan

| Aspek | Uptime | Expired |
|-------|--------|---------|
| **Definisi** | Lama terkonek per sesi | Lama berlaku voucher |
| **Contoh** | 24 jam | 1 jam |
| **Lokasi** | MikroTik (`limit-uptime`) | Database (`expiresAt`) |
| **Enforcement** | MikroTik otomatis | Web app cron job |
| **Setelah Habis** | User ter-logout, bisa login lagi | Voucher tidak bisa digunakan lagi |
| **Reset** | Reset setiap login baru | Tidak reset, tetap dari waktu sync |

---

## Contoh Skenario

### Skenario 1: Uptime 24 jam, Expired 1 jam

1. **Voucher dibuat** dengan:
   - Uptime: 24 jam
   - Expired: 1 jam (60 menit)

2. **Voucher di-sync** jam 11:00:
   - `syncedAt` = 11:00
   - `expiresAt` = 12:00
   - `limit-uptime` = 24h (di-set di MikroTik)

3. **User login** jam 11:10:
   - User bisa terkonek sampai jam 11:10 + 24 jam = 11:10 (hari berikutnya)
   - Tapi voucher expired jam 12:00

4. **Jam 12:00** (voucher expired):
   - Web app cron job detect expired
   - Logout user aktif
   - Disable user di MikroTik
   - Update status voucher ke `EXPIRED`

5. **User tidak bisa login lagi** karena voucher sudah expired

---

### Skenario 2: Uptime 1 jam, Expired 24 jam

1. **Voucher dibuat** dengan:
   - Uptime: 1 jam
   - Expired: 24 jam (1440 menit)

2. **Voucher di-sync** jam 10:00:
   - `syncedAt` = 10:00
   - `expiresAt` = 10:00 (hari berikutnya)
   - `limit-uptime` = 1h (di-set di MikroTik)

3. **User login** jam 10:00:
   - User terkonek sampai jam 11:00 (1 jam)
   - MikroTik otomatis logout jam 11:00

4. **User login lagi** jam 11:05:
   - User bisa login lagi (voucher belum expired)
   - User terkonek sampai jam 12:05 (1 jam lagi)
   - Bisa login berulang sampai voucher expired

5. **Jam 10:00 (hari berikutnya)** (voucher expired):
   - Web app cron job detect expired
   - Logout user aktif (jika masih login)
   - Disable user di MikroTik
   - Update status voucher ke `EXPIRED`

---

## Implementasi di Code

### Uptime (Limit Uptime)
```typescript
// src/lib/services/hotspot-voucher-service.ts
const limitUptime = voucher.limitUptime || `${voucher.duration}m`;

// Di-set di MikroTik user
await routerosPHPService.createUser(phpConfig, {
  username,
  password,
  limitUptime: limitUptime, // Contoh: "24h", "1d", "1440m"
  ...
});
```

### Expired (Masa Berlaku)
```typescript
// src/lib/services/hotspot-voucher-service.ts
const syncedAt = new Date();
const expiresAt = new Date(syncedAt);
expiresAt.setMinutes(expiresAt.getMinutes() + voucher.duration);

await prisma.hotspotVoucher.update({
  where: { id: voucherId },
  data: {
    syncedAt: syncedAt,
    expiresAt: expiresAt // Di-hitung dari syncedAt + duration
  }
});
```

### Check Expired (Cron Job)
```typescript
// src/lib/services/voucher-expiry-service.ts
const expiredVouchers = await prisma.hotspotVoucher.findMany({
  where: {
    expiresAt: { lte: now() }, // expiresAt <= now
    status: { in: ['ACTIVE', 'UNUSED'] },
    syncedToMikrotik: true
  }
});

// Expire setiap voucher
for (const voucher of expiredVouchers) {
  await this.expireVoucher(voucher.id);
}
```

---

## Kesimpulan

- **Uptime**: Sudah benar, di-handle oleh MikroTik
- **Expired**: Sudah benar, di-handle oleh web app cron job
- **Keduanya bekerja independen** dan saling melengkapi






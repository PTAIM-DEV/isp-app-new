# Masalah Scheduler: Device Mode Restriction

## Masalah
RouterOS dalam device mode "home" dengan `"scheduler": "false"` tidak mengizinkan pembuatan scheduler via API.

## Error
```
"not allowed by device-mode"
```

## Solusi

### 1. Enable Scheduler Manual di RouterOS (Recommended)
1. Login ke RouterOS (Winbox atau WebFig)
2. System → Device Mode
3. Enable "Scheduler"
4. Apply

Setelah itu, scheduler bisa dibuat via API.

### 2. Alternatif: Gunakan On-Login Script (Tanpa Scheduler)
- Check expiry saat user login
- Set `limit-uptime=1s` jika expired
- Tidak real-time (hanya check saat login)

### 3. Upgrade Device Mode
- Ubah dari "home" ke mode yang mengizinkan scheduler
- Perlu license upgrade (jika diperlukan)

## Status Saat Ini
- ✅ Script `check-expired-vouchers` sudah dibuat
- ❌ Scheduler `expired-voucher-checker` gagal dibuat (device mode restriction)
- ⚠️ Expired voucher check belum aktif

## Next Steps
1. User perlu enable scheduler di RouterOS manual
2. Setelah itu, jalankan install scheduler lagi via UI atau API
3. Atau gunakan alternatif on-login script (kurang real-time)







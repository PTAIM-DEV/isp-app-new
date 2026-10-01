# Verifikasi Scheduler Sudah Di-Enable

## Status Saat Ini
Device mode masih menunjukkan `"scheduler": "false"` meskipun sudah di-enable.

## Langkah Verifikasi

### 1. Pastikan Enable di Tempat yang Benar

**Via Winbox:**
1. System → **Device Mode** (bukan System → Scheduler)
2. Centang checkbox **"Scheduler"**
3. Klik **"Apply"** (penting!)
4. Jika diminta, klik **"OK"**

**Via WebFig:**
1. System → **Device Mode**
2. Centang checkbox **"Scheduler"**
3. Klik **"Apply"** atau **"OK"**

### 2. Verifikasi Device Mode

Setelah enable, verifikasi dengan command:
```bash
/system device-mode print
```

Harus menunjukkan: `scheduler: true`

### 3. Jika Masih `scheduler: false`

**Kemungkinan penyebab:**
1. **Belum Apply**: Pastikan klik "Apply" setelah centang scheduler
2. **Perlu Reboot**: Beberapa RouterOS perlu reboot setelah enable scheduler
3. **Device Mode "home"**: Mode "home" mungkin tidak mengizinkan scheduler (perlu upgrade license)

**Solusi:**
- Coba **reboot router** setelah enable scheduler
- Atau gunakan **alternatif PHP CLI script** via cron job

### 4. Test Setelah Enable

Setelah enable dan apply/reboot, test dengan:
```bash
php scripts/routeros-php/install_scheduler.php <host> <port> <username> <password>
```

Jika berhasil, akan muncul:
```json
{
  "success": true,
  "script": {...},
  "scheduler": {...}
}
```

## Alternatif: PHP CLI Script (Jika Scheduler Tidak Bisa Di-Enable)

Jika scheduler tidak bisa di-enable, gunakan PHP CLI script via cron:

```bash
# Edit crontab
crontab -e

# Tambahkan (setiap 5 detik)
* * * * * php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 5; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 10; php /path/to/check_expired_vouchers.php host port user pass
# ... dst
```







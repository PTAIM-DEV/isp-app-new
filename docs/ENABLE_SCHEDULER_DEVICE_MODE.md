# Cara Enable Scheduler di RouterOS Device Mode

## Masalah
Error: `"failure: not allowed by device-mode"` saat membuat scheduler.

## Solusi: Enable Scheduler di Device Mode

### Via Winbox/WebFig:

1. **Login ke RouterOS** (Winbox atau WebFig)

2. **Buka System → Device Mode**
   - Di Winbox: System → Device Mode
   - Di WebFig: System → Device Mode

3. **Enable "Scheduler"**
   - Centang checkbox "Scheduler"
   - Klik "Apply" atau "OK"

4. **Verifikasi**
   - Pastikan "Scheduler" sudah tercentang
   - Device mode akan menampilkan `"scheduler": "true"`

### Via Terminal/SSH:

```bash
# Connect ke RouterOS via SSH
ssh admin@<router-ip>

# Enable scheduler di device mode
/system device-mode set scheduler=yes

# Verify
/system device-mode print
```

### Setelah Enable Scheduler:

1. **Jalankan install scheduler lagi**:
   ```bash
   php scripts/routeros-php/install_scheduler.php <host> <port> <username> <password>
   ```

2. **Atau via UI**:
   - Buka halaman server detail
   - Klik tombol "Install Scheduler"

3. **Verify scheduler dibuat**:
   ```bash
   php scripts/routeros-php/check_scheduler.php <host> <port> <username> <password>
   ```

## Format Scheduler yang Akan Dibuat

Setelah scheduler di-enable, script akan membuat scheduler dengan format:

- **Name**: `expired-voucher-checker`
- **Start Time**: `startup` (atau bisa `00:00:00`)
- **Interval**: `5s` (check setiap 5 detik)
- **On Event**: `check-expired-vouchers` (script name)
- **Disabled**: `no`
- **Comment**: `Expired Voucher Checker - Check setiap 5 detik`

## Alternatif: PHP CLI Script (Jika Scheduler Tidak Bisa Di-Enable)

Jika scheduler tidak bisa di-enable di device mode, gunakan PHP CLI script via cron:

```bash
# Edit crontab
crontab -e

# Tambahkan (setiap 5 detik)
* * * * * php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 5; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 10; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 15; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 20; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 25; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 30; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 35; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 40; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 45; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 50; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 55; php /path/to/check_expired_vouchers.php host port user pass
```

## Catatan

- **Device Mode "home"** biasanya tidak mengizinkan scheduler
- **Device Mode "enterprise"** atau **"full"** biasanya mengizinkan scheduler
- Jika tidak bisa enable scheduler, gunakan alternatif PHP CLI script via cron







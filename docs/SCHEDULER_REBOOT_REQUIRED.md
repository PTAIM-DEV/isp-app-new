# Scheduler Enable - Reboot Required

## Status
Scheduler sudah di-enable via command:
```
/system/device-mode/update scheduler=yes
```

RouterOS meminta **reboot** untuk mengaktifkan perubahan.

## Langkah Setelah Reboot

### 1. Tunggu Router Reboot Selesai
- Router akan reboot otomatis dalam 4m29s, atau
- Reboot manual dengan: `/system reboot`

### 2. Setelah Reboot, Verifikasi Device Mode
```bash
/system device-mode print
```

Harus menunjukkan: `scheduler: true`

### 3. Install Scheduler
Setelah reboot dan scheduler sudah `true`, jalankan:
```bash
php scripts/routeros-php/install_scheduler.php <host> <port> <username> <password>
```

### 4. Verify Scheduler
```bash
php scripts/routeros-php/check_scheduler.php <host> <port> <username> <password>
```

## Format Scheduler yang Akan Dibuat

- **Name**: `expired-voucher-checker`
- **Start Time**: `startup` (start saat router boot)
- **Interval**: `5s` (check setiap 5 detik)
- **On Event**: `check-expired-vouchers` (script name)
- **Disabled**: `no`
- **Comment**: `Expired Voucher Checker - Check setiap 5 detik`

## Catatan

Setelah reboot, device mode akan menunjukkan `scheduler: true` dan scheduler bisa dibuat via API.







# Setup PHP CLI untuk RouterOS Operations

## Overview

Sistem sekarang menggunakan PHP CLI scripts untuk handle RouterOS operations (create profile, create user, install scheduler). Pendekatan ini lebih reliable karena menggunakan PHP RouterOS API library yang proven (sama seperti MIKHMON).

## Install PHP CLI

### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install php8.3-cli php8.3-curl
```

### Verify Installation:
```bash
php --version
```

## File Structure

```
scripts/routeros-php/
├── routeros_api.class.php    # RouterOS PHP API library (from MIKHMON)
├── create_profile.php         # Create/update hotspot profile
├── create_user.php            # Create hotspot user
└── install_scheduler.php      # Install expired voucher scheduler
```

## How It Works

1. **Node.js Service** (`routeros-php-service.ts`) calls PHP scripts via `child_process.exec`
2. **PHP Scripts** use RouterOS PHP API library to communicate with MikroTik
3. **Results** are returned as JSON to Node.js
4. **Fallback** to Node.js implementation if PHP script fails

## Usage

### Create Profile:
```typescript
const result = await routerosPHPService.createOrUpdateProfile(config, {
  profileName: 'PAKET-3-HARI',
  downloadSpeed: '10M',
  uploadSpeed: '5M',
  limitUptime: '3d',
  sharedUsers: 1
});
```

### Create User:
```typescript
const result = await routerosPHPService.createUser(config, {
  username: 'testuser',
  password: 'testpass',
  profile: 'PAKET-3-HARI',
  comment: '01/01/2025 12:00'
});
```

### Install Scheduler:
```typescript
const result = await routerosPHPService.installScheduler(config);
```

## Benefits

1. **Proven Library**: PHP RouterOS API library sudah proven (MIKHMON pakai ini)
2. **Better Error Handling**: Handle `!empty` reply secara otomatis
3. **Reliable**: Tidak ada masalah dengan RouterOS 7.x compatibility
4. **Fallback**: Jika PHP gagal, fallback ke Node.js implementation

## Testing

Test PHP scripts manually:
```bash
cd scripts/routeros-php
php create_profile.php 192.168.1.1 8728 admin password TEST-PROFILE '{"downloadSpeed":"10M","uploadSpeed":"5M"}'
```

## Troubleshooting

### PHP not found:
- Install PHP CLI: `sudo apt install php8.3-cli`
- Verify: `php --version`

### Permission denied:
- Make scripts executable: `chmod +x scripts/routeros-php/*.php`

### Connection timeout:
- Check MikroTik server connection
- Verify firewall rules allow API access
- Check RouterOS API service is enabled







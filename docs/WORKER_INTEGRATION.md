# Worker Integration

## 📋 Overview

Semua worker telah digabung menjadi **satu worker** (`worker/whatsapp.ts`) yang menjalankan:
1. **WhatsApp Handler** - Menangani pesan WhatsApp dan AI auto-reply
2. **Reminder Processor** - Memproses scheduled payment reminders

## 🔄 Perubahan

### Sebelumnya:
- `npm run worker` - Hanya WhatsApp worker
- `npm run worker:reminder` - Hanya Reminder processor (terpisah)

### Sekarang:
- `npm run worker` - **Keduanya berjalan bersama** dalam satu proses

## 🚀 Cara Menjalankan

### Development:
```bash
npm run worker
```

### Production (PM2):
```bash
pm2 start npm --name "isp-worker" -- run worker
pm2 save
```

### Production (Systemd):
```bash
# /etc/systemd/system/isp-worker.service
[Unit]
Description=ISP App Worker (WhatsApp + Reminders)
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/isp-app
ExecStart=/usr/bin/npm run worker
Restart=always

[Install]
WantedBy=multi-user.target
```

## 📊 Struktur Worker

```
worker/whatsapp.ts (Main Worker)
├── WhatsApp Connection
│   ├── QR Code generation
│   ├── Message handling
│   ├── AI auto-reply
│   └── Media download
└── Reminder Processor
    └── Process scheduled reminders (every 1 minute)
```

## ⚙️ Konfigurasi

### Environment Variables:
- `DATABASE_URL` - Database connection
- `NEXT_PUBLIC_APP_URL` atau `API_URL` - Untuk reminder processor API calls (default: http://localhost:3000)

### Reminder Processor:
- Check reminders setiap **1 menit**
- Memanggil `/api/cron/payment-reminder` untuk process reminders
- Auto-retry jika gagal

## 🔍 Monitoring

### Check Worker Status:
```bash
# PM2
pm2 status
pm2 logs isp-worker

# Systemd
systemctl status isp-worker
journalctl -u isp-worker -f
```

### Check Logs:
Worker akan menampilkan log untuk:
- `[WhatsApp]` - WhatsApp connection dan messages
- `[AI]` - AI auto-reply processing
- `[Reminder Processor]` - Payment reminder processing

## 🐛 Troubleshooting

### Worker tidak start:
1. Check apakah port 3000 tersedia (untuk API calls)
2. Check DATABASE_URL di .env
3. Check logs untuk error details

### Reminder tidak terkirim:
1. Check apakah reminder processor berjalan (lihat logs)
2. Check API endpoint `/api/cron/payment-reminder` accessible
3. Check database untuk scheduled reminders

### WhatsApp tidak connect:
1. Check apakah `baileys_auth_info` folder ada
2. Check QR code di system settings
3. Check logs untuk connection errors

## 📝 Notes

- **Single Process**: Semua worker berjalan dalam satu proses Node.js
- **Shared Resources**: Keduanya share Prisma client dan database connection
- **Independent**: WhatsApp dan Reminder processor berjalan independent, tidak saling blocking
- **Graceful Shutdown**: Keduanya handle SIGTERM/SIGINT untuk shutdown yang bersih

## 🔄 Migration dari Multiple Workers

Jika sebelumnya menjalankan worker terpisah:

1. **Stop semua worker yang lama**:
   ```bash
   pm2 stop all
   # atau
   systemctl stop isp-worker isp-reminder
   ```

2. **Start worker baru**:
   ```bash
   npm run worker
   # atau
   pm2 start npm --name "isp-worker" -- run worker
   ```

3. **Remove old worker configs** (optional):
   - Hapus `worker:reminder` dari PM2/systemd jika ada
   - Script `npm run worker:reminder` masih tersedia untuk testing standalone


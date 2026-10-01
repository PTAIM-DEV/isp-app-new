# Sistem Timer-Based Payment Reminders

## 📋 Overview

Sistem reminder pembayaran yang menggunakan **timer-based scheduling** alih-alih cron polling harian. Ini lebih efisien karena:

- ✅ **Tidak perlu polling** semua invoice setiap hari
- ✅ **Hanya memproses reminder yang sudah dijadwalkan** dan due
- ✅ **Lebih hemat resource** - check setiap 1 menit untuk reminder yang due saja
- ✅ **Database-backed** - reminders persist di database, tidak hilang saat server restart
- ✅ **Auto-schedule** saat invoice dibuat

## 🏗️ Arsitektur

### 1. **ScheduledReminder Table**
Tabel database yang menyimpan reminder yang dijadwalkan:
- `invoiceId` - Invoice yang akan di-remind
- `reminderType` - H-5, H-2, H-0, D+1, D+2, D+5
- `scheduledAt` - Kapan reminder harus dikirim
- `status` - PENDING, SENT, CANCELLED, FAILED
- `retryCount` - Untuk retry mechanism

### 2. **Reminder Scheduler Service** (`src/lib/reminder-scheduler.ts`)
Service untuk:
- `schedulePaymentReminders()` - Schedule reminders saat invoice dibuat
- `cancelPendingReminders()` - Cancel reminders saat invoice dibayar
- `getDueReminders()` - Get reminders yang sudah due
- `markReminderSent()` / `markReminderFailed()` - Update status

### 3. **Reminder Processor Worker** (`worker/reminder-processor.ts`)
Worker yang berjalan di background:
- Check reminders yang due setiap **1 menit**
- Process dan kirim reminder
- Handle retry mechanism
- Auto-block user untuk D+5

### 4. **Auto-Schedule Integration**
- Invoice generator otomatis schedule reminders saat invoice dibuat
- Webhook otomatis cancel reminders saat invoice dibayar

## 🚀 Setup

### 1. **Run Migration**

```bash
# Generate migration
npx prisma migrate dev --name add_scheduled_reminder

# Atau jika sudah ada migration, jalankan:
npx prisma migrate deploy
```

### 2. **Start Reminder Processor Worker**

Ada 2 opsi:

#### Opsi A: Standalone Worker (Recommended)
Jalankan worker terpisah dari WhatsApp worker:

```bash
npm run worker:reminder
```

#### Opsi B: Integrate dengan WhatsApp Worker
Tambahkan ke `worker/whatsapp.ts`:

```typescript
import { startReminderProcessor } from './reminder-processor';

// Di akhir file
startReminderProcessor();
```

### 3. **Setup PM2 atau Systemd** (Production)

Untuk production, jalankan worker sebagai service:

**PM2:**
```bash
pm2 start npm --name "reminder-processor" -- run worker:reminder
pm2 save
```

**Systemd:**
```bash
# /etc/systemd/system/reminder-processor.service
[Unit]
Description=ISP App Reminder Processor
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/isp-app
ExecStart=/usr/bin/npm run worker:reminder
Restart=always

[Install]
WantedBy=multi-user.target
```

## 🔄 Flow

### Saat Invoice Dibuat:
1. Invoice dibuat via `generateInvoice()`
2. Otomatis call `schedulePaymentReminders()`
3. Reminders di-schedule untuk H-5, H-2, H-0, D+1, D+2, D+5
4. Disimpan di database `ScheduledReminder`

### Saat Reminder Due:
1. Reminder Processor check setiap 1 menit
2. Query reminders dengan `status = PENDING` dan `scheduledAt <= now`
3. Process dan kirim reminder via WhatsApp/Email
4. Update status ke `SENT` atau `FAILED` (dengan retry)

### Saat Invoice Dibayar:
1. Webhook atau manual mark as paid
2. Otomatis call `cancelPendingReminders()`
3. Semua pending reminders di-cancel

## 📊 Monitoring

### Check Pending Reminders:
```sql
SELECT COUNT(*) FROM "ScheduledReminder" 
WHERE status = 'PENDING' AND "scheduledAt" <= NOW();
```

### Check Failed Reminders:
```sql
SELECT * FROM "ScheduledReminder" 
WHERE status = 'FAILED' 
ORDER BY "scheduledAt" DESC;
```

### Check Reminders by Type:
```sql
SELECT "reminderType", COUNT(*) 
FROM "ScheduledReminder" 
WHERE status = 'PENDING'
GROUP BY "reminderType";
```

## 🔧 Migration dari Cron ke Timer

### Untuk Invoice Existing:
Jika ada invoice yang sudah dibuat sebelum migration, bisa schedule reminders manual:

```typescript
// Script untuk migrate existing invoices
import { prisma } from '@/lib/prisma';
import { schedulePaymentReminders } from '@/lib/reminder-scheduler';

const unpaidInvoices = await prisma.invoice.findMany({
  where: {
    status: { in: ['UNPAID', 'OVERDUE'] },
    type: 'MONTHLY',
    category: 'REGULAR_MONTHLY',
  },
});

for (const invoice of unpaidInvoices) {
  // Check if reminders already scheduled
  const existing = await prisma.scheduledReminder.findFirst({
    where: { invoiceId: invoice.id },
  });
  
  if (!existing) {
    await schedulePaymentReminders(invoice.id, invoice.dueDate);
    console.log(`Scheduled reminders for invoice ${invoice.invoiceNumber}`);
  }
}
```

## ⚙️ Configuration

### Reminder Times:
Default reminder times bisa diubah di `src/lib/reminder-scheduler.ts`:
- H-5: 5 days before due date
- H-2: 2 days before due date  
- H-0: On due date at 9 AM
- D+1, D+2, D+5: After due date at 9 AM

### Retry Mechanism:
- Max retries: 3
- Retry delay: 5 minutes
- Set di `markReminderFailed()`

## 🆚 Perbandingan: Cron vs Timer

| Aspect | Cron (Old) | Timer (New) |
|--------|-----------|-------------|
| **Polling** | Setiap hari, check semua invoice | Setiap 1 menit, check scheduled reminders saja |
| **Resource Usage** | High (query semua invoice) | Low (query reminders yang due) |
| **Scalability** | Tidak baik untuk banyak invoice | Sangat baik, hanya process yang due |
| **Persistence** | Tidak ada, hilang saat restart | Database-backed, persist |
| **Accuracy** | ±24 jam (tergantung cron schedule) | ±1 menit (check setiap menit) |
| **Setup** | Perlu cron job eksternal | Hanya perlu worker running |

## 🐛 Troubleshooting

### Reminder tidak terkirim:
1. Check apakah worker running: `ps aux | grep reminder-processor`
2. Check logs worker untuk error
3. Check database untuk reminders dengan status FAILED
4. Verify invoice status (jika PAID, reminders akan di-cancel)

### Reminder terkirim duplikat:
- Pastikan hanya 1 instance worker yang running
- Check untuk duplicate entries di `ScheduledReminder`

### Reminder tidak di-schedule:
- Check apakah invoice type = MONTHLY dan category = REGULAR_MONTHLY
- Check logs saat invoice creation
- Verify `schedulePaymentReminders()` dipanggil

## 📝 Notes

- Cron endpoint `/api/cron/payment-reminder` masih bisa digunakan sebagai **fallback**
- Untuk invoice baru, reminders otomatis di-schedule
- Untuk invoice existing, perlu migration script atau tetap pakai cron fallback
- Worker harus running terus-menerus untuk process reminders


# Generate Invoice Masa Transisi

## 📋 Overview

Endpoint khusus untuk generate invoice bagi subscription yang perlu invoice dalam waktu < 5 hari (masa transisi). Endpoint ini akan:

1. ✅ Mencari subscription yang `nextBillingDate` sudah lewat atau akan lewat dalam < 5 hari
2. ✅ Check apakah sudah ada invoice untuk billing cycle tersebut
3. ✅ Generate invoice jika belum ada
4. ✅ Schedule payment reminders otomatis
5. ✅ Update `nextBillingDate` setelah invoice dibuat

## 🔗 Endpoint

**URL**: `GET /api/cron/generate-transition-invoices`

**Method**: `GET`

**Authentication**: Tidak diperlukan (cron job endpoint)

## 🔄 Flow

### 1. **Query Subscription**

Mencari subscription dengan kriteria:
- `nextBillingDate <= today + 4 hari` (kurang dari 5 hari)
- `user.status = ACTIVE`
- `isTrialActive = false`
- `isPrepaidActive = false`

### 2. **Check Duplikasi**

Untuk setiap subscription, check apakah sudah ada invoice dengan:
- `userId` yang sama
- `category = REGULAR_MONTHLY`
- `dueDate` dalam rentang ±1 hari dari `nextBillingDate`
- `status` dalam `['UNPAID', 'OVERDUE', 'PAID']`
- `deletedAt = null`

### 3. **Generate Invoice**

Jika belum ada invoice:
- Generate invoice dengan `dueDate = nextBillingDate`
- Schedule payment reminders otomatis (H-5, H-2, H-0, D+1, D+2, D+5)
- Update `nextBillingDate` ke billing cycle berikutnya

### 4. **Response**

```json
{
  "message": "Transition invoice generation completed",
  "summary": {
    "totalFound": 10,
    "generated": 8,
    "skipped": 2
  },
  "results": [
    {
      "subscriptionId": "sub_123",
      "userId": "user_456",
      "userName": "John Doe",
      "nextBillingDate": "2025-12-05T00:00:00.000Z",
      "status": "generated",
      "invoiceId": "inv_789",
      "invoiceNumber": "INV-2025-12-001"
    },
    {
      "subscriptionId": "sub_124",
      "userId": "user_457",
      "userName": "Jane Smith",
      "nextBillingDate": "2025-12-06T00:00:00.000Z",
      "status": "skipped",
      "reason": "Invoice already exists (INV-2025-12-002, status: UNPAID)"
    }
  ]
}
```

## 📊 Sistem Notifikasi

### ✅ **Notifikasi Otomatis**

Setiap invoice yang di-generate akan **otomatis** di-schedule untuk reminder:

1. **H-5**: 5 hari sebelum `dueDate`
2. **H-2**: 2 hari sebelum `dueDate`
3. **H-0**: Hari `dueDate` (jam 9:00)
4. **D+1**: 1 hari setelah `dueDate` (jam 9:00)
5. **D+2**: 2 hari setelah `dueDate` (jam 9:00)
6. **D+5**: 5 hari setelah `dueDate` (jam 9:00) - akan trigger auto-block

### ✅ **Rate Limiting**

Sistem reminder menggunakan **rate limiting 20 detik** antar pengiriman untuk menghindari WhatsApp ban:

```typescript
const RATE_LIMIT_MS = 20 * 1000; // 20 seconds
```

**Lokasi**: `/src/app/api/cron/payment-reminder/route.ts` baris 176

**Cara Kerja**:
- Setiap reminder menunggu 20 detik sebelum mengirim reminder berikutnya
- Mencegah WhatsApp ban karena terlalu banyak pesan dalam waktu singkat
- Rate limiting diterapkan untuk semua reminder (WhatsApp dan Email)

### ✅ **Channel Pengiriman**

Reminder dikirim melalui:
- **WhatsApp**: Menggunakan sistem WhatsApp yang sudah terintegrasi
- **Email**: Menggunakan sistem email yang sudah terintegrasi

### ✅ **Cron Job Reminder**

Reminder diproses oleh cron job yang berjalan **setiap hari jam 6:00 pagi GMT+7**:

**Endpoint**: `/api/cron/payment-reminder`

**Jadwal**: Setiap hari jam 06:00 WIB

**Fungsi**:
- Check semua `ScheduledReminder` yang `scheduledAt <= today`
- Kirim reminder untuk yang status `PENDING`
- Update status menjadi `SENT` setelah berhasil dikirim
- Retry mechanism: maksimal 3 kali jika gagal

## 🚀 Cara Menggunakan

### 1. **Manual Test**

```bash
curl http://localhost:3000/api/cron/generate-transition-invoices
```

### 2. **Production**

```bash
curl https://yourdomain.com/api/cron/generate-transition-invoices
```

### 3. **Setup Cron Job (Opsional)**

Jika ingin otomatis berjalan setiap hari:

```bash
# Tambahkan ke crontab
0 2 * * * curl -X GET "https://yourdomain.com/api/cron/generate-transition-invoices" >> /var/log/transition-invoices.log 2>&1
```

**Note**: Disarankan berjalan sebelum cron job utama (`check-due`) untuk handle masa transisi.

## 📝 Log Output

Endpoint akan menghasilkan log detail:

```
[Transition Invoices] Looking for subscriptions with nextBillingDate <= 2025-12-05T23:59:59.999Z
[Transition Invoices] Found 10 subscriptions that need invoice generation
[Transition Invoices] Generating invoice for subscription sub_123
[Transition Invoices]   - User: John Doe (user_456)
[Transition Invoices]   - nextBillingDate: 2025-12-05T00:00:00.000Z
[Transition Invoices]   - Price: 175000
[Transition Invoices] ✅ Payment reminders scheduled for invoice INV-2025-12-001
[Transition Invoices] ✅ Invoice generated successfully
[Transition Invoices]   - Invoice ID: inv_789
[Transition Invoices]   - Invoice Number: INV-2025-12-001
[Transition Invoices]   - Invoice dueDate: 2025-12-05T00:00:00.000Z
[Transition Invoices]   - Next billing date updated to: 2026-01-04T00:00:00.000Z
```

## ⚠️ Catatan Penting

1. **Masa Transisi**: Endpoint ini khusus untuk masa transisi. Setelah semua subscription sudah ter-handle, sistem normal (H-5) akan mengambil alih.

2. **Duplikasi**: Endpoint sudah memiliki proteksi duplikasi berdasarkan `dueDate`. Invoice yang sudah ada tidak akan di-generate ulang.

3. **Notifikasi**: Setiap invoice yang di-generate akan otomatis di-schedule untuk reminder. Tidak perlu setup manual.

4. **Rate Limiting**: Sistem reminder sudah menggunakan rate limiting 20 detik untuk mencegah WhatsApp ban.

5. **Error Handling**: Jika terjadi error saat generate invoice untuk satu subscription, proses akan continue untuk subscription lainnya.

## 🔍 Verifikasi

Setelah menjalankan endpoint, verifikasi:

1. **Check Invoice**: Pastikan invoice ter-generate dengan benar
2. **Check Reminders**: Pastikan `ScheduledReminder` ter-create untuk invoice yang baru
3. **Check nextBillingDate**: Pastikan `nextBillingDate` ter-update setelah invoice dibuat
4. **Check Log**: Review log untuk memastikan tidak ada error

## 📊 Monitoring

Monitor endpoint ini dengan:
- Check response summary (generated vs skipped)
- Review log untuk error
- Monitor jumlah invoice yang di-generate setiap hari
- Pastikan tidak ada duplikasi invoice


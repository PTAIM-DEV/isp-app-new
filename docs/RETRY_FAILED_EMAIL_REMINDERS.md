# Retry Failed Email Reminders

## 📋 Overview

Endpoint untuk retry email reminder yang belum terkirim. Endpoint ini akan:

1. ✅ Mencari semua `ScheduledReminder` dengan status `PENDING` atau `FAILED` yang `emailSent = false`
2. ✅ Retry kirim email menggunakan email server baru dari `.env`
3. ✅ Update status reminder setelah berhasil/gagal
4. ✅ Rate limiting 2 detik antar email (lebih cepat dari WhatsApp)
5. ✅ Skip invoice yang sudah dibayar atau user tanpa email

## 🔗 Endpoint

**URL**: `GET /api/cron/retry-failed-email-reminders`

**Method**: `GET`

**Authentication**: Tidak diperlukan (cron job endpoint)

## 🔄 Flow

### 1. **Query Failed Email Reminders**

Mencari reminder dengan kriteria:
- `status = 'PENDING'` dan `emailSent = false`, ATAU
- `status = 'FAILED'` dan `emailSent = false` dan `retryCount < 3`

### 2. **Filter & Skip**

Skip reminder jika:
- Invoice sudah dibayar (`status = 'PAID'`) → Update status ke `CANCELLED`
- User tidak ada email → Skip dan log error

### 3. **Retry Send Email**

Untuk setiap reminder:
- Panggil `sendPaymentReminder()` yang akan kirim email dan WhatsApp
- Update `emailSent = true` jika email berhasil
- Update `retryCount` dan `status` jika masih gagal
- Rate limiting: tunggu 2 detik sebelum email berikutnya

### 4. **Response**

```json
{
  "message": "Email retry process completed",
  "summary": {
    "totalFound": 15,
    "success": 12,
    "failed": 3
  },
  "results": [
    {
      "reminderId": "rem_123",
      "invoiceId": "inv_456",
      "invoiceNumber": "INV-2025-12-001",
      "reminderType": "H-5",
      "userEmail": "user@example.com",
      "userName": "John Doe",
      "status": "success"
    },
    {
      "reminderId": "rem_124",
      "invoiceId": "inv_457",
      "invoiceNumber": "INV-2025-12-002",
      "reminderType": "H-2",
      "userEmail": "user2@example.com",
      "userName": "Jane Smith",
      "status": "failed",
      "error": "Email sending failed"
    }
  ]
}
```

## 📊 Email Server Configuration

### ✅ **Menggunakan Email Server Baru dari .env**

Endpoint ini akan menggunakan email server yang dikonfigurasi di `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

**Penting**: 
- Transporter akan dibuat ulang setiap kali untuk memastikan menggunakan konfigurasi terbaru dari `.env`
- Jika Anda sudah mengganti email server di `.env`, transporter akan otomatis menggunakan server baru

### ✅ **Rate Limiting**

- **Email**: 2 detik antar pengiriman (lebih cepat dari WhatsApp)
- **WhatsApp**: 20 detik antar pengiriman (jika juga dikirim)

## 🚀 Cara Menggunakan

### 1. **Pastikan Email Server Sudah Di-Update di .env**

```bash
# Edit .env file
SMTP_HOST=smtp.newserver.com
SMTP_PORT=587
SMTP_USER=new_email@example.com
SMTP_PASS=new_password
SMTP_FROM=new_email@example.com
```

### 2. **Restart Application (Jika Perlu)**

Jika aplikasi sudah berjalan, restart untuk memastikan `.env` ter-load:

```bash
# Jika menggunakan PM2
pm2 restart isp-app

# Jika menggunakan npm/yarn
# Stop dan start ulang aplikasi
```

### 3. **Jalankan Endpoint**

```bash
# Test manual
curl http://localhost:3000/api/cron/retry-failed-email-reminders

# Production
curl https://yourdomain.com/api/cron/retry-failed-email-reminders
```

### 4. **Check Response**

Response akan menunjukkan:
- Berapa banyak reminder yang ditemukan
- Berapa banyak yang berhasil dikirim
- Berapa banyak yang masih gagal
- Detail setiap reminder (success/failed)

## 📝 Log Output

Endpoint akan menghasilkan log detail:

```
[Retry Email Reminders] Starting retry process...
[Retry Email Reminders] Found 15 reminders with failed email
[Retry Email Reminders] Retrying email for reminder rem_123 (1/15)
[Retry Email Reminders]   - Invoice: INV-2025-12-001
[Retry Email Reminders]   - User: John Doe (john@example.com)
[Retry Email Reminders]   - Reminder Type: H-5
[Email] Message sent successfully: <message-id>
[Retry Email Reminders] ✅ Email sent successfully
[Retry Email Reminders] Completed: 12 succeeded, 3 failed
```

## ⚠️ Catatan Penting

1. **Email Server**: Endpoint akan menggunakan email server yang dikonfigurasi di `.env`. Pastikan sudah di-update sebelum menjalankan.

2. **Retry Limit**: Reminder dengan `retryCount >= 3` tidak akan di-retry lagi (status tetap `FAILED`).

3. **Invoice Paid**: Reminder untuk invoice yang sudah dibayar akan di-skip dan status di-update ke `CANCELLED`.

4. **No Email**: Reminder untuk user tanpa email akan di-skip dan dicatat sebagai failed.

5. **Rate Limiting**: Email dikirim dengan rate limiting 2 detik untuk menghindari spam detection.

6. **WhatsApp**: Jika `sendPaymentReminder()` juga mengirim WhatsApp, WhatsApp akan dikirim juga (dengan rate limiting sendiri).

## 🔍 Verifikasi

Setelah menjalankan endpoint, verifikasi:

1. **Check Response**: Pastikan `success` count sesuai dengan email yang berhasil dikirim
2. **Check Email**: Pastikan email benar-benar sampai ke inbox pelanggan
3. **Check Database**: 
   ```sql
   SELECT * FROM "ScheduledReminder" 
   WHERE "emailSent" = false 
   AND "status" IN ('PENDING', 'FAILED')
   ORDER BY "scheduledAt" ASC;
   ```
4. **Check Log**: Review log untuk error detail jika ada yang masih gagal

## 🐛 Troubleshooting

### Email Masih Gagal

1. **Check SMTP Configuration**:
   ```bash
   # Pastikan .env sudah benar
   cat .env | grep SMTP
   ```

2. **Check Email Server Logs**:
   - Review log aplikasi untuk error detail
   - Check apakah SMTP server menerima koneksi

3. **Test Email Connection**:
   ```bash
   # Test koneksi SMTP manual
   telnet smtp.gmail.com 587
   ```

4. **Check Email Credentials**:
   - Pastikan username dan password benar
   - Untuk Gmail, gunakan App Password, bukan password biasa

### Email Tidak Terkirim Tapi Tidak Ada Error

1. **Check Spam Folder**: Email mungkin masuk ke spam
2. **Check Email Server**: Pastikan email server tidak memblokir pengiriman
3. **Check Rate Limit**: Email server mungkin membatasi jumlah email per waktu tertentu

## 📊 Monitoring

Monitor endpoint ini dengan:
- Check response summary (success vs failed)
- Review log untuk error detail
- Monitor jumlah reminder yang berhasil di-retry
- Track email delivery rate


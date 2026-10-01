# Sistem Reminder Pembayaran

## 📋 Overview

Sistem reminder pembayaran otomatis yang mengirimkan pengingat kepada pelanggan melalui WhatsApp dan Email. Sistem berjalan **sekali sehari** pada jam **6:00 pagi GMT+7** untuk mengecek semua invoice yang perlu di-notifikasi.

## 🔄 Flow Sistem

### 1. **Pembuatan Invoice (H-5)**

Invoice dibuat **5 hari sebelum tanggal jatuh tempo** (`nextBillingDate`):
- Invoice dibuat dengan `dueDate = nextBillingDate`
- Link pembayaran Xendit valid selama **10 hari** dari tanggal pembuatan
- Invoice link dibuat otomatis saat invoice dibuat

**Endpoint**: `/api/cron/check-due` (cron job harian)

### 2. **Reminder Processing (Setiap Pagi Jam 6:00 GMT+7)**

Setiap pagi jam 6:00, sistem akan:
1. **Mengecek semua invoice** yang perlu di-notifikasi berdasarkan tanggal jatuh tempo
2. **Mengirim reminder** untuk invoice yang sesuai dengan kriteria:
   - **H-5**: Invoice yang akan jatuh tempo dalam 5 hari
   - **H-2**: Invoice yang akan jatuh tempo dalam 2 hari
   - **H-0**: Invoice yang jatuh tempo hari ini
   - **D+1**: Invoice yang sudah terlambat 1 hari
   - **D+2**: Invoice yang sudah terlambat 2 hari
   - **D+5**: Invoice yang sudah terlambat 5 hari (akan trigger auto-block)

3. **Rate Limiting**: Sistem menunggu **20 detik** antar pengiriman untuk menghindari WhatsApp ban

**Endpoint**: `/api/cron/payment-reminder` (cron job harian jam 6:00 GMT+7)

### 3. **Reminder Types**

#### **H-5 (5 Hari Sebelum Jatuh Tempo)**
- Reminder pertama yang dikirim
- Memberikan waktu cukup bagi pelanggan untuk membayar
- Dikirim via WhatsApp dan Email

#### **H-2 (2 Hari Sebelum Jatuh Tempo)**
- Reminder kedua yang lebih urgent
- Dikirim via WhatsApp dan Email

#### **H-0 (Hari Jatuh Tempo)**
- Reminder pada hari jatuh tempo
- Paling urgent sebelum overdue
- Dikirim via WhatsApp dan Email

#### **D+1 (1 Hari Terlambat)**
- Reminder untuk invoice yang sudah terlambat 1 hari
- Warning bahwa invoice sudah overdue
- Dikirim via WhatsApp dan Email

#### **D+2 (2 Hari Terlambat)**
- Reminder untuk invoice yang sudah terlambat 2 hari
- Warning bahwa layanan akan diblokir jika tidak dibayar
- Dikirim via WhatsApp dan Email

#### **D+5 (5 Hari Terlambat)**
- Reminder terakhir sebelum auto-block
- **Auto-block user** setelah reminder dikirim
- Update invoice status ke `OVERDUE`
- Dikirim via WhatsApp dan Email

## ⚙️ Konfigurasi

### 1. **SMTP Configuration**

Tambahkan konfigurasi SMTP di `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

**Catatan**: Untuk Gmail, gunakan App Password, bukan password biasa.

### 2. **Setup Cron Job**

Jalankan script untuk setup cron job:

```bash
bash scripts/setup-reminder-cron.sh
```

Script akan:
- Membaca `APP_URL` atau `NEXT_PUBLIC_APP_URL` dari `.env`
- Menambahkan cron job untuk jam 6:00 pagi GMT+7
- Menyimpan log di `logs/payment-reminder-cron.log`

Atau tambahkan manual ke crontab:

```bash
# Reminder pembayaran (setiap hari jam 06:00 WIB GMT+7)
# Pastikan server timezone di-set ke Asia/Jakarta
0 6 * * * curl -X GET "https://yourdomain.com/api/cron/payment-reminder" >> /path/to/logs/payment-reminder-cron.log 2>&1
```

**Catatan Penting:**
- Cron job berjalan setiap hari jam **6:00 pagi GMT+7**
- Pastikan server timezone di-set ke `Asia/Jakarta` (GMT+7)
- Check timezone dengan: `timedatectl` (Linux) atau `date` (macOS)

### 3. **Template Customization**

1. Buka `/admin/settings`
2. Pilih tab **"Template Reminder"**
3. Edit template untuk H-5, H-2, dan H-0
4. Template WhatsApp dan Email dapat dikustomisasi secara terpisah

## 📝 Template Variables

Template menggunakan variabel berikut yang akan diganti dengan data aktual:

- `{{customerName}}` - Nama pelanggan
- `{{invoiceNumber}}` - Nomor invoice
- `{{amount}}` - Jumlah pembayaran (format: Rp 1.000.000)
- `{{dueDate}}` - Tanggal jatuh tempo (format: Senin, 1 Januari 2025)
- `{{paymentLink}}` - Link pembayaran Xendit
- `{{daysUntilDue}}` - Hari tersisa sampai jatuh tempo

## 📧 Email Template

Email menggunakan HTML format dengan styling yang sudah disediakan. Template default sudah responsive dan profesional.

## 💬 WhatsApp Template

WhatsApp menggunakan plain text dengan emoji untuk visual appeal. Template default sudah sopan dan hangat.

## 🔍 Xendit Invoice Duration

Invoice link Xendit valid selama **10 hari** dari tanggal pembuatan:
- Parameter: `invoice_duration: 864000` (detik)
- Invoice dibuat H-5, jadi link valid sampai H+5 setelah due date

## 📊 Monitoring

Cron job endpoint mengembalikan statistik:
- Total invoice yang perlu reminder per kategori (H-5, H-2, H-0, D+1, D+2, D+5)
- Jumlah reminder WhatsApp yang berhasil dikirim per kategori
- Jumlah reminder Email yang berhasil dikirim per kategori
- Jumlah user yang di-block (untuk D+5)

Contoh response:
```json
{
  "message": "Payment reminders processed",
  "results": {
    "h5": { "total": 5, "whatsapp": 5, "email": 4 },
    "h2": { "total": 3, "whatsapp": 3, "email": 3 },
    "h0": { "total": 2, "whatsapp": 2, "email": 2 },
    "d1": { "total": 1, "whatsapp": 1, "email": 1 },
    "d2": { "total": 0, "whatsapp": 0, "email": 0 },
    "d5": { "total": 1, "whatsapp": 1, "email": 1, "blocked": 1 }
  },
  "totalProcessed": 12,
  "timestamp": "2025-01-15T06:00:00.000Z"
}
```

### View Logs

```bash
# View cron execution logs
tail -f logs/payment-reminder-cron.log

# View recent logs
tail -n 100 logs/payment-reminder-cron.log
```

## ⚙️ Rate Limiting

Sistem menggunakan **rate limiting 20 detik** antar pengiriman untuk:
- Menghindari WhatsApp ban/rate limit
- Memberikan waktu cukup untuk setiap pengiriman
- Memastikan stabilitas sistem

**Perhitungan waktu:**
- Jika ada 10 invoice yang perlu reminder
- Total waktu pengiriman: ~3-4 menit (10 × 20 detik)
- Setiap reminder dikirim dengan delay 20 detik

## ⚠️ Catatan Penting

1. **SMTP harus dikonfigurasi** untuk email reminder berfungsi
2. **WhatsApp worker harus berjalan** untuk WhatsApp reminder berfungsi
3. **Cron job harus di-setup** untuk reminder otomatis (jam 6:00 pagi GMT+7)
4. **Server timezone harus di-set ke Asia/Jakarta** (GMT+7)
5. Template default sudah tersedia jika belum dikustomisasi
6. Invoice dibuat H-5 sebelum due date untuk memberikan waktu cukup bagi pelanggan
7. **Rate limiting 20 detik** diterapkan untuk menghindari WhatsApp ban
8. Sistem **tidak lagi polling setiap menit**, hanya sekali sehari untuk efisiensi

## 🛠️ Troubleshooting

### Email tidak terkirim
- Cek konfigurasi SMTP di `.env`
- Pastikan App Password benar (untuk Gmail)
- Cek log untuk error SMTP

### WhatsApp tidak terkirim
- Pastikan WhatsApp worker berjalan (`npm run worker`)
- Cek status koneksi WhatsApp
- Cek log untuk error pengiriman

### Reminder tidak terkirim
- Pastikan cron job sudah di-setup
- Cek log cron job
- Pastikan invoice memiliki `xenditUrl` (link pembayaran)



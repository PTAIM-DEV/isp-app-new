# Analisis Sistem Notifikasi Jatuh Tempo

## 📋 Ringkasan Eksekutif

Sistem ini menggunakan **dual-channel notification system** (WhatsApp + Email) dengan **automated cron jobs** untuk mengirimkan reminder pembayaran kepada pelanggan pada berbagai tahap sebelum dan sesudah jatuh tempo. Sistem dirancang dengan **queue-based architecture** untuk WhatsApp dan **direct SMTP** untuk Email.

---

## 🏗️ Arsitektur Sistem

### 1. **Komponen Utama**

```
┌─────────────────────────────────────────────────────────────┐
│                    CRON JOB SCHEDULER                       │
│  (Setiap hari jam 09:00 WIB via crontab/external service)   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         /api/cron/payment-reminder (GET endpoint)           │
│  - Mencari invoice yang perlu reminder berdasarkan dueDate  │
│  - Mengkategorikan berdasarkan timing (H-5, H-2, H-0, D+1, │
│    D+2, D+5)                                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           sendPaymentReminder() Function                     │
│  - Mengambil template dari database atau default            │
│  - Replace template variables dengan data invoice           │
│  - Mengirim via WhatsApp dan Email secara paralel           │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  WhatsApp Queue  │          │   Email Direct   │
│  (Database)      │          │   (SMTP)         │
└──────────────────┘          └──────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  WhatsApp Worker │          │   Email Sent     │
│  (Polling Queue) │          │   (Immediate)    │
└──────────────────┘          └──────────────────┘
```

---

## ⏰ Timeline Notifikasi

### **Sebelum Jatuh Tempo (Pre-Due Reminders)**

| Timing | Deskripsi | Kondisi Query |
|--------|-----------|---------------|
| **H-5** | 5 hari sebelum jatuh tempo | `dueDate >= today+5 AND dueDate < today+6` |
| **H-2** | 2 hari sebelum jatuh tempo | `dueDate >= today+2 AND dueDate < today+3` |
| **H-0** | Hari jatuh tempo | `dueDate >= today AND dueDate < today+1` |

### **Setelah Jatuh Tempo (Overdue Reminders)**

| Timing | Deskripsi | Kondisi Query | Action Khusus |
|--------|-----------|---------------|--------------|
| **D+1** | 1 hari terlambat | `dueDate >= today-1 AND dueDate < today` | - |
| **D+2** | 2 hari terlambat | `dueDate >= today-2 AND dueDate < today-1` | Warning pemblokiran |
| **D+5** | 5 hari terlambat | `dueDate >= today-5 AND dueDate < today-4` | **Auto-block user** |

---

## 🔄 Flow Detail Sistem

### **Phase 1: Invoice Generation (H-5)**

**Endpoint**: `/api/cron/check-due` (cron job harian)

**Proses**:
1. Mencari subscription dengan `nextBillingDate` yang akan jatuh tempo dalam 5 hari
2. Membuat invoice dengan:
   - `dueDate = nextBillingDate`
   - `status = UNPAID`
   - Link pembayaran Xendit (valid 10 hari)
3. Update `nextBillingDate` untuk billing cycle berikutnya

**File**: `src/app/api/cron/check-due/route.ts` (baris 105-181)

---

### **Phase 2: Reminder Processing**

**Endpoint**: `/api/cron/payment-reminder` (cron job harian jam 09:00)

**Proses**:
1. **Query Invoices** berdasarkan timing:
   ```typescript
   // Contoh untuk H-5
   const h5Date = new Date(today);
   h5Date.setDate(h5Date.getDate() + 5);
   
   const h5Invoices = await prisma.invoice.findMany({
       where: {
           status: { in: ['UNPAID', 'OVERDUE'] },
           dueDate: {
               gte: h5Date,
               lt: new Date(h5Date.getTime() + 24 * 60 * 60 * 1000)
           }
       },
       include: { user: true }
   });
   ```

2. **Send Reminders** untuk setiap invoice:
   ```typescript
   for (const invoice of h5Invoices) {
       const result = await sendPaymentReminder(invoice.id, 'H-5');
       // Track results: whatsapp success, email success
   }
   ```

**File**: `src/app/api/cron/payment-reminder/route.ts`

---

### **Phase 3: Template Processing**

**File**: `src/lib/payment-reminder.ts`

**Proses**:
1. **Get Template** dari database atau default:
   ```typescript
   async function getReminderTemplate(reminderType: 'H-5' | 'H-2' | ...)
   ```
   - Mencari di `SystemSetting` dengan key:
     - `reminder_whatsapp_H-5`
     - `reminder_email_subject_H-5`
     - `reminder_email_body_H-5`

2. **Replace Variables**:
   ```typescript
   const variables = {
       customerName: invoice.user.name,
       invoiceNumber: invoice.invoiceNumber,
       amount: `Rp ${Number(invoice.amount).toLocaleString('id-ID')}`,
       dueDate: formattedDate,
       paymentLink: invoice.xenditUrl,
       daysUntilDue: calculatedDays
   };
   ```

3. **Template Variables**:
   - `{{customerName}}`
   - `{{invoiceNumber}}`
   - `{{amount}}`
   - `{{dueDate}}`
   - `{{paymentLink}}`
   - `{{daysUntilDue}}`

---

### **Phase 4: WhatsApp Delivery**

**File**: `src/lib/payment-reminder.ts` (baris 69-96)

**Proses**:
1. **Clean Phone Number**:
   ```typescript
   // Convert: 081234567890 → 6281234567890@s.whatsapp.net
   let cleanPhone = phone.replace(/\D/g, '');
   if (cleanPhone.startsWith('0')) {
       cleanPhone = '62' + cleanPhone.slice(1);
   }
   const jid = `${cleanPhone}@s.whatsapp.net`;
   ```

2. **Queue Message**:
   ```typescript
   await prisma.whatsAppOutgoing.create({
       data: {
           jid,
           content: message,
           status: 'PENDING'
       }
   });
   ```

3. **Worker Processing** (File: `worker/whatsapp.ts` baris 158-202):
   - Polling setiap 1 detik untuk pesan dengan `status = 'PENDING'`
   - Mengambil maksimal 10 pesan per batch
   - Mengirim via Baileys WhatsApp Web API
   - Update status menjadi `'SENT'` atau `'FAILED'`
   - Retry otomatis untuk connection errors (tetap `PENDING`)

**Keuntungan Queue System**:
- ✅ Decoupling: Reminder tidak bergantung pada koneksi WhatsApp real-time
- ✅ Retry mechanism: Pesan gagal tetap di queue untuk retry
- ✅ Rate limiting: Batch processing mencegah spam
- ✅ Monitoring: Status tracking di database

---

### **Phase 5: Email Delivery**

**File**: `src/lib/payment-reminder.ts` (baris 101-112), `src/lib/email.ts`

**Proses**:
1. **Direct SMTP Send**:
   ```typescript
   await sendEmail({
       to: email,
       subject: emailSubject,
       html: emailBody
   });
   ```

2. **SMTP Configuration** (via `.env`):
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   SMTP_FROM=your_email@gmail.com
   ```

3. **Email Template**:
   - HTML format dengan styling CSS inline
   - Responsive design
   - Professional appearance dengan color coding berdasarkan urgency

**Perbedaan dengan WhatsApp**:
- ❌ Tidak ada queue system (direct send)
- ❌ Tidak ada retry mechanism built-in
- ✅ Immediate delivery
- ✅ HTML formatting support

---

## 🚨 Auto-Blocking Mechanism

**Trigger**: D+5 (5 hari terlambat)

**File**: `src/app/api/cron/payment-reminder/route.ts` (baris 154-182)

**Proses**:
```typescript
// Send D+5 reminders (5 days overdue) and block user
for (const invoice of d5Invoices) {
    // 1. Send reminder
    await sendPaymentReminder(invoice.id, 'D+5');
    
    // 2. Soft block user
    if (invoice.user.status !== 'BLOCKED' && invoice.user.status !== 'INACTIVE') {
        await prisma.user.update({
            where: { id: invoice.userId },
            data: { status: 'BLOCKED' }
        });
        
        // 3. Update invoice status
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'OVERDUE' }
        });
    }
}
```

**Catatan**: 
- Soft block hanya mengubah status user di database
- Hard block (Mikrotik) dilakukan di endpoint `/api/cron/check-due` untuk invoice yang sudah overdue

---

## 📊 Database Schema

### **WhatsAppOutgoing Table**
```prisma
model WhatsAppOutgoing {
    id        String   @id @default(cuid())
    jid       String   // Format: 6281234567890@s.whatsapp.net
    content   String   @db.Text
    status    String   // PENDING, SENT, FAILED
    createdAt DateTime @default(now())
}
```

### **SystemSetting Table** (untuk template)
```prisma
model SystemSetting {
    key         String  @id
    value       String  @db.Text
    description String?
}
```

**Template Keys**:
- `reminder_whatsapp_H-5`
- `reminder_whatsapp_H-2`
- `reminder_whatsapp_H-0`
- `reminder_whatsapp_D_plus_1`
- `reminder_whatsapp_D_plus_2`
- `reminder_whatsapp_D_plus_5`
- `reminder_email_subject_H-5`
- `reminder_email_body_H-5`
- ... (dan seterusnya)

---

## ⚙️ Konfigurasi & Setup

### **1. Cron Job Setup**

**Manual Setup**:
```bash
# Tambahkan ke crontab
0 9 * * * curl -X GET "https://yourdomain.com/api/cron/payment-reminder" > /dev/null 2>&1
```

**Script Setup**:
```bash
bash scripts/setup-reminder-cron.sh
```

**External Cron Service** (Alternatif):
- cron-job.org
- EasyCron
- UptimeRobot

### **2. SMTP Configuration**

Tambahkan ke `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password  # Gmail App Password, bukan password biasa
SMTP_FROM=your_email@gmail.com
```

### **3. WhatsApp Worker**

Jalankan worker untuk memproses queue:
```bash
npm run worker
# atau
node worker/whatsapp.js
```

Worker harus berjalan secara kontinyu untuk memproses pesan WhatsApp.

---

## 🔍 Monitoring & Logging

### **Response dari Cron Job**

```json
{
    "message": "Payment reminders sent",
    "results": {
        "h5": { "total": 10, "whatsapp": 9, "email": 8 },
        "h2": { "total": 5, "whatsapp": 5, "email": 4 },
        "h0": { "total": 3, "whatsapp": 3, "email": 3 },
        "d1": { "total": 2, "whatsapp": 2, "email": 2 },
        "d2": { "total": 1, "whatsapp": 1, "email": 1 },
        "d5": { "total": 1, "whatsapp": 1, "email": 1, "blocked": 1 }
    },
    "timestamp": "2025-01-20T09:00:00.000Z"
}
```

### **Log Messages**

- `[Reminder] WhatsApp message queued for {phone}`
- `[Reminder] Sent {type} reminder for invoice {number}: {whatsapp: true, email: true}`
- `[Payment Reminder] User {name} blocked due to D+5 overdue`
- `[Email] Message sent: {messageId}`

---

## ⚠️ Potensi Masalah & Solusi

### **1. WhatsApp Worker Tidak Berjalan**

**Gejala**: Pesan WhatsApp tidak terkirim, status tetap `PENDING`

**Solusi**:
- Pastikan worker berjalan: `npm run worker`
- Cek koneksi WhatsApp (scan QR code jika perlu)
- Monitor log untuk error connection

### **2. Email Tidak Terkirim**

**Gejala**: Email tidak sampai ke pelanggan

**Solusi**:
- Cek konfigurasi SMTP di `.env`
- Pastikan menggunakan App Password untuk Gmail
- Cek log untuk error SMTP
- Verifikasi email pelanggan valid

### **3. Reminder Terkirim Berulang**

**Gejala**: Pelanggan menerima reminder yang sama berkali-kali

**Penyebab**: 
- Cron job berjalan lebih dari sekali per hari
- Query tidak memfilter invoice yang sudah dibayar dengan benar

**Solusi**:
- Pastikan hanya ada 1 cron job yang aktif
- Verifikasi query hanya mengambil invoice dengan `status IN ['UNPAID', 'OVERDUE']`
- Pastikan invoice status diupdate ke `PAID` setelah pembayaran

### **4. Template Tidak Ter-update**

**Gejala**: Perubahan template di Settings tidak terpakai

**Solusi**:
- Pastikan key di database sesuai format: `reminder_whatsapp_H-5`
- Cek apakah template di database benar-benar tersimpan
- Clear cache jika ada

### **5. Timing Tidak Akurat**

**Gejala**: Reminder dikirim pada waktu yang salah

**Penyebab**:
- Timezone server berbeda dengan timezone bisnis
- Query menggunakan `today` tanpa memperhatikan timezone

**Solusi**:
- Set timezone server ke WIB (Asia/Jakarta)
- Atau gunakan timezone-aware date calculation di query

---

## 🎯 Best Practices

### **1. Template Customization**

- Gunakan variabel template untuk personalisasi
- Test template sebelum deploy
- Pastikan link pembayaran valid
- Gunakan tone yang sopan dan profesional

### **2. Monitoring**

- Setup alert untuk cron job failure
- Monitor success rate WhatsApp vs Email
- Track blocked users untuk analisis
- Review log secara berkala

### **3. Performance**

- WhatsApp queue system mencegah rate limiting
- Batch processing (10 pesan per batch) untuk efisiensi
- Email langsung dikirim (tidak perlu queue untuk SMTP)

### **4. Error Handling**

- WhatsApp: Retry untuk connection errors
- Email: Log error untuk debugging
- Skip invoice yang sudah `PAID`
- Graceful degradation jika salah satu channel gagal

---

## 📈 Metrik Kunci

### **Success Rate**
- WhatsApp delivery rate: `whatsapp_sent / whatsapp_total`
- Email delivery rate: `email_sent / email_total`

### **Timing Accuracy**
- Reminder dikirim tepat pada H-5, H-2, H-0
- Overdue reminder tepat pada D+1, D+2, D+5

### **Auto-Block Rate**
- Jumlah user yang diblokir otomatis di D+5
- Conversion rate setelah reminder (payment setelah reminder)

---

## 🔮 Rekomendasi Peningkatan

### **1. Retry Mechanism untuk Email**
- Implementasi queue system untuk email juga
- Retry dengan exponential backoff
- Dead letter queue untuk email yang gagal terus

### **2. Template A/B Testing**
- Test berbagai variasi template
- Track conversion rate per template
- Optimize berdasarkan data

### **3. Multi-Language Support**
- Template dalam bahasa Indonesia dan Inggris
- Auto-detect language preference user

### **4. SMS Fallback**
- Jika WhatsApp gagal, kirim via SMS
- Integrasi dengan SMS gateway (Twilio, dll)

### **5. Analytics Dashboard**
- Visualisasi success rate per channel
- Timeline reminder per customer
- Conversion tracking

### **6. Smart Timing**
- Kirim reminder pada waktu optimal (misal: pagi hari)
- Hindari mengirim di malam hari atau weekend
- Personalisasi berdasarkan timezone customer

---

## 📝 Kesimpulan

Sistem notifikasi jatuh tempo ini dirancang dengan baik dengan:

✅ **Dual-channel delivery** (WhatsApp + Email) untuk redundancy  
✅ **Queue-based architecture** untuk WhatsApp yang reliable  
✅ **Template customization** melalui database  
✅ **Auto-blocking mechanism** untuk overdue yang ekstrem  
✅ **Comprehensive logging** untuk monitoring  

**Area untuk improvement**:
- Email retry mechanism
- Better error handling dan alerting
- Analytics dashboard
- Multi-language support

Sistem ini sudah production-ready dengan beberapa area yang bisa dioptimalkan lebih lanjut.









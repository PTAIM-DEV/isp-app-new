# Welcome Message Tracking

## 📋 Overview

Sistem tracking untuk welcome message yang dikirim ke pelanggan baru. Sistem ini mencatat apakah welcome message sudah dikirim melalui WhatsApp dan Email, beserta timestamp pengirimannya.

## 🎯 Fitur

1. **Flag Tracking**: Field di User model untuk track status pengiriman
2. **Log Display**: Menampilkan riwayat pengiriman welcome message di detail pelanggan
3. **Auto-backfill**: Otomatis mengisi flag dari log WhatsAppOutgoing yang sudah ada

## 📊 Database Schema

### User Model - New Fields

```prisma
model User {
  // ... existing fields ...
  
  // Welcome message tracking
  welcomeWhatsappSent   Boolean   @default(false)
  welcomeWhatsappSentAt DateTime?
  welcomeEmailSent      Boolean   @default(false)
  welcomeEmailSentAt    DateTime?
}
```

## 🔄 Flow Pengiriman Welcome Message

### 1. **Manual Send via Admin Panel**

**File**: `src/app/admin/customers/[id]/send-welcome-button.tsx`

- Admin klik tombol "Kirim Welcome Message"
- System check apakah sudah pernah dikirim (cek flag + log)
- Jika belum, kirim welcome message
- Update flag `welcomeWhatsappSent = true` dan `welcomeWhatsappSentAt = now()`

### 2. **Auto Send saat Create Customer**

**File**: `src/app/admin/customers/actions.ts`

- Saat customer baru dibuat, welcome message otomatis dikirim (async)
- Flag di-update setelah message berhasil dikirim

### 3. **Worker Update Flag**

**File**: `worker/whatsapp.ts`

- Worker mengirim message dari queue `WhatsAppOutgoing`
- Setelah berhasil dikirim, update status menjadi `SENT`
- Jika message adalah welcome message (mengandung "Selamat datang"), update flag user

## 📝 Logic Check Welcome Message

### Check Existing Message

**File**: `src/lib/whatsapp-welcome.ts`

```typescript
// Check flag first (faster)
if (user.welcomeWhatsappSent) {
    return false; // Already sent
}

// Check WhatsAppOutgoing log as backup
const existingWelcome = await prisma.whatsAppOutgoing.findFirst({
    where: {
        jid,
        content: { contains: 'Selamat datang' },
        status: 'SENT',
    },
});

if (existingWelcome) {
    // Backfill flag if found in log
    await prisma.user.update({
        where: { id: userId },
        data: {
            welcomeWhatsappSent: true,
            welcomeWhatsappSentAt: existingWelcome.createdAt,
        },
    });
    return false;
}
```

## 🎨 UI Display

### Welcome Message Log Component

**File**: `src/app/admin/customers/[id]/welcome-message-log.tsx`

Menampilkan:
- ✅ Status WhatsApp (Sudah dikirim / Belum dikirim)
- ✅ Status Email (Sudah dikirim / Belum dikirim)
- 📅 Timestamp pengiriman
- 📋 Riwayat pengiriman WhatsApp (dari WhatsAppOutgoing log)

### Location

Ditampilkan di halaman detail pelanggan (`/admin/customers/[id]`), di bagian atas sebelum informasi customer.

## 🔧 Migration

### Manual Migration Script

**File**: `prisma/migrations/manual_add_welcome_message_tracking.sql`

Script ini:
1. Menambahkan field baru ke User table
2. Backfill data existing dari WhatsAppOutgoing log

**Cara menjalankan:**
```bash
psql -d your_database -f prisma/migrations/manual_add_welcome_message_tracking.sql
```

## 📊 Data yang Ditampilkan

### Di Detail Pelanggan

1. **WhatsApp Status**
   - ✅ Sudah dikirim (dengan timestamp)
   - ❌ Belum dikirim

2. **Email Status**
   - ✅ Sudah dikirim (dengan timestamp)
   - ❌ Belum dikirim

3. **Riwayat Pengiriman WhatsApp**
   - List dari WhatsAppOutgoing yang mengandung "Selamat datang"
   - Menampilkan status (SENT, PENDING, FAILED)
   - Menampilkan timestamp dan content preview

## 🔍 Query Welcome Message Logs

### Get Welcome Message Logs for User

```typescript
const cleanPhone = user.phone.replace(/\D/g, '');
let cleanPhone = cleanPhone.startsWith('0') 
    ? '62' + cleanPhone.slice(1) 
    : (cleanPhone.startsWith('62') ? cleanPhone : '62' + cleanPhone);
const jid = `${cleanPhone}@s.whatsapp.net`;

const logs = await prisma.whatsAppOutgoing.findMany({
    where: {
        jid,
        content: { contains: 'Selamat datang' },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
});
```

## ⚠️ Catatan Penting

1. **Flag vs Log**: Flag digunakan untuk quick check, log digunakan untuk detail history
2. **Backfill**: System otomatis backfill flag dari log yang sudah ada
3. **Phone Number Format**: System handle berbagai format phone number (0xxx, 62xxx, dll)
4. **Email Welcome**: Belum diimplementasikan, field sudah disiapkan untuk future use

## 🚀 Future Enhancements

1. **Email Welcome Message**: Implementasi pengiriman welcome message via email
2. **Welcome Message Template**: Multiple templates untuk berbagai jenis customer
3. **Analytics**: Dashboard untuk melihat welcome message delivery rate
4. **Retry Mechanism**: Auto-retry jika welcome message gagal dikirim


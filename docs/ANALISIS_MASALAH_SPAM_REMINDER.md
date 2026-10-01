# Analisis Masalah Spam Reminder

## 📋 Overview

Analisis lengkap mengapa terjadi spamming reminder (WhatsApp dan Email) yang dikirim berulang kali ke pelanggan yang akan jatuh tempo.

## 🔍 Root Cause Analysis

### **Masalah 1: Duplicate Scheduling - TIDAK ADA CHECK DUPLICATE**

**Lokasi**: `/src/lib/reminder-scheduler.ts` baris 44-56

**Masalah**:
```typescript
// Create scheduled reminders in database
const createdReminders = await Promise.all(
    reminders.map(reminder =>
        prisma.scheduledReminder.create({
            data: {
                invoiceId,
                reminderType: reminder.reminderType,
                scheduledAt: reminder.scheduledAt,
                status: 'PENDING',
            },
        })
    )
);
```

**Dampak**:
- Setiap kali `schedulePaymentReminders()` dipanggil, akan **CREATE REMINDER BARU** tanpa check apakah sudah ada
- Jika invoice di-generate ulang atau `schedulePaymentReminders()` dipanggil beberapa kali, akan ada **MULTIPLE REMINDER** untuk invoice yang sama
- Setiap reminder akan dikirim oleh cron job → **SPAM**

**Contoh Skenario**:
1. Invoice dibuat → `schedulePaymentReminders()` dipanggil → Create 6 reminder (H-5, H-2, H-0, D+1, D+2, D+5)
2. Invoice di-generate ulang (karena bug atau manual) → `schedulePaymentReminders()` dipanggil lagi → Create 6 reminder LAGI
3. Sekarang ada **12 reminder** untuk invoice yang sama
4. Cron job akan kirim semua 12 reminder → **SPAM 2x**

### **Masalah 2: Multiple Cron Jobs Berjalan Bersamaan**

**Files**:
- `/src/app/api/cron/payment-reminder/route.ts` (Cron V1)
- `/src/app/api/cron/payment-reminder-v2/route.ts` (Cron V2)

**Masalah**:
- Ada **2 cron job berbeda** yang bisa berjalan bersamaan
- **Cron V1**: Query invoice berdasarkan `dueDate`, lalu create reminder record baru jika belum ada
- **Cron V2**: Query `ScheduledReminder` berdasarkan `scheduledAt`
- Jika keduanya berjalan bersamaan, bisa process reminder yang sama → **DUPLICATE SENDING**

**Flow Cron V1**:
```
1. Query invoice berdasarkan dueDate
2. Check apakah sudah ada ScheduledReminder dengan status SENT hari ini
3. Jika belum ada → Create ScheduledReminder baru
4. Kirim reminder
5. Update status ke SENT
```

**Flow Cron V2**:
```
1. Query ScheduledReminder dengan status PENDING dan scheduledAt <= today
2. Kirim reminder
3. Update status ke SENT
```

**Race Condition**:
- Cron V1 create reminder baru → status PENDING
- Cron V2 query reminder PENDING → process reminder
- Cron V1 juga process reminder yang sama
- **KEDUANYA KIRIM REMINDER** → **SPAM**

### **Masalah 3: Duplicate Check Tidak Cukup**

**Lokasi**: `/src/app/api/cron/payment-reminder/route.ts` baris 139-157

**Masalah**:
```typescript
// Check if reminder already sent today for this invoice + reminderType
const alreadySent = await prisma.scheduledReminder.findFirst({
    where: {
        invoiceId: item.invoiceId,
        reminderType: item.reminderType,
        status: 'SENT',
        sentAt: {
            gte: today,
            lte: todayEnd,
        },
    },
});
```

**Dampak**:
- Hanya check reminder dengan status `SENT`
- **TIDAK CHECK** reminder dengan status `PENDING` yang mungkin sedang di-process oleh cron job lain
- Jika cron V2 sudah process reminder (status masih PENDING karena belum di-update), cron V1 akan tetap process juga

### **Masalah 4: Retry Mechanism Menyebabkan Reschedule**

**Lokasi**: `/src/lib/reminder-scheduler.ts` baris 132-154

**Masalah**:
```typescript
export async function markReminderFailed(reminderId: string, error: string) {
    // ...
    scheduledAt: retryCount < maxRetries ? new Date(Date.now() + 5 * 60 * 1000) : reminder.scheduledAt,
    // Reschedule for retry (5 minutes later)
}
```

**Dampak**:
- Jika reminder gagal, akan di-reschedule 5 menit kemudian
- `scheduledAt` di-update ke waktu baru
- Cron job akan process reminder ini lagi → **KIRIM ULANG**
- Jika masih gagal, akan di-reschedule lagi → **SPAM BERULANG**

### **Masalah 5: Tidak Ada Unique Constraint di Database**

**Lokasi**: `prisma/schema.prisma` - Model `ScheduledReminder`

**Masalah**:
- Tidak ada unique constraint untuk `(invoiceId, reminderType, scheduledAt)`
- Bisa ada multiple reminder dengan kombinasi yang sama
- Tidak ada database-level protection untuk duplicate

### **Masalah 6: Invoice Di-Generate Ulang**

**Lokasi**: `/src/app/api/cron/check-due/route.ts` dan `/src/app/api/cron/generate-transition-invoices/route.ts`

**Masalah**:
- Jika invoice di-generate ulang untuk billing cycle yang sama, `schedulePaymentReminders()` akan dipanggil lagi
- Akan create reminder baru untuk invoice yang sama
- Tidak ada check apakah reminder sudah ada untuk invoice tersebut

### **Masalah 7: Worker Juga Menjalankan Reminder**

**Lokasi**: `/worker/reminder-processor.ts`

**Masalah**:
- Ada **worker** yang juga menjalankan reminder processor
- Worker call `/api/cron/payment-reminder-v2`
- Jika worker dan cron job berjalan bersamaan → **DUPLICATE EXECUTION**

**Flow**:
```
Jam 6:00:
  Cron job (server cron) → Call /api/cron/payment-reminder-v2
  Worker (background process) → Call /api/cron/payment-reminder-v2
  
Hasil:
  Reminder di-process 2x → SPAM
```

### **Masalah 8: Cron V1 Create Reminder Baru**

**Lokasi**: `/src/app/api/cron/payment-reminder/route.ts` baris 197-206

**Masalah**:
```typescript
if (!reminderRecord) {
    // Create new reminder record
    reminderRecord = await prisma.scheduledReminder.create({
        data: {
            invoiceId,
            reminderType,
            scheduledAt: new Date(),
            status: 'PENDING',
        },
    });
}
```

**Dampak**:
- Cron V1 **CREATE REMINDER BARU** jika belum ada
- Reminder sudah di-schedule saat invoice dibuat via `schedulePaymentReminders()`
- Cron V1 create reminder baru dengan `scheduledAt = now()` (bukan tanggal yang benar)
- Sekarang ada **2 REMINDER** untuk invoice yang sama:
  - Reminder dari `schedulePaymentReminders()` dengan `scheduledAt` yang benar
  - Reminder dari Cron V1 dengan `scheduledAt = now()`
- Keduanya akan dikirim → **SPAM**

## 📊 Flow Masalah Spam

### **Skenario 1: Duplicate Scheduling**

```
Hari 1:
  Invoice dibuat → schedulePaymentReminders() → Create 6 reminder
  
Hari 2:
  Invoice di-generate ulang (bug/manual) → schedulePaymentReminders() → Create 6 reminder LAGI
  Sekarang ada 12 reminder untuk invoice yang sama
  
Hari 3 (H-5):
  Cron job process semua reminder → Kirim 2x H-5 reminder → SPAM
```

### **Skenario 2: Multiple Cron Jobs**

```
Jam 6:00:
  Cron V1 berjalan → Query invoice → Create reminder → Process reminder
  Cron V2 berjalan (bersamaan) → Query ScheduledReminder → Process reminder yang sama
  
Hasil:
  Reminder dikirim 2x (satu dari V1, satu dari V2) → SPAM
```

### **Skenario 3: Race Condition**

```
Jam 6:00:
  Cron V1: Query invoice → Create reminder (status PENDING)
  Cron V2: Query ScheduledReminder PENDING → Process reminder
  Cron V1: Process reminder yang sama (belum di-update status)
  
Hasil:
  Reminder dikirim 2x → SPAM
```

### **Skenario 4: Retry Reschedule**

```
Hari 1 (H-5):
  Reminder di-process → Gagal kirim → markReminderFailed()
  scheduledAt di-update ke +5 menit
  
Hari 1 (H-5 + 5 menit):
  Cron job process reminder lagi → Kirim ulang → Gagal lagi
  scheduledAt di-update lagi ke +5 menit
  
Hasil:
  Reminder dikirim berulang kali setiap 5 menit → SPAM BERULANG
```

## 🔧 Solusi yang Diperlukan

### **1. Fix Duplicate Scheduling**

**Tambahkan check sebelum create reminder**:

```typescript
export async function schedulePaymentReminders(invoiceId: string, dueDate: Date) {
    // Check apakah reminder sudah ada untuk invoice ini
    const existingReminders = await prisma.scheduledReminder.findMany({
        where: {
            invoiceId,
            status: { in: ['PENDING', 'SENT'] },
        },
    });

    // Jika sudah ada reminder yang masih aktif, skip scheduling
    if (existingReminders.length > 0) {
        console.log(`[Reminder Scheduler] Reminders already exist for invoice ${invoiceId}, skipping`);
        return existingReminders;
    }

    // ... rest of the code
}
```

### **2. Disable Salah Satu Cron Job**

**Pilih salah satu cron job**:
- **Rekomendasi**: Gunakan hanya **Cron V2** (payment-reminder-v2)
- **Alasan**: Lebih efisien karena query ScheduledReminder langsung
- **Action**: Disable atau hapus Cron V1

### **3. Tambahkan Unique Constraint**

**Tambahkan unique constraint di database**:

```prisma
model ScheduledReminder {
  // ...
  
  @@unique([invoiceId, reminderType, scheduledAt])
}
```

### **4. Fix Duplicate Check di Cron Job**

**Check PENDING juga, bukan hanya SENT**:

```typescript
const alreadySent = await prisma.scheduledReminder.findFirst({
    where: {
        invoiceId: item.invoiceId,
        reminderType: item.reminderType,
        status: { in: ['SENT', 'PENDING'] }, // Check PENDING juga
        scheduledAt: {
            gte: today,
            lte: todayEnd,
        },
    },
});
```

### **5. Fix Retry Mechanism**

**Jangan reschedule, tapi gunakan retry count saja**:

```typescript
export async function markReminderFailed(reminderId: string, error: string) {
    // Jangan update scheduledAt untuk retry
    // Biarkan scheduledAt tetap sama, hanya update retryCount
    // Cron job akan retry berdasarkan retryCount, bukan scheduledAt baru
}
```

### **6. Tambahkan Lock Mechanism**

**Gunakan database lock untuk prevent race condition**:

```typescript
// Use transaction with lock
await prisma.$transaction(async (tx) => {
    const reminder = await tx.scheduledReminder.findFirst({
        where: { id: reminderId },
        // Lock row
    });
    
    if (reminder.status === 'SENT') {
        return; // Already sent
    }
    
    // Update status to PROCESSING first
    await tx.scheduledReminder.update({
        where: { id: reminderId },
        data: { status: 'PROCESSING' },
    });
    
    // Send reminder
    // Update status to SENT
});
```

## 📝 Checklist Perbaikan

- [ ] Fix duplicate scheduling di `schedulePaymentReminders()`
- [ ] Disable salah satu cron job (V1 atau V2)
- [ ] Tambahkan unique constraint di database
- [ ] Fix duplicate check di cron job (check PENDING juga)
- [ ] Fix retry mechanism (jangan reschedule)
- [ ] Tambahkan lock mechanism untuk prevent race condition
- [ ] Test dengan multiple invoice generation
- [ ] Test dengan multiple cron job execution
- [ ] Monitor log untuk verify tidak ada duplicate

## 🚨 Action Items Prioritas

1. **URGENT**: Fix duplicate scheduling (Masalah #1)
2. **URGENT**: Disable salah satu cron job (Masalah #2)
3. **URGENT**: Disable worker atau pastikan tidak duplicate dengan cron (Masalah #7)
4. **HIGH**: Fix duplicate check (Masalah #3)
5. **HIGH**: Fix Cron V1 yang create reminder baru (Masalah #8)
6. **MEDIUM**: Fix retry mechanism (Masalah #4)
7. **LOW**: Tambahkan unique constraint (Masalah #5)

## 📊 Ringkasan Eksekutif

### **Penyebab Utama Spam**

1. **Duplicate Scheduling** (Masalah #1)
   - Setiap kali `schedulePaymentReminders()` dipanggil, create reminder baru tanpa check
   - Jika invoice di-generate ulang → reminder duplicate

2. **Multiple Execution** (Masalah #2, #7)
   - Ada 2 cron job berbeda (V1 dan V2)
   - Ada worker yang juga menjalankan reminder
   - Ketiganya bisa berjalan bersamaan → process reminder yang sama

3. **Cron V1 Create Reminder Baru** (Masalah #8)
   - Cron V1 create reminder baru jika belum ada
   - Reminder sudah di-schedule saat invoice dibuat
   - Sekarang ada 2 reminder untuk invoice yang sama

4. **Duplicate Check Tidak Cukup** (Masalah #3)
   - Hanya check status SENT, tidak check PENDING
   - Race condition antara cron jobs

### **Solusi Cepat (Quick Fix)**

1. **Disable Cron V1** - Hanya gunakan Cron V2
2. **Disable Worker** - Atau pastikan tidak duplicate dengan cron
3. **Fix Duplicate Scheduling** - Check sebelum create reminder
4. **Fix Cron V1 Logic** - Jangan create reminder baru, hanya process yang sudah ada

### **Solusi Jangka Panjang**

1. Tambahkan unique constraint di database
2. Implement lock mechanism untuk prevent race condition
3. Fix retry mechanism (jangan reschedule)
4. Consolidate ke satu cron job saja


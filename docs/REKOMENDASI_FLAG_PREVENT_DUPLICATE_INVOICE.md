# Rekomendasi Implementasi Flag untuk Mencegah Duplikasi Invoice

## 📋 Overview

Setelah invoice di-generate H-5 sebelum `nextBillingDate`, perlu ada mekanisme untuk mencegah sistem membuat invoice duplikat untuk billing cycle yang sama.

## 🎯 Pendekatan yang Direkomendasikan

### **Pendekatan: Check Invoice Berdasarkan `dueDate` yang Sesuai dengan `nextBillingDate`**

**Alasan:**
- ✅ Tidak perlu migration database (menggunakan field yang sudah ada)
- ✅ Lebih akurat karena `dueDate` = `nextBillingDate` (sesuai dengan logic H-5)
- ✅ Mudah di-debug dan di-track
- ✅ Tidak perlu field tambahan di database

## 🔍 Logic Check Duplikasi

### Prinsip:
Invoice dibuat H-5 dengan `dueDate = nextBillingDate`. Jadi untuk mencegah duplikasi, kita check apakah sudah ada invoice dengan `dueDate` yang sesuai dengan `nextBillingDate` yang akan di-generate.

### Implementasi:

```typescript
// Check if invoice already exists for this specific nextBillingDate
// Invoice dibuat H-5 dengan dueDate = nextBillingDate
// Jadi kita check apakah sudah ada invoice dengan dueDate yang sama atau sangat dekat

const existingInvoice = await prisma.invoice.findFirst({
    where: {
        userId: sub.userId,
        category: 'REGULAR_MONTHLY',
        status: { in: ['UNPAID', 'OVERDUE', 'PAID'] }, // Include PAID untuk prevent duplicate
        dueDate: {
            // Check dalam rentang ±1 hari dari nextBillingDate untuk handle timezone/rounding issues
            gte: new Date(sub.nextBillingDate.getTime() - 24 * 60 * 60 * 1000), // H-1
            lte: new Date(sub.nextBillingDate.getTime() + 24 * 60 * 60 * 1000), // H+1
        },
        deletedAt: null, // Exclude soft-deleted invoices
    },
    orderBy: { createdAt: 'desc' },
});

if (existingInvoice) {
    console.log(`[Check Due] Invoice already exists for subscription ${sub.id} with nextBillingDate ${sub.nextBillingDate.toISOString()}, skipping`);
    continue;
}
```

## 📊 Flow Lengkap dengan Flag

### ⚠️ **PENTING: Logika H-5**

Dengan pendekatan ini, invoice akan di-generate **tepat H-5** sebelum `nextBillingDate`:

- **Hari ini:** Cron job berjalan
- **Query:** Mencari subscription dengan `nextBillingDate` = **hari ini + 5 hari**
- **Generate:** Invoice dibuat hari ini dengan `dueDate = nextBillingDate` (5 hari kemudian)
- **Hasil:** Pelanggan mendapat invoice 5 hari sebelum jatuh tempo

**Contoh:**
- Hari ini: **1 Desember 2025**
- Query: Cari subscription dengan `nextBillingDate = 6 Desember 2025`
- Generate: Invoice dibuat **1 Desember** dengan `dueDate = 6 Desember`
- Pelanggan mendapat invoice **5 hari sebelum** jatuh tempo (H-5)

### 1. **Query Subscription yang Perlu Invoice (H-5)**

```typescript
// Generate invoice untuk subscription yang akan jatuh tempo TEPAT 5 hari dari sekarang (H-5)
const today = new Date();
today.setHours(0, 0, 0, 0);

// H-5: 5 hari dari sekarang
const h5DateStart = new Date(today);
h5DateStart.setDate(h5DateStart.getDate() + 5);
h5DateStart.setHours(0, 0, 0, 0);

const h5DateEnd = new Date(today);
h5DateEnd.setDate(h5DateEnd.getDate() + 5);
h5DateEnd.setHours(23, 59, 59, 999);

const dueSubscriptions = await prisma.subscription.findMany({
    where: {
        nextBillingDate: {
            gte: h5DateStart,  // >= today + 5 hari (start of day)
            lte: h5DateEnd,    // <= today + 5 hari (end of day)
        },
        user: { status: 'ACTIVE' },
        isTrialActive: false,
        isPrepaidActive: false,
    },
    include: { 
        user: true,
    },
});
```

**Penjelasan:**
- Query ini akan mengambil subscription dengan `nextBillingDate` yang **tepat 5 hari dari sekarang**
- Contoh: Jika hari ini 1 Desember, akan mengambil subscription dengan `nextBillingDate = 6 Desember`
- Invoice akan dibuat hari ini (1 Desember) dengan `dueDate = 6 Desember` (5 hari kemudian)

### 2. **Check Duplikasi untuk Setiap Subscription**

```typescript
for (const sub of dueSubscriptions) {
    // Skip if nextBillingDate is null
    if (!sub.nextBillingDate) {
        console.log(`[Check Due] Subscription ${sub.id} has no nextBillingDate, skipping`);
        continue;
    }

    // ✅ FLAG CHECK: Check if invoice already exists for this billing cycle
    const existingInvoice = await prisma.invoice.findFirst({
        where: {
            userId: sub.userId,
            category: 'REGULAR_MONTHLY',
            status: { in: ['UNPAID', 'OVERDUE', 'PAID'] },
            dueDate: {
                // Check dalam rentang ±1 hari dari nextBillingDate
                gte: new Date(sub.nextBillingDate.getTime() - 24 * 60 * 60 * 1000),
                lte: new Date(sub.nextBillingDate.getTime() + 24 * 60 * 60 * 1000),
            },
            deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
    });

    if (existingInvoice) {
        console.log(`[Check Due] Invoice already exists for subscription ${sub.id} (nextBillingDate: ${sub.nextBillingDate.toISOString()}), skipping`);
        console.log(`[Check Due] Existing invoice: ${existingInvoice.invoiceNumber || existingInvoice.id}, dueDate: ${existingInvoice.dueDate.toISOString()}, status: ${existingInvoice.status}`);
        continue;
    }

    // Generate invoice jika belum ada
    try {
        await generateInvoice({
            userId: sub.userId,
            type: 'MONTHLY',
            category: 'REGULAR_MONTHLY',
            amount: Number(sub.price),
            dueDate: sub.nextBillingDate, // Due date = nextBillingDate
        });

        // Update nextBillingDate setelah invoice dibuat
        const newNextBillingDate = new Date(today);
        newNextBillingDate.setDate(newNextBillingDate.getDate() + sub.billingCycle);

        await prisma.subscription.update({
            where: { id: sub.id },
            data: {
                nextBillingDate: newNextBillingDate,
            },
        });

        generatedInvoices++;
        console.log(`[Check Due] Generated invoice for subscription ${sub.id}, nextBillingDate updated to ${newNextBillingDate.toISOString()}`);
    } catch (error) {
        console.error(`[Check Due] Error generating invoice for subscription ${sub.id}:`, error);
    }
}
```

## 🔄 Handle Edge Cases

### 1. **Invoice Sudah Dibayar tapi Masih Ada di Rentang Waktu**

**Solusi:** Include `PAID` status dalam check, karena invoice yang sudah dibayar untuk billing cycle tertentu tidak perlu dibuat ulang.

### 2. **Timezone/Rounding Issues**

**Solusi:** Gunakan rentang ±1 hari dari `nextBillingDate` untuk handle perbedaan waktu atau rounding issues.

### 3. **Invoice Manual yang Dibuat Admin**

**Solusi:** Check berdasarkan `dueDate`, jadi invoice manual dengan `dueDate` yang sama akan terdeteksi dan mencegah duplikasi.

### 4. **Invoice yang Sudah Di-Soft Delete**

**Solusi:** Exclude invoice dengan `deletedAt IS NOT NULL` dari check.

## 📝 Keuntungan Pendekatan Ini

1. **Tidak Perlu Migration**
   - Menggunakan field yang sudah ada (`dueDate`)
   - Tidak perlu tambah field baru di database

2. **Akurat**
   - Check berdasarkan `dueDate` yang sesuai dengan `nextBillingDate`
   - Handle edge cases dengan rentang ±1 hari

3. **Mudah Debug**
   - Log jelas menunjukkan invoice mana yang sudah ada
   - Bisa track berdasarkan `dueDate` dan `invoiceNumber`

4. **Fleksibel**
   - Bisa handle invoice manual yang dibuat admin
   - Bisa handle invoice yang sudah dibayar

## 🚨 Alternatif: Tambah Field di Subscription (Jika Diperlukan)

Jika pendekatan di atas dirasa kurang, bisa tambah field di `Subscription` model:

```prisma
model Subscription {
  // ... existing fields ...
  
  lastInvoiceGeneratedForDate DateTime? // Tanggal billing period terakhir yang sudah di-generate invoice-nya
}
```

**Tapi ini tidak direkomendasikan karena:**
- Perlu migration
- Perlu update logic di banyak tempat
- Lebih kompleks untuk maintain
- Pendekatan check `dueDate` sudah cukup

## ✅ Checklist Implementasi

- [ ] Update query untuk subscription H-5 (fix logic yang salah)
- [ ] Implement check duplikasi berdasarkan `dueDate`
- [ ] Test dengan subscription yang sudah ada invoice
- [ ] Test dengan subscription yang belum ada invoice
- [ ] Test dengan invoice yang sudah dibayar
- [ ] Test dengan invoice manual
- [ ] Verify log untuk debugging
- [ ] Update dokumentasi

## 📊 Contoh Skenario

### Skenario 1: Generate Invoice H-5 (Normal Flow)
```
Hari ini: 2025-12-01
nextBillingDate: 2025-12-06 (5 hari dari sekarang)
Query: Cari subscription dengan nextBillingDate = 2025-12-06
Check: Tidak ada invoice dengan dueDate 2025-12-05 s/d 2025-12-07
Result: ✅ Generate invoice baru
  - Invoice dibuat: 2025-12-01
  - Invoice dueDate: 2025-12-06
  - Pelanggan mendapat invoice 5 hari sebelum jatuh tempo
```

### Skenario 2: Invoice Sudah Ada (Cron Job Berjalan Lagi)
```
Hari ini: 2025-12-02 (cron job berjalan lagi)
nextBillingDate: 2025-12-06 (masih 4 hari lagi)
Query: Cari subscription dengan nextBillingDate = 2025-12-07 (hari ini + 5)
Result: ❌ Subscription dengan nextBillingDate 2025-12-06 TIDAK TERMASUK query
  - Karena query hanya mencari yang nextBillingDate = hari ini + 5
  - Subscription 2025-12-06 sudah ter-generate kemarin (H-5)
```

### Skenario 3: Invoice Sudah Dibayar (Prevent Duplicate)
```
Hari ini: 2025-12-01
nextBillingDate: 2025-12-06
Query: Cari subscription dengan nextBillingDate = 2025-12-06
Check: Ada invoice dengan dueDate 2025-12-06 (status: PAID)
Result: ❌ Skip, tidak generate duplikat (sudah dibayar)
```

### Skenario 4: Invoice Manual (Prevent Duplicate)
```
Hari ini: 2025-12-01
nextBillingDate: 2025-12-06
Admin sudah buat invoice manual dengan dueDate 2025-12-06
Query: Cari subscription dengan nextBillingDate = 2025-12-06
Check: Ada invoice dengan dueDate 2025-12-06
Result: ❌ Skip, tidak generate duplikat
```

### Skenario 5: Multiple Days Flow
```
Hari 1 (2025-12-01):
  - Query: nextBillingDate = 2025-12-06
  - Generate invoice untuk subscription dengan nextBillingDate 2025-12-06
  - Update nextBillingDate menjadi 2026-01-05 (30 hari kemudian)

Hari 2 (2025-12-02):
  - Query: nextBillingDate = 2025-12-07
  - Generate invoice untuk subscription dengan nextBillingDate 2025-12-07
  - (Subscription yang sudah di-generate kemarin tidak akan ter-generate lagi karena nextBillingDate sudah di-update)
```


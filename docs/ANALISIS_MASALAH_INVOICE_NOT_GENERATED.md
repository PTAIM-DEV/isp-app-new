# Analisis Masalah: Invoice Tidak Ter-Generate Otomatis

## 📋 Ringkasan Masalah

Beberapa pelanggan dengan `nextBillingDate` pada tanggal 5-7 Desember 2025 belum memiliki invoice yang ter-generate otomatis, padahal seharusnya invoice sudah dibuat otomatis.

**Pelanggan yang Terkena:**
- Steflin Bawole - Jatuh tempo: 5 Desember 2025
- Aflita Licelin Tadete - Jatuh tempo: 5 Desember 2025
- Selfi Gandawari - Jatuh tempo: 5 Desember 2025
- Gersy Meyke Dien - Jatuh tempo: 6 Desember 2025
- Meylan Loway - Jatuh tempo: 7 Desember 2025

## 🔍 Analisis Root Cause

### 1. **Masalah Utama: Query Logic Tidak Sesuai**

**Lokasi:** `/src/app/api/cron/check-due/route.ts` baris 107-114

**Kode Saat Ini:**
```typescript
// 3. Check for subscriptions due for regular monthly billing (H-5 before due date)
// Create invoice 5 days before nextBillingDate, with dueDate = nextBillingDate
const h5Date = new Date(today);
h5Date.setDate(h5Date.getDate() + 5);

const dueSubscriptions = await prisma.subscription.findMany({
    where: {
        nextBillingDate: {
            gte: h5Date,  // >= today + 5 days
            lt: new Date(h5Date.getTime() + 24 * 60 * 60 * 1000), // < today + 6 days
        },
        user: { status: 'ACTIVE' },
        isTrialActive: false,
        isPrepaidActive: false,
    },
    ...
});
```

**Masalah:**
- Query ini hanya mencari subscription dengan `nextBillingDate` yang berada di **rentang EXACTLY 5 hari dari sekarang** (antara hari ke-5 dan hari ke-6)
- Subscription dengan `nextBillingDate <= today` (sudah jatuh tempo) **TIDAK AKAN TERMASUK** dalam query ini
- Subscription dengan `nextBillingDate` di masa lalu **TIDAK AKAN TERMASUK**
- Subscription dengan `nextBillingDate` lebih dari 6 hari ke depan **TIDAK AKAN TERMASUK**

**Contoh Skenario:**
- Jika hari ini adalah **1 Desember 2025**:
  - Pelanggan dengan `nextBillingDate = 5 Desember` → **TIDAK TERMASUK** (hanya 4 hari ke depan, bukan 5)
  - Pelanggan dengan `nextBillingDate = 6 Desember` → **MUNGKIN TERMASUK** (jika tepat 5 hari)
  - Pelanggan dengan `nextBillingDate = 7 Desember` → **TIDAK TERMASUK** (6 hari ke depan)

- Jika hari ini adalah **5 Desember 2025** atau lebih:
  - Semua pelanggan dengan `nextBillingDate = 5-7 Desember` → **TIDAK TERMASUK** (sudah lewat atau hari ini, bukan 5 hari ke depan)

### 2. **Ketidaksesuaian Dokumentasi vs Implementasi**

**Dokumentasi** (`docs/INVOICE_GENERATION_FLOW.md` baris 5-6):
```
Sistem ini memiliki endpoint cron job untuk auto-generate invoice berdasarkan 
`nextBillingDate` di subscription. Invoice akan dibuat otomatis ketika 
`nextBillingDate <= today`.
```

**Implementasi Aktual:**
- Tidak memeriksa `nextBillingDate <= today`
- Hanya memeriksa `nextBillingDate` yang berada di rentang H-5 (5 hari ke depan)

### 3. **Kondisi Skip yang Mungkin Terlalu Ketat**

**Lokasi:** `/src/app/api/cron/check-due/route.ts` baris 138-147

```typescript
// Skip if invoice already exists for this billing cycle
if (sub.user.invoices.length > 0) {
    const existingInvoice = sub.user.invoices[0];
    const invoiceCreatedDate = new Date(existingInvoice.createdAt);
    const daysSinceCreation = Math.floor((today.getTime() - invoiceCreatedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If invoice was created less than 10 days ago, skip (invoice link valid for 10 days)
    if (daysSinceCreation < 10) {
        console.log(`[Check Due] Invoice already exists for subscription ${sub.id}, skipping`);
        continue;
    }
}
```

**Masalah Potensial:**
- Query invoice hanya mengambil invoice dengan status `UNPAID` atau `OVERDUE` (baris 125-126)
- Jika ada invoice `PAID` yang baru saja dibuat, tidak akan terdeteksi oleh query ini
- Namun, jika ada invoice `UNPAID` yang sudah lebih dari 10 hari, sistem akan membuat invoice baru (mungkin duplikat)

### 4. **Tidak Ada Logic untuk Handle Overdue Subscriptions**

Tidak ada logic khusus untuk menangani subscription yang `nextBillingDate`-nya sudah lewat (overdue). Sistem hanya menangani:
1. Trial expired
2. Prepaid expired  
3. Regular monthly billing (dengan query H-5 yang bermasalah)
4. Overdue invoices (bukan overdue subscriptions)

## 📊 Flow yang Seharusnya vs Flow Saat Ini

### Flow yang Seharusnya (Menurut Dokumentasi):
```
1. Cron job berjalan setiap hari
2. Check semua subscription dengan nextBillingDate <= today
3. Generate invoice untuk subscription yang due
4. Update nextBillingDate setelah invoice dibuat
```

### Flow Saat Ini (Implementasi):
```
1. Cron job berjalan setiap hari
2. Check subscription dengan nextBillingDate antara (today + 5) dan (today + 6)
3. Skip jika invoice sudah ada < 10 hari
4. Generate invoice hanya untuk yang tepat 5 hari ke depan
5. Update nextBillingDate setelah invoice dibuat
```

## 🎯 Dampak Masalah

1. **Invoice Tidak Ter-Generate untuk Pelanggan yang Sudah Jatuh Tempo**
   - Pelanggan dengan `nextBillingDate` <= today tidak akan mendapat invoice
   - Pelanggan dengan `nextBillingDate` < (today + 5) tidak akan mendapat invoice

2. **Invoice Hanya Ter-Generate untuk Rentang Waktu Sangat Sempit**
   - Hanya subscription dengan `nextBillingDate` tepat 5 hari ke depan yang akan mendapat invoice
   - Jika cron job tidak berjalan tepat waktu, invoice akan terlewat

3. **Tidak Ada Mekanisme Recovery**
   - Tidak ada logic untuk "catch up" subscription yang terlewat
   - Subscription yang terlewat akan terus terlewat sampai manual intervention

## 🔧 Rekomendasi Perbaikan

### 1. **Perbaiki Query Logic**

**Opsi A: Generate Invoice H-5 Sebelum Due Date (Ideal)**
```typescript
// Generate invoice 5 hari sebelum nextBillingDate
const h5Date = new Date(today);
h5Date.setDate(h5Date.getDate() + 5);
const h5DateEnd = new Date(h5Date);
h5DateEnd.setHours(23, 59, 59, 999);

const dueSubscriptions = await prisma.subscription.findMany({
    where: {
        nextBillingDate: {
            gte: today,           // >= today (belum lewat)
            lte: h5DateEnd,        // <= today + 5 hari
        },
        user: { status: 'ACTIVE' },
        isTrialActive: false,
        isPrepaidActive: false,
    },
    ...
});
```

**Opsi B: Generate Invoice Ketika Sudah Jatuh Tempo (Sesuai Dokumentasi)**
```typescript
// Generate invoice ketika nextBillingDate <= today
const dueSubscriptions = await prisma.subscription.findMany({
    where: {
        nextBillingDate: {
            lte: today,  // <= today (sudah jatuh tempo)
        },
        user: { status: 'ACTIVE' },
        isTrialActive: false,
        isPrepaidActive: false,
    },
    ...
});
```

**Opsi C: Kombinasi (Recommended)**
```typescript
// Generate invoice untuk:
// 1. Subscription yang sudah jatuh tempo (nextBillingDate <= today)
// 2. Subscription yang akan jatuh tempo dalam 5 hari (today < nextBillingDate <= today + 5)

const todayEnd = new Date(today);
todayEnd.setHours(23, 59, 59, 999);

const h5Date = new Date(today);
h5Date.setDate(h5Date.getDate() + 5);
h5Date.setHours(23, 59, 59, 999);

const dueSubscriptions = await prisma.subscription.findMany({
    where: {
        nextBillingDate: {
            lte: h5Date,  // <= today + 5 hari
        },
        user: { status: 'ACTIVE' },
        isTrialActive: false,
        isPrepaidActive: false,
    },
    ...
});
```

### 2. **Perbaiki Logic Check Invoice Existing**

Perlu memastikan tidak ada duplikasi invoice untuk billing cycle yang sama. Gunakan `nextBillingDate` sebagai referensi, bukan hanya tanggal pembuatan invoice.

```typescript
// Check if invoice already exists for this specific nextBillingDate
const existingInvoice = await prisma.invoice.findFirst({
    where: {
        userId: sub.userId,
        category: 'REGULAR_MONTHLY',
        status: { in: ['UNPAID', 'OVERDUE'] },
        dueDate: {
            gte: new Date(sub.nextBillingDate.getTime() - 24 * 60 * 60 * 1000), // H-1
            lte: new Date(sub.nextBillingDate.getTime() + 24 * 60 * 60 * 1000), // H+1
        },
    },
    orderBy: { createdAt: 'desc' },
});

if (existingInvoice) {
    console.log(`[Check Due] Invoice already exists for subscription ${sub.id} with nextBillingDate ${sub.nextBillingDate}, skipping`);
    continue;
}
```

### 3. **Tambahkan Logic untuk Handle Overdue Subscriptions**

Tambahkan section khusus untuk subscription yang `nextBillingDate`-nya sudah lewat lebih dari X hari:

```typescript
// Check for overdue subscriptions (nextBillingDate < today)
const overdueSubscriptions = await prisma.subscription.findMany({
    where: {
        nextBillingDate: {
            lt: today,  // < today (sudah lewat)
        },
        user: { status: 'ACTIVE' },
        isTrialActive: false,
        isPrepaidActive: false,
    },
    ...
});

// Generate invoice untuk overdue subscriptions
for (const sub of overdueSubscriptions) {
    // Check if invoice already exists
    // Generate invoice dengan dueDate = today (bukan nextBillingDate yang sudah lewat)
    // Update nextBillingDate
}
```

## 📝 Checklist Verifikasi

Setelah perbaikan, verifikasi:

- [ ] Cron job berjalan setiap hari (cek log)
- [ ] Invoice ter-generate untuk subscription dengan `nextBillingDate <= today`
- [ ] Invoice ter-generate untuk subscription dengan `nextBillingDate` dalam 5 hari ke depan
- [ ] Tidak ada duplikasi invoice untuk billing cycle yang sama
- [ ] `nextBillingDate` ter-update setelah invoice dibuat
- [ ] Pelanggan yang terlewat (seperti 5-7 Desember) mendapat invoice recovery

## 🚨 Action Items

1. **Immediate Fix**: Perbaiki query logic di `/src/app/api/cron/check-due/route.ts`
2. **Testing**: Test dengan subscription yang sudah jatuh tempo
3. **Recovery**: Generate invoice manual untuk pelanggan yang terlewat (5-7 Desember)
4. **Monitoring**: Setup monitoring untuk detect subscription yang terlewat
5. **Documentation**: Update dokumentasi agar sesuai dengan implementasi


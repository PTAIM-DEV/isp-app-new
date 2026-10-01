# Flow Pembuatan Invoice Otomatis

## 📋 Overview

Sistem ini memiliki endpoint cron job untuk auto-generate invoice berdasarkan `nextBillingDate` di subscription. Invoice akan dibuat otomatis ketika `nextBillingDate <= today`.

## 🔄 Flow Pembuatan Invoice

### 1. **Cron Job Check Due Date**

**Endpoint**: `GET /api/cron/check-due`

**Jadwal**: Harus di-setup untuk berjalan setiap hari (disarankan jam 00:00 atau 01:00)

**Fungsi**: 
- Check semua subscription yang `nextBillingDate <= today`
- Generate invoice untuk subscription yang due
- Update `nextBillingDate` setelah invoice dibuat

### 2. **Kondisi Generate Invoice**

Cron job akan check 4 kondisi:

#### A. **Trial Expired** (Trial Berakhir)
```
Kondisi:
- isTrialActive = true
- trialEndDate <= today
- user.status = ACTIVE

Action:
- Generate FIRST_MONTH invoice
- Set isTrialActive = false
- nextBillingDate akan di-set setelah pembayaran
```

#### B. **Prepaid Expired** (Prepaid Habis)
```
Kondisi:
- isPrepaidActive = true
- prepaidValidUntil <= today
- user.status = ACTIVE

Action:
- Jika ada bonusMonthsPending:
  → Apply bonus months
  → Update prepaidValidUntil
  → Update nextBillingDate = prepaidValidUntil baru
- Jika tidak ada bonus:
  → Generate REGULAR_MONTHLY invoice
  → Set isPrepaidActive = false
```

#### C. **Regular Monthly Billing** (Tagihan Bulanan)
```
Kondisi:
- nextBillingDate <= today
- user.status = ACTIVE
- isTrialActive = false
- isPrepaidActive = false

Action:
- Generate REGULAR_MONTHLY invoice
- Amount = subscription.price
- Due Date = today + 7 hari
- ⚠️ PERLU: Update nextBillingDate setelah invoice dibuat
```

#### D. **Overdue Invoice** (Tagihan Terlambat)
```
Kondisi:
- Invoice dueDate < today
- Invoice status = UNPAID atau OVERDUE
- user.status = ACTIVE

Action:
- Update invoice status = OVERDUE
- Update user status = BLOCKED
- Trigger Mikrotik block
```

### 3. **Flow Generate Invoice Detail**

#### Step 1: Calculate Invoice Details
```typescript
calculateInvoiceDetails({
    userId,
    type: 'MONTHLY',
    category: 'REGULAR_MONTHLY',
    amount: subscription.price,
    promoCode?: string,
    prepaidMonths?: number,
    bonusMonths?: number
})
```

**Proses:**
1. Get user & subscription data
2. Check promo code (jika ada)
3. Apply discount (jika promo valid)
4. Calculate subtotal, tax (PPN 11%), admin fee
5. Calculate total amount

#### Step 2: Create Invoice in Database
```typescript
prisma.invoice.create({
    invoiceNumber: "INV-2025-12-001",
    userId,
    type: 'MONTHLY',
    category: 'REGULAR_MONTHLY',
    amount: totalAmount,
    subtotal,
    taxAmount,
    feeAmount,
    dueDate: today + 7 days,
    description: "Tagihan Internet Bulanan",
    status: 'UNPAID'
})
```

#### Step 3: Create Xendit Invoice
```typescript
createXenditInvoice({
    externalId: "user.name.user.phone-REGULAR_MONTHLY",
    amount: totalAmount,
    description: "Tagihan Internet Bulanan",
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: user.phone,
    ...
})
```

**Hasil:**
- Invoice dibuat di Xendit
- Link pembayaran tersedia (`xenditUrl`)
- Invoice ID disimpan di database

#### Step 4: Update Next Billing Date
```typescript
// ⚠️ PENTING: Update nextBillingDate setelah invoice dibuat
prisma.subscription.update({
    where: { userId },
    data: {
        nextBillingDate: new Date(nextBillingDate.getTime() + billingCycle * 24 * 60 * 60 * 1000)
    }
})
```

**Contoh:**
- Current nextBillingDate: 2025-12-01
- Billing Cycle: 30 hari
- New nextBillingDate: 2025-12-31

## ⚠️ Masalah yang Perlu Diperbaiki

### 1. **Next Billing Date Tidak Di-Update Setelah Generate Invoice**

Di `check-due/route.ts` line 116-129, invoice dibuat tapi `nextBillingDate` tidak di-update. Ini menyebabkan invoice akan dibuat berulang setiap hari.

**Perbaikan yang diperlukan:**
```typescript
for (const sub of dueSubscriptions) {
    try {
        await generateInvoice({...});
        
        // ⚠️ TAMBAHKAN: Update nextBillingDate
        const newNextBillingDate = new Date(today);
        newNextBillingDate.setDate(newNextBillingDate.getDate() + sub.billingCycle);
        
        await prisma.subscription.update({
            where: { id: sub.id },
            data: {
                nextBillingDate: newNextBillingDate
            }
        });
        
        generatedInvoices++;
    } catch (error) {
        console.error(`Error generating invoice for subscription ${sub.id}:`, error);
    }
}
```

### 2. **Cron Job Belum Di-Setup**

Endpoint `/api/cron/check-due` sudah ada tapi belum dijadwalkan untuk berjalan otomatis.

**Solusi:**
- Setup cron job di server untuk call endpoint ini setiap hari
- Atau gunakan external cron service (cron-job.org, EasyCron, dll)

## 📅 Setup Cron Job

### Opsi 1: Server Cron Job

```bash
# Setup cron job untuk call endpoint setiap hari jam 01:00
0 1 * * * curl -X GET http://localhost:3000/api/cron/check-due >> /var/log/invoice-cron.log 2>&1
```

### Opsi 2: External Cron Service

Gunakan service seperti:
- cron-job.org
- EasyCron
- UptimeRobot

**URL**: `https://yourdomain.com/api/cron/check-due`

**Schedule**: Setiap hari jam 01:00 WIB

## 🔍 Monitoring

### Check Invoice Generation

```bash
# Test cron job manually
curl http://localhost:3000/api/cron/check-due

# Response:
{
    "message": "Cron job executed",
    "generatedInvoices": 5,
    "blockedUsers": 2,
    "trialExpired": 1,
    "prepaidExpired": 0
}
```

### Check Next Billing Date

```sql
-- Cek subscription yang akan due dalam 7 hari
SELECT u.name, u.phone, s.nextBillingDate, s.billingCycle
FROM "Subscription" s
JOIN "User" u ON s."userId" = u.id
WHERE s."nextBillingDate" <= CURRENT_DATE + INTERVAL '7 days'
AND u.status = 'ACTIVE';
```

## 📊 Flow Diagram

```
┌─────────────────────────────────────┐
│   Cron Job (Setiap Hari 01:00)     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Check: nextBillingDate <= today?    │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
       YES           NO
        │             │
        ▼             ▼
┌──────────────┐  ┌──────────────┐
│ Generate     │  │ Skip         │
│ Invoice      │  │ (Belum due)  │
└──────┬───────┘  └──────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 1. Calculate Invoice Details        │
│    - Apply promo (jika ada)         │
│    - Calculate tax & fees           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Create Invoice in Database       │
│    - Generate invoice number         │
│    - Save invoice data               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Create Xendit Invoice            │
│    - Generate payment link           │
│    - Save xenditId & xenditUrl       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Update nextBillingDate            │
│    - nextBillingDate += billingCycle │
└─────────────────────────────────────┘
```

## ✅ Checklist Setup

- [ ] Fix update nextBillingDate setelah generate invoice
- [ ] Setup cron job untuk call `/api/cron/check-due`
- [ ] Test cron job secara manual
- [ ] Monitor log untuk memastikan invoice ter-generate
- [ ] Setup alert jika cron job gagal



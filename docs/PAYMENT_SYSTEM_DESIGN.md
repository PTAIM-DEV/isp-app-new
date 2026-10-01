# Desain Sistem Pembayaran Fleksibel

## 📋 Overview

Sistem pembayaran yang mendukung berbagai skenario:
- Pembayaran instalasi terpisah
- Gratis instalasi dengan bayar bulan pertama
- Promo bayar beberapa bulan di awal
- Free trial period
- Pembayaran sekaligus (3/6/12 bulan) dengan bonus gratis

---

## 🗄️ Database Schema Changes

### 1. Invoice Types & Categories

```prisma
enum InvoiceType {
  INSTALLATION    // Tagihan instalasi
  MONTHLY         // Tagihan bulanan
  PREPAID         // Pembayaran sekaligus (3/6/12 bulan)
  TRIAL          // Free trial (untuk tracking)
}

enum InvoiceCategory {
  INSTALLATION_FEE
  FIRST_MONTH
  REGULAR_MONTHLY
  PREPAID_3_MONTHS
  PREPAID_6_MONTHS
  PREPAID_12_MONTHS
  TRIAL_PERIOD
}
```

### 2. Payment Flow Configuration

```prisma
model PaymentFlow {
  id          String   @id @default(cuid())
  name        String   // e.g., "Standard", "Free Installation", "Prepaid 6 Months"
  description String?
  
  // Flow Configuration
  requiresInstallationPayment Boolean @default(false)  // Harus bayar instalasi dulu?
  installationFeeAmount       Decimal?                 // Harga instalasi jika ada
  freeInstallation            Boolean @default(false)  // Gratis instalasi?
  
  // First Payment
  requiresFirstMonthPayment   Boolean @default(true)   // Bayar bulan pertama?
  firstMonthPaymentAfterInstall Boolean @default(false) // Bayar setelah instalasi?
  
  // Prepaid Options
  supportsPrepaid             Boolean @default(false)
  prepaidMonths               Int[]   @default([])     // [3, 6, 12]
  prepaidBonusMonths          Json?    // {3: 0, 6: 1, 12: 2} bulan gratis
  
  // Trial
  supportsTrial               Boolean @default(false)
  trialDays                   Int?                     // Default 3 hari
  
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  subscriptions Subscription[]
}
```

### 3. Enhanced Invoice Model

```prisma
model Invoice {
  id          String        @id @default(cuid())
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // Invoice Details
  type        InvoiceType
  category    InvoiceCategory
  amount      Decimal
  dueDate     DateTime
  paidAt      DateTime?
  status      InvoiceStatus @default(UNPAID)
  
  // Description
  description String?       // e.g., "Instalasi", "Bulan Pertama", "Prepaid 6 Bulan + 1 Gratis"
  
  // Xendit Data
  xenditId    String?       @unique
  xenditUrl   String?
  
  // Relations
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  
  // For prepaid invoices
  prepaidMonths Int?        // Berapa bulan yang dibayar
  bonusMonths   Int?        // Bonus bulan gratis
  validUntil    DateTime?   // Sampai kapan prepaid berlaku
  
  // For trial tracking
  trialStartDate DateTime?
  trialEndDate   DateTime?
  trialDays      Int?
}
```

### 4. Enhanced Subscription Model

```prisma
model Subscription {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  planName        String
  price           Decimal
  billingCycle    Int      @default(30) // Days
  
  // Dates
  startDate       DateTime?      // Tanggal mulai langganan
  activatedDate   DateTime?      // Tanggal aktivasi (setelah instalasi)
  trialStartDate  DateTime?      // Tanggal mulai trial
  trialEndDate    DateTime?      // Tanggal akhir trial
  nextBillingDate DateTime?      // Tanggal tagihan berikutnya
  
  // Payment Flow
  paymentFlowId   String?
  paymentFlow     PaymentFlow? @relation(fields: [paymentFlowId], references: [id])
  
  // Prepaid Credit
  prepaidCreditMonths Int @default(0)  // Sisa bulan prepaid
  prepaidValidUntil   DateTime?        // Sampai kapan prepaid berlaku
  
  // Status
  isTrialActive   Boolean @default(false)
  isPrepaidActive Boolean @default(false)
  
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
}
```

### 5. Promo/Voucher Model

```prisma
model Promo {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String?
  
  // Promo Type
  type        String   // "DISCOUNT_PERCENT", "DISCOUNT_AMOUNT", "FREE_INSTALLATION", "BONUS_MONTHS"
  value       Decimal? // Nilai discount atau bonus
  
  // Applicable to
  applicableToFlowIds String[] @default([]) // PaymentFlow IDs
  applicableToPackageIds String[] @default([]) // Package IDs
  
  // Validity
  validFrom   DateTime
  validUntil  DateTime?
  maxUses     Int?     // Maximum penggunaan
  usedCount   Int      @default(0)
  
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PromoUsage {
  id        String   @id @default(cuid())
  promoId  String
  promo    Promo    @relation(fields: [promoId], references: [id])
  userId   String
  user     User     @relation(fields: [userId], references: [id])
  invoiceId String?
  invoice  Invoice? @relation(fields: [invoiceId], references: [id])
  usedAt   DateTime @default(now())
}
```

### 6. Update User Model

```prisma
model User {
  // ... existing fields ...
  
  // Relations
  promoUsages PromoUsage[]
}
```

---

## 🔄 Payment Flow Logic

### Flow 1: Bayar Instalasi Dulu
```
1. User register → LEAD
2. Admin create invoice INSTALLATION
3. User bayar instalasi → PAID
4. Admin bisa jadwalkan instalasi → PENDING_INSTALL
5. Instalasi selesai → COMPLETED
6. Admin activate → ACTIVE
7. Generate invoice FIRST_MONTH
8. User bayar bulan pertama → PAID
9. Set nextBillingDate untuk bulan berikutnya
```

### Flow 2: Gratis Instalasi
```
1. User register → LEAD
2. Admin jadwalkan instalasi (tanpa invoice instalasi)
3. Instalasi selesai → COMPLETED
4. Admin activate → ACTIVE
5. Generate invoice FIRST_MONTH
6. User bayar bulan pertama → PAID
7. Set nextBillingDate untuk bulan berikutnya
```

### Flow 3: Promo Bayar 2 Bulan di Awal
```
1. User register → LEAD
2. Admin jadwalkan instalasi
3. Instalasi selesai → COMPLETED
4. Admin activate → ACTIVE
5. Generate invoice PREPAID dengan 2 bulan
6. User bayar → PAID
7. Set prepaidCreditMonths = 2
8. Set prepaidValidUntil = now + 2 months
9. Set nextBillingDate = prepaidValidUntil
```

### Flow 4: Free Trial
```
1. User register → LEAD
2. Admin jadwalkan instalasi
3. Instalasi selesai → COMPLETED
4. Admin activate dengan trial → ACTIVE
5. Set trialStartDate = now
6. Set trialEndDate = now + trialDays
7. Set isTrialActive = true
8. Set nextBillingDate = trialEndDate
9. Set prepaidCreditMonths = 0 (trial tidak dihitung sebagai prepaid)
10. Setiap hari cron check: jika trialEndDate <= today → generate FIRST_MONTH invoice
```

### Flow 5: Bayar Sekaligus 6 Bulan + 1 Gratis
```
1. User register → LEAD
2. Admin jadwalkan instalasi
3. Instalasi selesai → COMPLETED
4. Admin activate → ACTIVE
5. Generate invoice PREPAID_6_MONTHS
   - amount = price * 6
   - prepaidMonths = 6
   - bonusMonths = 1
   - validUntil = now + 7 months (6 + 1 gratis)
6. User bayar → PAID
7. Set prepaidCreditMonths = 7
8. Set prepaidValidUntil = now + 7 months
9. Set nextBillingDate = prepaidValidUntil
10. Set isPrepaidActive = true
```

---

## 🛠️ Implementation Plan

### Phase 1: Database Migration
1. Create new enums (InvoiceType, InvoiceCategory)
2. Create PaymentFlow model
3. Create Promo & PromoUsage models
4. Update Invoice model (add type, category, prepaid fields, trial fields)
5. Update Subscription model (add paymentFlowId, prepaidCreditMonths, trial fields)

### Phase 2: Payment Flow Management
1. Admin UI untuk manage PaymentFlow
2. Admin bisa assign PaymentFlow ke user saat aktivasi
3. Logic untuk generate invoice berdasarkan PaymentFlow

### Phase 3: Invoice Generation Logic
1. Function untuk generate invoice berdasarkan type
2. Handle installation invoice
3. Handle monthly invoice
4. Handle prepaid invoice dengan bonus
5. Handle trial period

### Phase 4: Cron Job Enhancement
1. Check trial expiration → generate first month invoice
2. Check prepaid expiration → generate monthly invoice
3. Handle prepaid credit deduction
4. Smart nextBillingDate calculation

### Phase 5: Xendit Integration
1. Update createInvoice untuk support different invoice types
2. Update webhook handler untuk process different payment types
3. Handle prepaid payment → extend prepaidCreditMonths
4. Handle trial activation

---

## 📝 Key Functions Needed

### 1. Generate Invoice Based on Flow
```typescript
async function generateInvoiceByFlow(
  userId: string,
  flowId: string,
  type: InvoiceType
): Promise<Invoice>
```

### 2. Activate Customer with Flow
```typescript
async function activateCustomerWithFlow(
  userId: string,
  flowId: string,
  trialDays?: number
): Promise<Subscription>
```

### 3. Process Prepaid Payment
```typescript
async function processPrepaidPayment(
  invoiceId: string,
  months: number,
  bonusMonths: number
): Promise<void>
```

### 4. Check Trial Expiration
```typescript
async function checkTrialExpiration(): Promise<void>
// Cron job untuk check trial yang sudah expired
```

### 5. Calculate Next Billing Date
```typescript
function calculateNextBillingDate(
  subscription: Subscription,
  paymentFlow: PaymentFlow
): Date
```

---

## 🎯 Benefits

1. **Flexible**: Support berbagai skenario pembayaran
2. **Scalable**: Mudah tambah flow baru tanpa ubah code banyak
3. **Trackable**: Semua transaksi tercatat dengan jelas
4. **Promo Ready**: Sistem promo/voucher sudah terintegrasi
5. **Trial Support**: Free trial period fully supported
6. **Prepaid Support**: Bayar sekaligus dengan bonus bulan gratis

---

## ⚠️ Considerations

1. **Complexity**: Sistem jadi lebih kompleks, perlu testing menyeluruh
2. **Migration**: Perlu migrate data existing ke struktur baru
3. **Edge Cases**: Perlu handle berbagai edge cases (cancellation, dll)
4. **Reporting**: Perlu reporting yang jelas untuk tracking berbagai jenis invoice
5. **PaymentFlow Immutability**: PaymentFlow tidak bisa diubah setelah dibuat (untuk konsistensi data)
6. **No Refund**: Tidak ada sistem refund, hanya cancellation jika user berhenti berlangganan
7. **Invoice Format**: Format invoice number bisa di-setting di SystemSetting (contoh: "INV-{YEAR}-{MONTH}-{SEQ}")

## 📝 Updated Requirements (Based on Feedback)

1. **PaymentFlow Immutability**: 
   - PaymentFlow tidak bisa diubah setelah dibuat
   - Setiap subscription memiliki paymentFlowId yang tetap

2. **No Refund System**:
   - Tidak ada refund untuk cancellation
   - Jika user cancel, invoice yang belum terbayar tetap ada tapi tidak perlu dibayar
   - Status invoice bisa diubah ke CANCELLED

3. **Promo Code**:
   - User bisa input promo code saat registrasi atau saat checkout
   - Admin bisa assign promo code saat aktivasi
   - Promo bisa apply ke invoice apapun (installation, monthly, prepaid)

4. **Prepaid Bonus**:
   - Bonus bulan diberikan setelah prepaid habis (bukan langsung)
   - Disimpan di `bonusMonthsPending` di Subscription
   - Setelah prepaid habis, bonus bulan ditambahkan ke prepaidCreditMonths

5. **Trial Period**:
   - Trial dihitung dari tanggal aktivasi (activatedDate)
   - trialStartDate = activatedDate
   - trialEndDate = activatedDate + trialDays

6. **Invoice Number Format**:
   - Bisa di-setting di SystemSetting dengan key `INVOICE_NUMBER_FORMAT`
   - Format bisa menggunakan placeholder: {YEAR}, {MONTH}, {DAY}, {SEQ}, {TYPE}
   - Contoh: "INV-{YEAR}-{MONTH}-{SEQ}" → "INV-2024-01-001"
   - Sequence number reset setiap bulan atau tahun tergantung setting

---

## 📊 Example Data

### PaymentFlow Examples

```json
{
  "name": "Standard Flow",
  "requiresInstallationPayment": true,
  "installationFeeAmount": 500000,
  "requiresFirstMonthPayment": true,
  "firstMonthPaymentAfterInstall": true,
  "supportsTrial": false
}

{
  "name": "Free Installation",
  "freeInstallation": true,
  "requiresFirstMonthPayment": true,
  "firstMonthPaymentAfterInstall": true,
  "supportsTrial": true,
  "trialDays": 3
}

{
  "name": "Prepaid 6 Months",
  "freeInstallation": true,
  "supportsPrepaid": true,
  "prepaidMonths": [3, 6, 12],
  "prepaidBonusMonths": {"3": 0, "6": 1, "12": 2}
}
```

---

## 🚀 Next Steps

1. Review dan approve design ini
2. Create database migration
3. Implement PaymentFlow management
4. Update invoice generation logic
5. Update cron jobs
6. Testing berbagai skenario
7. Deploy ke production


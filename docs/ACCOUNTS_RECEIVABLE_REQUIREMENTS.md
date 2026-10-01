# 📋 Analisis Kebutuhan: Buku Piutang Pelanggan

## 🎯 Overview

Buku piutang (Accounts Receivable) adalah fitur untuk melihat dan mengelola semua tagihan yang belum dibayar oleh pelanggan. Fitur ini penting untuk:
- **Tracking**: Memantau semua piutang yang belum dibayar
- **Collection Management**: Mengelola proses penagihan
- **Financial Reporting**: Laporan keuangan untuk manajemen
- **Risk Management**: Identifikasi pelanggan dengan risiko tinggi
- **Aging Analysis**: Analisis umur piutang untuk strategi penagihan

---

## 📊 Data yang Tersedia di Sistem

### 1. Invoice Model
```prisma
model Invoice {
  id            String
  invoiceNumber String?
  type          InvoiceType      // INSTALLATION, MONTHLY, PREPAID, TRIAL
  category      InvoiceCategory  // INSTALLATION_FEE, FIRST_MONTH, REGULAR_MONTHLY, etc.
  amount        Decimal
  dueDate       DateTime
  paidAt        DateTime?
  status        InvoiceStatus    // UNPAID, PAID, OVERDUE, EXPIRED, CANCELLED
  createdAt     DateTime
  userId        String
  user          User
}
```

### 2. Invoice Status yang Relevan untuk Piutang
- **UNPAID**: Tagihan belum dibayar (masih dalam tenggat)
- **OVERDUE**: Tagihan terlambat (melewati dueDate)
- **EXPIRED**: Tagihan kadaluarsa
- **PAID**: Sudah dibayar (tidak termasuk dalam piutang)
- **CANCELLED**: Dibatalkan (tidak termasuk dalam piutang)

### 3. User Model (Pelanggan)
```prisma
model User {
  id        String
  name      String
  phone     String
  email     String?
  status    UserStatus  // ACTIVE, BLOCKED, INACTIVE, etc.
  salesId   String?
  sales     Sales?
  location  // Province, City, District, Village
  subscription Subscription?
}
```

---

## 🎨 Fitur-Fitur yang Diperlukan

### 1. **Dashboard Overview**
Menampilkan ringkasan piutang secara keseluruhan:

#### Summary Cards:
- **Total Piutang**: Total nilai semua tagihan yang belum dibayar
- **Piutang Lancar**: Tagihan yang belum jatuh tempo (UNPAID, dueDate >= today)
- **Piutang Terlambat**: Tagihan yang sudah melewati dueDate (OVERDUE, EXPIRED)
- **Jumlah Pelanggan Berpiutang**: Berapa banyak pelanggan yang memiliki piutang
- **Rata-rata Piutang per Pelanggan**: Total piutang / jumlah pelanggan

#### Visualisasi:
- **Chart Piutang per Status**: Pie chart atau bar chart
- **Chart Piutang per Kategori**: Breakdown per kategori invoice
- **Trend Piutang**: Line chart menunjukkan trend piutang dalam periode tertentu
- **Aging Bucket Chart**: Bar chart menunjukkan distribusi piutang berdasarkan umur

---

### 2. **Aging Analysis (Analisis Umur Piutang)**

Kategorisasi piutang berdasarkan umur:

#### Aging Buckets:
- **0-7 hari**: Piutang baru (belum jatuh tempo)
- **8-15 hari**: Piutang mendekati jatuh tempo
- **16-30 hari**: Piutang terlambat ringan
- **31-60 hari**: Piutang terlambat sedang
- **61-90 hari**: Piutang terlambat berat
- **>90 hari**: Piutang sangat terlambat (high risk)

#### Perhitungan Umur:
- **Untuk UNPAID**: `umur = today - createdAt` (hari sejak invoice dibuat)
- **Untuk OVERDUE/EXPIRED**: `umur = today - dueDate` (hari sejak jatuh tempo)

#### Tampilan:
- Tabel dengan kolom: Pelanggan, Invoice, Jumlah, Due Date, Umur, Status, Aging Bucket
- Summary per bucket dengan total nilai
- Color coding berdasarkan tingkat risiko

---

### 3. **Daftar Piutang (Receivable List)**

#### Tabel Detail:
Kolom yang ditampilkan:
- **Invoice Number**: Nomor invoice
- **Tanggal Invoice**: Tanggal pembuatan
- **Due Date**: Tanggal jatuh tempo
- **Umur Piutang**: Berapa hari sudah outstanding
- **Pelanggan**: Nama, phone, email
- **Sales**: Sales yang menangani pelanggan
- **Kategori**: INSTALLATION_FEE, REGULAR_MONTHLY, dll
- **Jumlah**: Nilai tagihan
- **Status**: UNPAID, OVERDUE, EXPIRED
- **Lokasi**: Provinsi, Kota
- **Actions**: Tombol aksi (lihat detail, kirim reminder, dll)

#### Fitur Tabel:
- **Sorting**: By date, amount, umur, status
- **Pagination**: Untuk performa dengan data besar
- **Search**: Cari berdasarkan invoice number, nama pelanggan, phone
- **Filter**: 
  - Status (UNPAID, OVERDUE, EXPIRED)
  - Kategori invoice
  - Sales
  - Lokasi (Provinsi, Kota, Kecamatan, Kelurahan)
  - Paket layanan
  - Aging bucket
  - Range tanggal (createdAt, dueDate)
  - Range jumlah

---

### 4. **Detail Per Pelanggan**

#### View Per Pelanggan:
Menampilkan semua piutang dari satu pelanggan:

- **Info Pelanggan**:
  - Nama, Phone, Email
  - Status (ACTIVE, BLOCKED, dll)
  - Sales yang menangani
  - Lokasi lengkap
  - Paket yang digunakan

- **Ringkasan Piutang Pelanggan**:
  - Total piutang
  - Jumlah invoice yang belum dibayar
  - Invoice terlama (terlambat paling lama)
  - Rata-rata umur piutang

- **Daftar Invoice**:
  - Semua invoice yang belum dibayar
  - History invoice yang sudah dibayar (opsional)
  - Timeline pembayaran

- **Actions**:
  - Kirim reminder (email/WhatsApp)
  - Lihat detail invoice
  - Hubungi pelanggan (WhatsApp link)
  - Tandai sebagai "sedang ditagih"

---

### 5. **Filtering & Search**

#### Filter Multi-Kriteria:
- **Status**: UNPAID, OVERDUE, EXPIRED, atau kombinasi
- **Kategori**: INSTALLATION_FEE, REGULAR_MONTHLY, PREPAID, dll
- **Sales**: Filter per sales person
- **Lokasi**: Provinsi → Kota → Kecamatan → Kelurahan (cascading)
- **Paket**: Filter berdasarkan paket layanan
- **Aging Bucket**: 0-7 hari, 8-15 hari, dll
- **Range Tanggal**: 
  - Tanggal invoice dibuat
  - Tanggal jatuh tempo
- **Range Jumlah**: Filter berdasarkan nilai tagihan
- **User Status**: ACTIVE, BLOCKED, INACTIVE

#### Search:
- Invoice number
- Nama pelanggan
- Phone number
- Email pelanggan

---

### 6. **Export & Reporting**

#### Export Format:
- **CSV**: Untuk analisis di Excel
- **PDF**: Untuk laporan formal
- **Excel**: Dengan formatting dan charts

#### Data yang Diexport:
- Semua kolom dari tabel
- Summary per aging bucket
- Summary per kategori
- Summary per sales
- Summary per lokasi

#### Laporan yang Bisa Dibuat:
- **Laporan Piutang Harian**: Piutang per hari
- **Laporan Piutang Bulanan**: Piutang per bulan
- **Laporan Aging**: Breakdown per aging bucket
- **Laporan per Sales**: Piutang yang ditangani setiap sales
- **Laporan per Lokasi**: Piutang berdasarkan wilayah
- **Laporan Pelanggan High Risk**: Pelanggan dengan piutang >90 hari

---

### 7. **Collection Management**

#### Tracking Penagihan:
- **Status Penagihan**: 
  - Belum ditagih
  - Sedang ditagih
  - Menunggu konfirmasi
  - Dispute
  - Write-off (dihapus dari piutang)

#### Reminder Management:
- Lihat history reminder yang sudah dikirim
- Kirim reminder manual (email/WhatsApp)
- Schedule reminder otomatis
- Template reminder yang bisa dikustomisasi

#### Notes & Comments:
- Tambah catatan per invoice
- History komunikasi dengan pelanggan
- Catatan khusus untuk follow-up

---

### 8. **Analytics & Insights**

#### Metrics:
- **Days Sales Outstanding (DSO)**: Rata-rata hari untuk mengumpulkan piutang
- **Collection Rate**: Persentase piutang yang berhasil dikumpulkan
- **Bad Debt Ratio**: Persentase piutang yang tidak bisa dikumpulkan
- **Average Collection Period**: Rata-rata waktu pengumpulan piutang

#### Visualisasi:
- **Aging Distribution**: Pie chart per bucket
- **Trend Piutang**: Line chart trend piutang over time
- **Top Pelanggan Berpiutang**: Ranking pelanggan dengan piutang terbesar
- **Piutang per Sales**: Breakdown per sales person
- **Piutang per Lokasi**: Breakdown per wilayah
- **Collection Forecast**: Prediksi kapan piutang akan dibayar

---

### 9. **Actions & Workflows**

#### Quick Actions:
- **Kirim Reminder**: Kirim reminder ke pelanggan (email/WhatsApp)
- **Lihat Invoice**: Buka detail invoice
- **Hubungi Pelanggan**: Buka WhatsApp chat
- **Tandai Ditagih**: Update status penagihan
- **Write-off**: Tandai sebagai bad debt (dengan approval)

#### Bulk Actions:
- **Kirim Reminder Massal**: Kirim reminder ke beberapa invoice sekaligus
- **Export Selected**: Export invoice yang dipilih
- **Update Status**: Update status beberapa invoice sekaligus

---

## 🔄 Integrasi dengan Fitur Existing

### 1. **Revenue Report**
- Bisa link dari revenue report ke buku piutang
- Filter yang sama bisa digunakan

### 2. **Invoice Management**
- Link langsung ke detail invoice
- Update status invoice dari buku piutang

### 3. **Payment Reminder System**
- Integrasi dengan scheduled reminders
- Trigger reminder dari buku piutang

### 4. **WhatsApp Integration**
- Kirim reminder via WhatsApp
- Link langsung ke chat pelanggan

### 5. **Dashboard Admin**
- Widget summary piutang di dashboard
- Quick access ke buku piutang

---

## 📱 UI/UX Considerations

### 1. **Layout**
- **Single View**: Tidak menggunakan card bertumpuk (seperti revenue report)
- **Tab Navigation**: 
  - Tab "Overview" (dashboard)
  - Tab "Daftar Piutang" (tabel detail)
  - Tab "Aging Analysis" (analisis umur)
  - Tab "Per Pelanggan" (view per customer)
- **Filter Panel**: Collapsible filter panel di atas tabel
- **Summary Cards**: Cards di bagian atas dengan key metrics

### 2. **Visual Design**
- **Color Coding**:
  - Hijau: Piutang lancar (0-7 hari)
  - Kuning: Piutang mendekati jatuh tempo (8-15 hari)
  - Orange: Piutang terlambat ringan (16-30 hari)
  - Merah: Piutang terlambat berat (>30 hari)
- **Icons**: 
  - DollarSign untuk piutang
  - AlertCircle untuk overdue
  - Clock untuk aging
  - Users untuk pelanggan

### 3. **Responsive Design**
- Mobile-friendly untuk akses di lapangan
- Tabel dengan horizontal scroll di mobile
- Summary cards stack di mobile

---

## 🗄️ Database Queries yang Diperlukan

### 1. **Get All Receivables**
```typescript
prisma.invoice.findMany({
  where: {
    status: { in: ['UNPAID', 'OVERDUE', 'EXPIRED'] },
    deletedAt: null,
    // Apply filters
  },
  include: {
    user: {
      include: {
        sales: true,
        subscription: {
          include: {
            // Package info
          }
        }
      }
    }
  },
  orderBy: { dueDate: 'asc' }
})
```

### 2. **Calculate Aging**
```typescript
const today = new Date();
const aging = invoice.status === 'UNPAID' 
  ? Math.floor((today - invoice.createdAt) / (1000 * 60 * 60 * 24))
  : Math.floor((today - invoice.dueDate) / (1000 * 60 * 60 * 24));
```

### 3. **Group by Aging Bucket**
```typescript
const buckets = {
  '0-7': invoices.filter(i => aging <= 7),
  '8-15': invoices.filter(i => aging >= 8 && aging <= 15),
  '16-30': invoices.filter(i => aging >= 16 && aging <= 30),
  '31-60': invoices.filter(i => aging >= 31 && aging <= 60),
  '61-90': invoices.filter(i => aging >= 61 && aging <= 90),
  '>90': invoices.filter(i => aging > 90),
};
```

### 4. **Summary Statistics**
```typescript
const summary = {
  totalReceivable: sum(invoices.map(i => i.amount)),
  currentReceivable: sum(invoices.filter(i => i.dueDate >= today).map(i => i.amount)),
  overdueReceivable: sum(invoices.filter(i => i.dueDate < today).map(i => i.amount)),
  customerCount: new Set(invoices.map(i => i.userId)).size,
  averageReceivable: totalReceivable / customerCount,
};
```

---

## 🚀 Implementation Priority

### Phase 1: Core Features (MVP)
1. ✅ Dashboard overview dengan summary cards
2. ✅ Daftar piutang dengan tabel detail
3. ✅ Basic filtering (status, kategori, sales, lokasi)
4. ✅ Aging analysis dengan buckets
5. ✅ Export ke CSV

### Phase 2: Enhanced Features
1. ✅ Detail per pelanggan
2. ✅ Advanced filtering & search
3. ✅ Collection management (status penagihan, notes)
4. ✅ Reminder integration
5. ✅ Analytics & insights
6. ✅ Export ke PDF/Excel

### Phase 3: Advanced Features
1. ✅ Collection forecast
2. ✅ Bad debt management (write-off)
3. ✅ Custom reports
4. ✅ Integration dengan payment gateway untuk tracking
5. ✅ Automated collection workflows

---

## 📝 Notes & Considerations

### 1. **Performance**
- Gunakan pagination untuk tabel besar
- Index database pada kolom yang sering di-filter (status, dueDate, userId)
- Cache summary statistics jika perlu

### 2. **Data Accuracy**
- Pastikan status invoice selalu update (via cron job)
- Recalculate aging setiap kali data di-load
- Handle edge cases (invoice yang sudah dibayar tapi status belum update)

### 3. **Security**
- Hanya admin yang bisa akses buku piutang
- Audit log untuk actions penting (write-off, status changes)
- Permission untuk write-off (hanya super admin?)

### 4. **Business Rules**
- Tentukan kapan invoice dianggap "bad debt" (misal: >180 hari)
- Policy untuk write-off
- Escalation process untuk piutang yang lama

---

## ❓ Questions untuk Diskusi

1. **Aging Calculation**: 
   - Apakah umur dihitung dari `createdAt` atau `dueDate`?
   - Untuk UNPAID yang belum jatuh tempo, apakah perlu aging?

2. **Status Penagihan**:
   - Apakah perlu field baru di Invoice untuk tracking status penagihan?
   - Atau cukup menggunakan notes/comments?

3. **Write-off Process**:
   - Siapa yang bisa approve write-off?
   - Apakah perlu workflow approval?
   - Apakah invoice dihapus atau hanya di-mark sebagai write-off?

4. **Integration**:
   - Apakah perlu real-time update atau cukup refresh manual?
   - Apakah perlu notification untuk piutang baru/overdue?

5. **Reporting**:
   - Berapa sering laporan perlu di-generate?
   - Apakah perlu scheduled reports (email harian/mingguan)?

---

## 📚 Referensi

- [Invoice Model Schema](../prisma/schema.prisma)
- [Payment Reminder System](./PAYMENT_REMINDER_SYSTEM.md)
- [Revenue Report Implementation](../src/app/admin/billing/revenue-report/page.tsx)

---

**Last Updated**: 2025-01-XX
**Status**: Draft - Pending Discussion


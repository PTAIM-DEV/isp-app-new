# Implementation Plan: Lead Activation with Payment Flow & Promo Code

## Overview
Tujuan utama adalah memastikan setiap pelanggan yang diaktifkan memiliki konfigurasi pembayaran (`PaymentFlow`) yang jelas dan diskon (`PromoCode`) jika ada, serta tagihan pertama yang akurat.

## Workflow Aktivasi

1.  **Admin Membuka Detail Lead**
    - Admin menavigasi ke `/admin/leads/[id]`.
    - Status lead saat ini adalah `LEAD` atau `PENDING_SURVEY`.

2.  **Admin Klik "Aktifkan Pelanggan"**
    - Tombol ini memicu modal form (`ActivateForm`).
    - **PENTING**: Tombol ini bukan action langsung, tapi pembuka form.

3.  **Pengisian Form Aktivasi**
    Form ini mewajibkan admin untuk memilih:
    - **Payment Flow**: Menentukan aturan pembayaran (Instalasi berbayar/gratis, Prepaid/Bulanan, Trial).
    - **Paket Layanan**: Default dari pilihan user saat register, tapi bisa diubah.
    - **Trial Days**: Jika Payment Flow mendukung trial, admin bisa override durasi default.
    - **Promo Code**: (Opsional) Untuk memberikan diskon instalasi atau bulanan.

4.  **Proses Backend (`activateCustomer`)**
    Saat form disubmit:
    - **Validasi**: Cek ketersediaan Payment Flow dan Paket.
    - **Subscription**: Membuat record `Subscription` baru yang terhubung dengan `PaymentFlow` yang dipilih.
    - **Status Update**: Mengubah status user menjadi `ACTIVE` (atau `PENDING_INSTALL` jika flow instalasi terpisah).
    - **Invoice Generation**:
        - **Instalasi**: Jika Payment Flow mewajibkan biaya instalasi, invoice tipe `INSTALLATION` dibuat. Jika ada Promo Code "Free Installation", invoice ini tidak dibuat atau nilainya 0.
        - **Bulan Pertama**: Jika Payment Flow mewajibkan bayar di muka (bukan prepaid), invoice tipe `MONTHLY` (First Month) dibuat. Diskon promo code diterapkan di sini jika tipe diskonnya persentase/nominal.

## Logika Pembayaran (Invoice Generation)

Sistem invoice (`lib/invoice-generator.ts`) bekerja berdasarkan `PaymentFlow` yang tersimpan di `Subscription` user.

- **Skenario 1: Reguler + Biaya Instalasi**
    - Payment Flow: `requiresInstallationPayment = true`, `requiresFirstMonthPayment = true`.
    - Hasil: 2 Invoice (1 Instalasi, 1 Bulan Pertama).
    - Promo: Jika ada promo diskon 50%, diterapkan ke Bulan Pertama.

- **Skenario 2: Promo Gratis Instalasi**
    - Payment Flow: `requiresInstallationPayment = true`.
    - Promo Code: Tipe `FREE_INSTALLATION`.
    - Hasil: Invoice Instalasi Rp 0 (atau tidak dibuat), Invoice Bulan Pertama normal.

- **Skenario 3: Prepaid 6 Bulan**
    - Payment Flow: `supportsPrepaid = true`.
    - Admin memilih opsi prepaid di masa depan (saat ini form aktivasi fokus ke setup awal, prepaid invoice biasanya dibuat terpisah atau user request).
    - *Catatan*: Form aktivasi saat ini mensetup *subscription dasar*. Jika user langsung bayar prepaid, admin bisa generate invoice prepaid manual setelah aktivasi.

## Next Steps for User
1.  Pastikan server sudah direstart (`npm run dev`).
2.  Buka detail lead.
3.  Klik tombol "Aktifkan Pelanggan".
4.  Isi form yang muncul.
5.  Cek tab "Invoices" (jika ada) atau database untuk melihat invoice yang terbentuk.

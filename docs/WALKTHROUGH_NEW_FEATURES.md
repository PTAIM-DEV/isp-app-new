# Walkthrough: Enhanced Registration & Payment System

## Fitur Baru yang Diimplementasikan

### 1. Admin Payment Flows
- **Lokasi**: `/admin/payment-flows`
- **Fungsi**: Membuat dan mengelola alur pembayaran (Prepaid, Monthly, Installation Fee).
- **Fitur**:
  - Konfigurasi biaya instalasi (Gratis/Berbayar).
  - Konfigurasi pembayaran bulan pertama.
  - Opsi Prepaid (3, 6, 12 bulan) dengan bonus bulan.
  - Opsi Trial Period.

### 2. Admin Promo Codes
- **Lokasi**: `/admin/promos`
- **Fungsi**: Membuat kode promo untuk diskon atau bonus.
- **Tipe Promo**:
  - Diskon Persentase (%)
  - Diskon Nominal (Rp)
  - Gratis Instalasi
  - Bonus Bulan

### 3. Admin Syarat & Ketentuan
- **Lokasi**: `/admin/settings` (Scroll ke bawah)
- **Fungsi**: Mengedit konten Syarat & Ketentuan yang tampil di halaman registrasi.

### 4. Halaman Registrasi
- **Lokasi**: `/register`
- **Pembaruan**:
  - Integrasi T&C Agreement (Wajib dicentang).
  - Tampilan T&C dalam modal.
  - Validasi form yang lebih ketat.

### 5. Aktivasi Pelanggan (Admin)
- **Lokasi**: `/admin/leads/[id]`
- **Fungsi**: Tombol "Aktifkan Pelanggan" sekarang membuka form lengkap.
- **Fitur**:
  - Memilih Payment Flow.
  - Memilih Paket Layanan.
  - Mengatur durasi Trial (jika berlaku).
  - Memasukkan Kode Promo.

## Cara Pengujian

1.  **Restart Server**: Wajib lakukan `npm run dev` ulang agar database schema baru terbaca.
2.  **Buat Payment Flow**: Buka `/admin/payment-flows/new` dan buat flow standar (misal: "Reguler + Instalasi").
3.  **Buat Promo Code**: Buka `/admin/promos/new` dan buat kode promo (misal: "HEMAT10").
4.  **Edit T&C**: Buka `/admin/settings` dan isi konten T&C.
5.  **Registrasi User**: Buka `/register`, isi data, setujui T&C, dan submit.
6.  **Aktivasi User**: Buka detail lead di admin, klik "Aktifkan Pelanggan", pilih flow & paket, masukkan promo code, dan simpan.
7.  **Cek Invoice**: Pastikan invoice terbentuk sesuai konfigurasi (diskon promo, biaya instalasi, dll).

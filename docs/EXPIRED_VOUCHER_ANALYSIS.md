# Analisa Masalah Expired Voucher & Solusi

## Bagaimana MIKHMON Handle Expired Voucher?

### 1. **On-Login Script** (di Profile)
Saat user login pertama kali:
- Script check comment user
- Jika comment kosong atau format "vc"/"up", script akan:
  - Create scheduler sementara untuk hitung expiry
  - Set comment dengan format: `DD/MM/YYYY HH:MM`
  - Remove scheduler setelah set comment

### 2. **Background Scheduler Script** (per Profile)
- Script dijalankan setiap beberapa detik (random interval: 00:02:XX)
- Check semua user dengan profile tertentu
- Parse comment untuk extract expiry date
- Jika expired:
  - Set `limit-uptime=1s` (untuk notice mode) atau `remove` (untuk remove mode)
  - Disconnect active session

### 3. **Comment Format**
Format yang digunakan: `DD/MM/YYYY HH:MM`
- Contoh: `25/01/2024 14:30`
- Script parse dengan:
  - `[:pick $comment 3]` = "/" (posisi 3)
  - `[:pick $comment 6]` = "/" (posisi 6)
  - `[:pick $comment 12 20]` = waktu (HH:MM)

## Masalah di Implementasi Kita

### 1. **Profile Creation Di-Skip**
- Profile creation dinonaktifkan karena error `!empty`
- Akibatnya: **Bandwidth limit tidak ada**
- Solusi: Re-enable dengan fix !empty handling

### 2. **Scheduler Tidak Otomatis Diinstall**
- Scheduler perlu diinstall manual via UI
- Tidak otomatis saat sync voucher
- Solusi: Auto-install scheduler saat sync atau saat create profile

### 3. **Comment Format**
- Format sudah benar: `DD/MM/YYYY HH:MM Voucher: CODE`
- Tapi scheduler expect format: `DD/MM/YYYY HH:MM` (tanpa text setelahnya)
- Solusi: Ubah format comment atau update scheduler script

## Solusi yang Diimplementasikan

### 1. Re-enable Profile Creation
- Fix !empty reply handling (treat sebagai success)
- Verify profile setelah unknown reply
- Timeout handling yang lebih baik

### 2. Auto-Install Scheduler
- Install scheduler saat create profile pertama kali
- Atau install global scheduler untuk semua user

### 3. Fix Comment Format
- Format: `DD/MM/YYYY HH:MM` (sesuai dengan scheduler script)
- Atau update scheduler untuk handle format dengan text setelahnya

## Perbandingan: MIKHMON vs Implementasi Kita

| Feature | MIKHMON | Implementasi Kita |
|---------|---------|-------------------|
| Profile Creation | ✅ Otomatis dengan bandwidth | ❌ Di-skip (perlu diaktifkan) |
| On-Login Script | ✅ Set expiry date saat login | ❌ Belum diimplementasi |
| Scheduler | ✅ Per profile, auto-install | ⚠️ Global, manual install |
| Expired Check | ✅ Setiap beberapa detik | ⚠️ Setiap 5 detik (global) |
| Comment Format | `DD/MM/YYYY HH:MM` | `DD/MM/YYYY HH:MM Voucher: CODE` |

## Rekomendasi

1. **Re-enable Profile Creation** dengan bandwidth limit
2. **Install Scheduler Otomatis** saat sync voucher pertama kali
3. **Fix Comment Format** untuk match dengan scheduler script
4. **Implementasi On-Login Script** (opsional, untuk set expiry saat login)







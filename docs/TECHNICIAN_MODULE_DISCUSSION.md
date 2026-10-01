# 💬 Penjelasan Pertanyaan Diskusi - Modul Teknisi

Dokumen ini menjelaskan maksud dari setiap pertanyaan diskusi agar tidak terjadi kesalahpahaman dalam menjawab.

---

## 1. 🔐 Authentication: Password vs OTP WhatsApp

### Pertanyaan:
> Apakah teknisi perlu password atau cukup OTP via WhatsApp? Apakah perlu 2FA?

### Penjelasan:
Saat ini sistem admin menggunakan **password-based authentication** (username + password). Untuk teknisi, ada beberapa opsi:

**Opsi A: Password-based (seperti admin)**
- Teknisi login dengan phone/email + password
- Password disimpan di database (di-hash)
- Pro: Lebih secure, tidak tergantung WhatsApp
- Con: Teknisi harus ingat password

**Opsi B: OTP via WhatsApp saja**
- Teknisi input nomor HP → sistem kirim OTP via WhatsApp → teknisi input OTP
- Tidak perlu password
- Pro: Lebih mudah untuk teknisi, tidak perlu ingat password
- Con: Tergantung WhatsApp aktif, kurang secure jika HP hilang

**Opsi C: Hybrid (Password + OTP)**
- Teknisi bisa pilih: login dengan password ATAU OTP WhatsApp
- Pro: Fleksibel
- Con: Lebih kompleks

**2FA (Two-Factor Authentication):**
- Setelah login dengan password, masih perlu verifikasi tambahan (OTP via WhatsApp)
- Pro: Lebih secure
- Con: Lebih ribet untuk teknisi di lapangan

### Yang perlu diputuskan:
- Metode login apa yang paling cocok untuk teknisi?
- Apakah perlu tingkat keamanan tinggi atau kemudahan lebih penting?

---

## 2. 📋 Task Types: Maintenance Model Terpisah atau Digabung?

### Pertanyaan:
> Apakah maintenance perlu model terpisah atau cukup di Installation? Apakah perlu recurring maintenance tasks?

### Penjelasan:
Saat ini ada model `Installation` yang digunakan untuk instalasi baru. Pertanyaannya adalah untuk tugas **maintenance** (perawatan rutin/perbaikan):

**Opsi A: Model Terpisah (`MaintenanceTask`)**
```
Installation → untuk instalasi baru
MaintenanceTask → untuk maintenance/perbaikan
```
- Pro: 
  - Data lebih terpisah dan jelas
  - Bisa tracking berbeda (KPI instalasi vs KPI maintenance)
  - Maintenance bisa punya field khusus (misal: recurring schedule)
- Con: 
  - Lebih banyak model
  - Perlu handle 2 jenis task di UI

**Opsi B: Digabung di Installation (dengan field `taskType`)**
```
Installation dengan taskType:
- INSTALLATION (instalasi baru)
- MAINTENANCE (perawatan)
- REPAIR (perbaikan)
- UPGRADE (upgrade)
```
- Pro:
  - Satu model saja, lebih simple
  - UI lebih mudah (satu tempat untuk semua task)
- Con:
  - Field yang tidak relevan (misal: `userId` untuk maintenance mungkin tidak perlu)
  - Tracking KPI lebih kompleks

**Recurring Maintenance Tasks:**
- Apakah ada maintenance yang harus dilakukan secara berkala? (misal: setiap 3 bulan sekali)
- Jika ya, perlu sistem untuk auto-generate task maintenance di masa depan
- Contoh: Customer A perlu maintenance setiap 3 bulan → sistem auto-create task setiap 3 bulan

### Yang perlu diputuskan:
- Apakah maintenance berbeda cukup signifikan dari instalasi sehingga perlu model terpisah?
- Apakah ada kebutuhan recurring maintenance?

---

## 3. 📊 KPI Metrics: Mana yang Paling Penting?

### Pertanyaan:
> Metrics apa saja yang paling penting? Apakah perlu customer rating/feedback? Bagaimana menghitung quality score?

### Penjelasan:
Ada banyak metrics yang bisa di-track. Pertanyaannya adalah mana yang **paling penting** untuk bisnis:

**Metrics yang bisa di-track:**
1. **Completion Rate** - % tugas yang selesai vs total tugas
2. **On-Time Rate** - % tugas yang selesai tepat waktu
3. **Average Completion Time** - Rata-rata waktu penyelesaian
4. **Task Volume** - Jumlah tugas per periode
5. **Failure Rate** - % tugas yang gagal
6. **Revision Rate** - % tugas yang perlu revisi
7. **Customer Satisfaction** - Rating dari customer (jika ada)
8. **Quality Score** - Skor gabungan dari berbagai faktor

**Customer Rating/Feedback:**
- Apakah perlu sistem rating dari customer setelah teknisi selesai kerja?
- Contoh: Customer kasih rating 1-5 bintang + komentar
- Pro: Bisa tahu kepuasan customer langsung
- Con: Perlu integrasi dengan customer, mungkin customer tidak mau kasih rating

**Quality Score Calculation:**
- Bagaimana cara menghitung "quality score"?
- Contoh formula:
  - Quality Score = (Completion Rate × 0.3) + (On-Time Rate × 0.3) + (Customer Rating × 0.2) + ((1 - Revision Rate) × 0.2)
- Atau lebih simple: hanya berdasarkan Completion Rate + On-Time Rate?

### Yang perlu diputuskan:
- Metrics mana yang paling penting untuk tracking performance teknisi?
- Apakah perlu customer rating/feedback?
- Bagaimana cara menghitung quality score (jika diperlukan)?

---

## 4. 🔔 Notifications: Channel & Frequency

### Pertanyaan:
> Channel apa saja yang digunakan? (WhatsApp, Email, SMS, Push) Frequency reminder?

### Penjelasan:
Ketika ada tugas baru atau reminder, teknisi perlu diberitahu. Pertanyaannya adalah:

**Channel Options:**
1. **WhatsApp** - Via WhatsApp Business API (sudah ada di sistem)
   - Pro: Teknisi pasti pakai WhatsApp
   - Con: Tergantung WhatsApp aktif
2. **Email** - Via email
   - Pro: Formal, bisa di-archive
   - Con: Teknisi mungkin tidak cek email rutin
3. **SMS** - Via SMS gateway
   - Pro: Langsung ke HP
   - Con: Biaya per SMS
4. **Push Notification** - Jika ada mobile app
   - Pro: Real-time
   - Con: Perlu mobile app dulu

**Frequency Reminder:**
- Kapan reminder dikirim?
- Contoh:
  - 1 hari sebelum jadwal
  - 2 jam sebelum jadwal
  - 30 menit sebelum jadwal
  - Setiap hari untuk tugas yang belum selesai

### Yang perlu diputuskan:
- Channel mana yang paling efektif untuk teknisi?
- Kapan reminder dikirim? (berapa kali, timing-nya)

---

## 5. 📸 Photo Upload: Storage Solution

### Pertanyaan:
> Storage solution? (Local, S3, Cloudinary) Size limit? Compression needed?

### Penjelasan:
Ketika teknisi selesai tugas, mereka mungkin perlu upload foto (sebelum/sesudah, bukti kerja, dll). Pertanyaannya adalah:

**Storage Options:**
1. **Local Storage** - Simpan di server/hosting
   - Pro: Tidak perlu service eksternal, gratis
   - Con: Bisa penuh storage, tidak scalable, backup manual
2. **AWS S3** - Amazon S3
   - Pro: Scalable, reliable, backup otomatis
   - Con: Perlu setup AWS, ada biaya
3. **Cloudinary** - Cloud image service
   - Pro: Auto compression, CDN, mudah digunakan
   - Con: Ada biaya, perlu API key

**Size Limit:**
- Berapa maksimal ukuran foto per upload?
- Contoh: 5MB, 10MB, atau tidak ada limit?

**Compression:**
- Apakah foto perlu di-compress otomatis?
- Pro: Hemat storage, load lebih cepat
- Con: Kualitas mungkin turun sedikit

### Yang perlu diputuskan:
- Storage solution mana yang digunakan?
- Berapa size limit per foto?
- Apakah perlu auto-compression?

---

## 6. 📍 Location Tracking: GPS Check-in

### Pertanyaan:
> Apakah perlu GPS tracking? Check-in/check-out location?

### Penjelasan:
Untuk memastikan teknisi benar-benar datang ke lokasi customer:

**GPS Tracking:**
- Apakah perlu track lokasi teknisi secara real-time?
- Pro: Bisa tahu teknisi di mana, memastikan mereka di lokasi yang benar
- Con: Privacy concern, konsumsi baterai HP, perlu permission

**Check-in/Check-out Location:**
- Ketika teknisi mulai tugas, apakah perlu "check-in" dengan lokasi GPS?
- Ketika selesai, apakah perlu "check-out"?
- Sistem bisa compare lokasi teknisi dengan lokasi customer
- Pro: Memastikan teknisi benar-benar di lokasi
- Con: Jika GPS tidak akurat, bisa jadi masalah

**Alternatif:**
- Hanya ambil lokasi sekali saat start task
- Atau tidak perlu GPS sama sekali, cukup manual input

### Yang perlu diputuskan:
- Apakah perlu GPS tracking/check-in?
- Atau cukup manual (teknisi input sendiri bahwa mereka sudah di lokasi)?

---

## 7. ✅ Approval Workflow: Supervisor Approval

### Pertanyaan:
> Apakah report perlu approval dari supervisor? Atau langsung approved setelah submit?

### Penjelasan:
Ketika teknisi selesai tugas dan submit report:

**Opsi A: Auto-Approved**
- Teknisi submit report → langsung approved, tugas selesai
- Pro: Cepat, tidak perlu tunggu approval
- Con: Tidak ada quality control

**Opsi B: Perlu Supervisor Approval**
- Teknisi submit report → supervisor review → approve/reject
- Jika reject, teknisi perlu revisi
- Pro: Ada quality control, memastikan pekerjaan sesuai standar
- Con: Lebih lambat, perlu supervisor aktif

**Opsi C: Conditional Approval**
- Report langsung approved, tapi supervisor bisa review kemudian
- Jika ada masalah, supervisor bisa flag untuk revisi
- Pro: Balance antara speed dan quality control

### Yang perlu diputuskan:
- Apakah perlu approval workflow?
- Atau cukup teknisi submit langsung selesai?

---

## 8. 🔄 Revisions: Handle Tugas yang Perlu Revisi

### Pertanyaan:
> Bagaimana handle tugas yang perlu revisi? Apakah teknisi bisa reassign ke teknisi lain?

### Penjelasan:
Ketika tugas selesai tapi ada masalah (misal: customer komplain, perlu perbaikan lagi):

**Revisi Process:**
1. **Siapa yang bisa request revisi?**
   - Supervisor/admin?
   - Customer?
   - Teknisi sendiri?

2. **Apa yang terjadi ketika revisi?**
   - Tugas kembali ke status PENDING?
   - Atau buat task baru?
   - Atau tetap di teknisi yang sama tapi status berubah?

3. **Reassign ke Teknisi Lain:**
   - Apakah teknisi bisa reassign tugas ke teknisi lain?
   - Atau hanya admin/supervisor yang bisa reassign?
   - Kapan perlu reassign? (misal: teknisi sakit, tidak bisa handle)

**Contoh Scenario:**
- Teknisi A selesai instalasi, tapi customer komplain internet tidak nyambung
- Supervisor request revisi
- Apakah:
  - Teknisi A yang harus revisi (reassign ke teknisi A lagi)?
  - Atau bisa assign ke Teknisi B?
  - Atau buat task baru untuk revisi?

### Yang perlu diputuskan:
- Bagaimana proses revisi?
- Siapa yang bisa reassign?
- Kapan perlu reassign vs tetap ke teknisi yang sama?

---

## 📝 Summary: Yang Perlu Dijawab

1. **Authentication**: Password, OTP WhatsApp, atau Hybrid? Perlu 2FA?
2. **Task Types**: Maintenance model terpisah atau digabung? Perlu recurring?
3. **KPI Metrics**: Metrics mana yang penting? Perlu customer rating? Quality score formula?
4. **Notifications**: Channel apa? Frequency reminder?
5. **Photo Upload**: Storage solution? Size limit? Compression?
6. **Location Tracking**: Perlu GPS check-in? Atau manual saja?
7. **Approval Workflow**: Perlu supervisor approval? Atau auto-approved?
8. **Revisions**: Bagaimana proses revisi? Siapa yang bisa reassign?

---

**Silakan jawab setiap pertanyaan sesuai dengan kebutuhan bisnis Anda!** 🚀


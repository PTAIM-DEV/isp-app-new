# Analisa Lengkap: Mekanisme Expiry di MIKHMON

## Kesimpulan: MIKHMON Menggunakan DUA Mekanisme

### 1. **Time-Based Expiry (limit-uptime)**
**TIDAK memerlukan scheduler** - dihandle oleh MikroTik built-in

- MIKHMON set `limit-uptime` saat create user (misalnya: `12h`, `1d`, `3h`)
- MikroTik secara otomatis track uptime user dan disconnect ketika limit tercapai
- **Tidak perlu scheduler** - ini fitur built-in MikroTik

**Contoh dari `post_generate_voucher.php`:**
```php
$API->comm("/ip/hotspot/user/add", array(
    "name" => "$u[$i]",
    "password" => "$p[$i]",
    "profile" => "$profile",
    "limit-uptime" => "$timelimit",  // Misalnya "12h" atau "1d"
    "limit-bytes-total" => "$datalimit",
    "comment" => "$commt",
));
```

### 2. **Date-Based Expiry (Comment dengan Format DD/MM/YYYY HH:MM)**
**MEMERLUKAN scheduler** - dihandle oleh scheduler `Mikhmon-Expire-Monitor`

- MIKHMON set comment dengan format `DD/MM/YYYY HH:MM` (misalnya: `25/01/2024 14:30`)
- Scheduler `Mikhmon-Expire-Monitor` check setiap 1 menit
- Script parse comment dan disconnect user yang expired berdasarkan tanggal & waktu

**Contoh dari `post_expire_monitor.php`:**
```php
// Scheduler dijalankan setiap 1 menit
$expmon = $API->comm("/system/scheduler/add", array(
    "name" => "Mikhmon-Expire-Monitor",
    "start-time" => "00:00:00",
    "interval" => "00:01:00",  // Setiap 1 menit
    "on-event" => "$expire_monitor_src",  // Script untuk check expired
    "disabled" => "no"
));
```

**Script check expired (dari scheduler):**
```routeros
:foreach i in=[/ip hotspot user find] do={
  :local comment [/ip hotspot user get $i comment];
  :local name [/ip hotspot user get $i name];
  :local gettime [:pick $comment 12 20];
  :if ([:pick $comment 3] = "/" and [:pick $comment 6] = "/") do={
    :local expd [$dateint d=$comment];
    :local expt [$timeint t=$gettime];
    :if (($expd < $today and $expt < $curtime) or ...) do={
      [/ip hotspot user set limit-uptime=1s $i];
      [/ip hotspot active remove [find where user=$name]];
    }
  }
}
```

### 3. **On-Login Script (Set Expiry Date saat Login)**
MIKHMON juga menggunakan on-login script di profile untuk **SET** expiry date di comment saat user login pertama kali:

**Dari `post_add_userprofile.php`:**
```php
$onlogin = '... :if ($ucode = "vc" or $ucode = "up" or $comment = "") do={
  /sys sch add name="$user" disable=no start-date=$date interval="' . $validity . '";
  :delay 2s;
  :local exp [ /sys sch get [ /sys sch find where name="$user" ] next-run];
  // Set comment dengan format DD/MM/YYYY HH:MM
  /ip hotspot user set comment="$exp $mode" [find where name="$user"];
  /sys sch remove [find where name="$user"];
}';
```

**Cara kerja:**
1. User login pertama kali
2. On-login script create scheduler sementara untuk hitung expiry date
3. Ambil `next-run` dari scheduler (ini adalah expiry date)
4. Set comment user dengan format `DD/MM/YYYY HH:MM`
5. Hapus scheduler sementara
6. Scheduler `Mikhmon-Expire-Monitor` akan check comment ini setiap 1 menit

## Perbandingan

| Mekanisme | MIKHMON | Implementasi Kita | Perlu Scheduler? |
|-----------|---------|-------------------|------------------|
| **Time-Based (limit-uptime)** | ✅ Menggunakan | ✅ Menggunakan | ❌ Tidak perlu |
| **Date-Based (comment)** | ✅ Menggunakan | ✅ Menggunakan | ✅ **Perlu** |
| **On-Login Script** | ✅ Menggunakan | ❌ Belum | ⚠️ Perlu scheduler untuk set expiry |

## Jawaban untuk Pertanyaan

**Q: Apakah MIKHMON memerlukan scheduler diaktifkan di MikroTik?**

**A: YA, untuk date-based expiry (comment dengan format DD/MM/YYYY HH:MM)**

- Untuk **time-based expiry** (limit-uptime): **TIDAK perlu scheduler** - MikroTik handle otomatis
- Untuk **date-based expiry** (comment dengan tanggal): **PERLU scheduler** - `Mikhmon-Expire-Monitor` check setiap 1 menit
- Untuk **on-login script**: **PERLU scheduler** - untuk set expiry date di comment saat login pertama

## Kesimpulan

Informasi dari AI lain **sebagian benar**:
- ✅ Time-based expiry (limit-uptime) tidak perlu scheduler - MikroTik handle otomatis
- ❌ Tapi MIKHMON **juga menggunakan scheduler** untuk date-based expiry berdasarkan comment format

**Jadi MIKHMON menggunakan KEDUA mekanisme:**
1. **limit-uptime** (tidak perlu scheduler) - untuk time-based expiry
2. **Scheduler + Comment** (perlu scheduler) - untuk date-based expiry

## Rekomendasi untuk Implementasi Kita

Kita sudah menggunakan **kedua mekanisme**:
1. ✅ `limit-uptime` untuk time-based expiry (sudah diimplementasi)
2. ✅ Comment dengan format `DD/MM/YYYY HH:MM` untuk date-based expiry (sudah diimplementasi)
3. ✅ Scheduler untuk check expired vouchers (sudah dibuat, tapi device mode tidak mengizinkan)

**Solusi:**
- Gunakan **PHP CLI Script** via cron job sebagai alternatif scheduler
- Atau **enable scheduler di device mode** MikroTik







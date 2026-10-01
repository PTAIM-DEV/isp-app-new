# Solusi Expired Voucher - Analisa MIKHMON

## Bagaimana MIKHMON Handle Expired Voucher?

### 1. **On-Login Script** (Saat User Login Pertama Kali)

MIKHMON menggunakan on-login script di profile yang:
- Check comment user (format "vc", "up", atau kosong)
- Jika belum ada expiry date, script akan:
  1. Create scheduler sementara dengan interval sesuai validity (e.g., "12h")
  2. Get next-run dari scheduler (ini adalah expiry date/time)
  3. Set comment user dengan format: `DD/MM/YYYY HH:MM`
  4. Remove scheduler setelah set comment

**Contoh Script:**
```routeros
:put (",ntfc,150000,12h,150000,,Enable,");
{:local comment [ /ip hotspot user get [/ip hotspot user find where name="$user"] comment];
:local ucode [:pick $comment 0 2];
:if ($ucode = "vc" or $ucode = "up" or $comment = "") do={
  :local date [ /system clock get date ];
  :local year [ :pick $date 7 11 ];
  :local month [ :pick $date 0 3 ];
  /sys sch add name="$user" disable=no start-date=$date interval="12h";
  :delay 5s;
  :local exp [ /sys sch get [ /sys sch find where name="$user" ] next-run];
  :local getxp [len $exp];
  :if ($getxp = 15) do={
    :local d [:pick $exp 0 6];
    :local t [:pick $exp 7 16];
    :local s ("/");
    :local exp ("$d$s$year $t");
    /ip hotspot user set comment="$exp" [find where name="$user"];
  };
  :delay 5s;
  /sys sch remove [find where name="$user"];
}}
```

### 2. **Background Scheduler Script** (Check Expired Setiap Beberapa Detik)

MIKHMON install scheduler per profile yang:
- Run setiap beberapa detik (random interval: 00:02:XX)
- Check semua user dengan profile tertentu
- Parse comment untuk extract expiry date
- Jika expired: set `limit-uptime=1s` dan disconnect

**Script Format:**
```routeros
:local dateint do={
  :local montharray ("jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec");
  :local days [:pick $d 4 6];
  :local month [:pick $d 0 3];
  :local year [:pick $d 7 11];
  :local monthint ([:find $montharray $month]);
  :local month ($monthint + 1);
  :if ([len $month] = 1) do={
    :local zero ("0");
    :return [:tonum ("$year$zero$month$days")];
  } else={
    :return [:tonum ("$year$month$days")];
  }
};
:local timeint do={
  :local hours [:pick $t 0 2];
  :local minutes [:pick $t 3 5];
  :return ($hours * 60 + $minutes);
};
:local date [/system clock get date];
:local time [/system clock get time];
:local today [$dateint d=$date];
:local curtime [$timeint t=$time];
:foreach i in=[/ip hotspot user find where profile="PROFILE_NAME"] do={
  :local comment [/ip hotspot user get $i comment];
  :local name [/ip hotspot user get $i name];
  :local gettime [:pick $comment 12 20];
  :if ([:pick $comment 3] = "/" and [:pick $comment 6] = "/") do={
    :local expd [$dateint d=$comment];
    :local expt [$timeint t=$gettime];
    :if (($expd < $today and $expt < $curtime) or ($expd < $today and $expt > $curtime) or ($expd = $today and $expt < $curtime)) do={
      [/ip hotspot user set limit-uptime=1s $i];
      [/ip hotspot active remove [find where user=$name]];
    }
  }
}
```

### 3. **Comment Format**

Format yang digunakan: `DD/MM/YYYY HH:MM`
- Contoh: `25/01/2024 14:30`
- Script parse dengan:
  - `[:pick $comment 3]` = "/" (posisi ke-3, karakter ke-4)
  - `[:pick $comment 6]` = "/" (posisi ke-6, karakter ke-7)
  - `[:pick $comment 12 20]` = waktu "HH:MM" (posisi 12-19)

## Masalah di Implementasi Kita

### 1. **Profile Creation Di-Skip**
- ❌ Profile creation dinonaktifkan karena error `!empty`
- ❌ Akibatnya: **Bandwidth limit tidak ada**
- ✅ **Solusi**: Re-enable dengan fix !empty handling (sudah dilakukan)

### 2. **Scheduler Tidak Otomatis Diinstall**
- ❌ Scheduler perlu diinstall manual via UI
- ❌ Tidak otomatis saat sync voucher
- ✅ **Solusi**: Auto-install scheduler saat sync voucher pertama kali (sudah dilakukan)

### 3. **Comment Format Tidak Sesuai**
- ❌ Format sebelumnya: `DD/MM/YYYY HH:MM Voucher: CODE`
- ❌ Scheduler script expect: `DD/MM/YYYY HH:MM` (tanpa text setelahnya)
- ✅ **Solusi**: Ubah format comment menjadi `DD/MM/YYYY HH:MM` (sudah dilakukan)

### 4. **On-Login Script Belum Diimplementasi**
- ❌ On-login script untuk set expiry date saat login belum ada
- ⚠️ **Impact**: Expiry date harus di-set manual saat sync (sudah dilakukan)
- ✅ **Workaround**: Set expiry date langsung saat sync voucher

## Solusi yang Sudah Diimplementasikan

### ✅ 1. Re-enable Profile Creation
- Fix !empty reply handling (treat sebagai success)
- Verify profile setelah unknown reply
- Timeout handling yang lebih baik (8 detik)
- Profile dibuat dengan bandwidth limit dari package

### ✅ 2. Auto-Install Scheduler
- Install scheduler otomatis saat sync voucher pertama kali
- Check apakah scheduler sudah ada sebelum install
- Non-critical error (voucher sync tetap berhasil meskipun scheduler gagal)

### ✅ 3. Fix Comment Format
- Format: `DD/MM/YYYY HH:MM` (sesuai dengan scheduler script)
- Tidak ada text tambahan setelah waktu
- Scheduler bisa parse dengan benar

### ⚠️ 4. On-Login Script (Belum)
- On-login script belum diimplementasi karena kompleksitas
- Workaround: Set expiry date langsung saat sync voucher
- Bisa diimplementasi nanti jika diperlukan

## Perbandingan: MIKHMON vs Implementasi Kita

| Feature | MIKHMON | Implementasi Kita |
|---------|---------|-------------------|
| **Profile Creation** | ✅ Otomatis dengan bandwidth | ✅ **Sudah diaktifkan** |
| **Bandwidth Limit** | ✅ Via profile rate-limit | ✅ **Sudah diaktifkan** |
| **On-Login Script** | ✅ Set expiry saat login | ⚠️ Set expiry saat sync |
| **Scheduler** | ✅ Per profile, auto-install | ✅ Global, auto-install |
| **Expired Check** | ✅ Setiap beberapa detik | ✅ Setiap 5 detik |
| **Comment Format** | `DD/MM/YYYY HH:MM` | ✅ `DD/MM/YYYY HH:MM` |

## Cara Kerja Sekarang

### 1. Saat Sync Voucher
1. Create/update profile dengan bandwidth limit (jika ada)
2. Set expiry date di comment user: `DD/MM/YYYY HH:MM`
3. Create user dengan profile (jika ada) atau limit-uptime langsung
4. Auto-install scheduler jika belum ada

### 2. Scheduler Check (Setiap 5 Detik)
1. Loop semua hotspot users
2. Parse comment untuk extract expiry date
3. Compare dengan current date/time
4. Jika expired:
   - Set `limit-uptime=1s`
   - Disconnect active session

### 3. Perbedaan dengan MIKHMON
- **MIKHMON**: Expiry date di-set saat login pertama kali (via on-login script)
- **Kita**: Expiry date di-set saat sync voucher (langsung di comment)

## Testing

Untuk test expired voucher:
1. Sync voucher dengan expiry date yang sudah lewat (misalnya: kemarin)
2. Check apakah scheduler disconnect user tersebut
3. Check log di MikroTik untuk melihat scheduler execution

## Catatan

- Scheduler akan check **semua** hotspot users, bukan hanya voucher
- Pastikan comment format benar: `DD/MM/YYYY HH:MM`
- Scheduler auto-install saat sync voucher pertama kali per server
- Bisa juga install manual via UI di server detail page







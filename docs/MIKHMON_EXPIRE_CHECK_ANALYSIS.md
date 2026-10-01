# Analisa: Bagaimana MIKHMON Melakukan Expired Voucher Checking

## Mekanisme MIKHMON

### 1. **Scheduler di RouterOS**
- **Nama**: `Mikhmon-Expire-Monitor`
- **Interval**: Setiap 1 menit (`00:01:00`)
- **Start Time**: `00:00:00`
- **Status**: Disabled/Enabled bisa di-toggle

### 2. **Flow Proses**

#### A. Setup Scheduler (via PHP)
File: `post_expire_monitor.php`

```php
// Script source dikirim dari frontend via POST
$expire_monitor_src = $_POST['expmon'];

// Check apakah scheduler sudah ada
$get_expire_mon = $API->comm("/system/scheduler/print", array(
    "?name" => "Mikhmon-Expire-Monitor"
));

// Jika belum ada, buat scheduler baru
if($get_expire_mon[0]['name'] !== "Mikhmon-Expire-Monitor"){
    $expmon = $API->comm("/system/scheduler/add", array(
        "name" => "Mikhmon-Expire-Monitor",
        "start-time" => "00:00:00",
        "interval" => "00:01:00",
        "on-event" => "$expire_monitor_src",  // Script source dari frontend
        "disabled" => "no",
        "comment" => "Mikhmon Expire Monitor"
    ));
}
```

#### B. Script Source (RouterOS Script)
Script source dikirim dari frontend JavaScript, kemungkinan besar formatnya seperti ini:

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
:foreach i in=[/ip hotspot user find] do={
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

### 3. **Cara Kerja Script**

1. **Parse Date & Time**:
   - `dateint`: Convert date string (e.g., "25/jan/2024") ke integer untuk comparison
   - `timeint`: Convert time string (e.g., "14:30") ke minutes untuk comparison

2. **Get Current Date & Time**:
   - Ambil current date dan time dari RouterOS system clock

3. **Loop Semua Hotspot Users**:
   - Iterate semua user di `/ip hotspot user`
   - Ambil comment user (format: `DD/MM/YYYY HH:MM`)

4. **Check Expiry**:
   - Parse comment untuk extract expiry date & time
   - Compare dengan current date & time
   - Jika expired:
     - Set `limit-uptime=1s` (untuk disconnect user)
     - Remove active session

### 4. **Comment Format**
Format comment yang digunakan: `DD/MM/YYYY HH:MM`
- Contoh: `25/01/2024 14:30`
- Script parse dengan:
  - `[:pick $comment 3]` = "/" (posisi 3)
  - `[:pick $comment 6]` = "/" (posisi 6)
  - `[:pick $comment 12 20]` = waktu (HH:MM)

### 5. **Check Status**
File: `get_expire_mon.php`

```php
$get_expire_mon = $API->comm("/system/scheduler/print", array(
    "?name" => "Mikhmon-Expire-Monitor",
    "?disabled" => "false"
));

if($get_expire_mon[0]['name'] == "Mikhmon-Expire-Monitor"){
    $mess = array("expire_monitor" => "ok");
} else {
    $mess = array("expire_monitor" => "not ready");
}
```

## Perbandingan dengan Implementasi Kita

| Aspek | MIKHMON | Implementasi Kita |
|-------|---------|-------------------|
| **Scheduler** | ✅ RouterOS Scheduler (setiap 1 menit) | ❌ Device mode tidak mengizinkan |
| **Script Location** | ✅ RouterOS Script (via scheduler) | ⚠️ PHP CLI Script (via cron) |
| **Interval** | 1 menit | 5 detik (jika scheduler bisa) |
| **Execution** | Di RouterOS langsung | Via PHP CLI dari server |
| **Comment Format** | `DD/MM/YYYY HH:MM` | `DD/MM/YYYY HH:MM` (sama) |

## Solusi untuk Implementasi Kita

Karena device mode RouterOS tidak mengizinkan scheduler, kita bisa:

### 1. **PHP CLI Script (Sudah Dibuat)**
- File: `scripts/routeros-php/check_expired_vouchers.php`
- Jalankan via cron job setiap beberapa detik/menit
- Connect ke RouterOS dan execute script untuk check expired vouchers

### 2. **Cron Job Setup**
```bash
# Setiap 5 detik (mirip dengan scheduler 5s)
* * * * * php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 5; php /path/to/check_expired_vouchers.php host port user pass
* * * * * sleep 10; php /path/to/check_expired_vouchers.php host port user pass
# ... dst
```

### 3. **Atau Gunakan Script yang Sudah Ada**
- Script `check-expired-vouchers` sudah dibuat di RouterOS (via `install_scheduler.php`)
- Jalankan script tersebut via PHP CLI:
  ```php
  $API->comm('/system/script/run', ['.id' => $scriptId]);
  ```

## Kesimpulan

MIKHMON menggunakan **RouterOS Scheduler** yang dijalankan setiap 1 menit untuk check expired vouchers. Script dijalankan langsung di RouterOS, sehingga lebih efisien.

Karena device mode kita tidak mengizinkan scheduler, kita menggunakan **PHP CLI Script** yang dijalankan via cron job sebagai alternatif. Script ini connect ke RouterOS dan execute script yang sama untuk check expired vouchers.







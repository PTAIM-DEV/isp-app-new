# Fix: MikroTik Script Syntax Error

## Masalah

Error di MikroTik log:
```
script error: executing script check-expired-vouchers from scheduler (expired-voucher-checker) failed, please check it manually
debug: expected closing brace (line 1 column 20)
```

## Root Cause

1. **Script source terpotong** - Method `write()` di RouterOS API class split command berdasarkan `\n`, sehingga multiline script source terpotong saat dikirim ke MikroTik
2. **Format script tidak benar** - indentasi atau whitespace yang berlebihan
3. **Script source tidak di-normalize** sebelum dikirim ke RouterOS
4. **Multiline script** tidak di-format dengan benar untuk RouterOS API

## Solusi

### 1. Fix RouterOS API Class untuk Multiline String

**Masalah:** Method `write()` di `routeros_api.class.php` split command berdasarkan `\n`, sehingga multiline script source terpotong.

**Fix:** Modifikasi method `comm()` untuk mendeteksi parameter `source` yang mengandung newline, dan kirim langsung sebagai satu string utuh tanpa split:

```php
// Di method comm(), sebelum memanggil write()
if ($k === 'source' && strpos($v, "\n") !== false) {
    // Kirim sebagai satu string utuh dengan length encoding
    fwrite($this->socket, $this->encodeLength(strlen($el)) . $el);
    if ($last) {
        fwrite($this->socket, chr(0));
    }
} else {
    $this->write($el, $last);
}
```

Dengan fix ini, script source yang multiline akan dikirim lengkap ke MikroTik tanpa terpotong.

### 2. Normalize Script Source

Script source perlu di-normalize sebelum dikirim:
- Remove trailing whitespace
- Normalize line breaks (CRLF → LF)
- Remove extra spaces (tapi keep newlines)
- Ensure proper format

### 2. Format Script yang Benar

RouterOS script tidak memerlukan indentasi yang berlebihan. Format yang benar:

```routeros
:local dateint do={
:local montharray ("jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec");
:local days [:pick $d 4 6];
...
} do={
...
}
};
```

**Bukan:**
```routeros
:local dateint do={
  :local montharray ("jan","feb",...);  ← Indentasi bisa menyebabkan error
    :local days [:pick $d 4 6];
  ...
} do={
    ...
  }
};
```

### 3. Script Fix (Setelah Fix RouterOS API)

Gunakan `fix_script.php` untuk memperbaiki script yang sudah ada:

```bash
php scripts/routeros-php/fix_script.php <host> <port> <username> <password>
```

Script ini akan:
1. Delete script yang error
2. Create script baru dengan format yang benar
3. Verify script source
4. Return success jika berhasil

### 4. Re-install Scheduler

Setelah script diperbaiki, re-install scheduler:

```bash
php scripts/routeros-php/install_scheduler.php <host> <port> <username> <password>
```

Atau via UI:
- Buka halaman server detail
- Klik "Install Scheduler" lagi

## Verifikasi

### 1. Check Script di RouterOS

Via Winbox/WebFig:
- System → Scripts
- Cari script `check-expired-vouchers`
- Klik untuk melihat source
- Pastikan tidak ada syntax error

Via Terminal:
```bash
/system script print
/system script print where name="check-expired-vouchers"
```

### 2. Test Script

Via Terminal:
```bash
/system script run check-expired-vouchers
```

Jika ada error, akan muncul di log.

### 3. Check Scheduler

```bash
/system scheduler print where name="expired-voucher-checker"
```

Pastikan:
- `disabled=no`
- `on-event=check-expired-vouchers`
- `interval=5s`

## Troubleshooting

### Error: "expected closing brace" atau Script Terpotong

**Penyebab:**
- **Script source terpotong** - Method `write()` di RouterOS API class split command berdasarkan `\n` (sudah diperbaiki di `routeros_api.class.php`)
- Script source tidak di-format dengan benar
- Ada karakter khusus yang tidak di-handle
- Multiline script tidak di-escape dengan benar

**Solusi:**
1. **Pastikan fix RouterOS API sudah diterapkan** - Method `comm()` sudah dimodifikasi untuk menangani multiline string
2. Gunakan `fix_script.php` untuk memperbaiki script yang sudah error
3. Atau delete script manual dan re-install dengan `install_scheduler.php`

### Error: "script not found"

**Penyebab:**
- Script tidak dibuat dengan benar
- Script dihapus manual

**Solusi:**
1. Re-install scheduler via UI atau PHP script
2. Verify script ada di RouterOS

### Error: "scheduler failed"

**Penyebab:**
- Script syntax error
- Scheduler tidak bisa execute script

**Solusi:**
1. Fix script dulu dengan `fix_script.php`
2. Re-install scheduler

## Best Practices

1. **Always normalize script source** sebelum dikirim ke RouterOS
2. **Verify script** setelah dibuat/updated
3. **Test script** sebelum setup scheduler
4. **Monitor logs** untuk error
5. **Use fix script** jika ada error

## Script Format Guidelines

1. **No excessive indentation** - RouterOS tidak memerlukan indentasi
2. **Consistent line breaks** - Gunakan `\n` (LF) bukan `\r\n` (CRLF)
3. **No trailing spaces** - Trim setiap line
4. **Proper brace matching** - Pastikan semua brace match
5. **Test before deploy** - Test script di terminal dulu


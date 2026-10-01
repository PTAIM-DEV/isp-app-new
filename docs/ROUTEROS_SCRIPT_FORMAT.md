# RouterOS Script Format - Reference

## Script yang Benar

Script `check-expired-vouchers` yang benar:

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

## Format Requirements

1. **No excessive indentation** - RouterOS tidak memerlukan indentasi
2. **Proper line breaks** - Setiap statement di line baru
3. **Balanced braces** - Semua `{` harus ditutup dengan `}`
4. **No trailing spaces** - Trim setiap line
5. **Consistent format** - Format konsisten di seluruh script

## Cara Check Script di MikroTik

### Via Terminal:
```bash
/system script print detail where name="check-expired-vouchers"
```

### Via Winbox/WebFig:
1. System → Scripts
2. Cari script `check-expired-vouchers`
3. Double-click untuk melihat source

### Via PHP Script:
```bash
php scripts/routeros-php/check_script.php <host> <port> <username> <password>
```

## Common Errors

### Error: "expected closing brace (line 1 column 20)"
**Penyebab:**
- Format script tidak benar
- Ada karakter khusus yang tidak di-handle
- Indentasi berlebihan

**Solusi:**
- Gunakan `fix_script.php` untuk memperbaiki
- Atau re-install scheduler

### Error: "script not found"
**Penyebab:**
- Script tidak dibuat dengan benar
- Script dihapus manual

**Solusi:**
- Re-install scheduler

## Verification

Script yang benar harus:
1. ✅ Tidak ada error saat di-print
2. ✅ Source lengkap (tidak kosong)
3. ✅ Balanced braces (jumlah `{` = jumlah `}`)
4. ✅ Bisa di-run tanpa error
5. ✅ Format konsisten


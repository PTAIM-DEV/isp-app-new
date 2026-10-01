# Perhitungan Next Billing Date untuk REGULAR_MONTHLY

## 📋 Masalah

Sebelumnya, sistem menggunakan `setDate(date + 30)` untuk menghitung next billing date, yang menyebabkan masalah:
- Tidak semua bulan punya 30 hari (Feb, Apr, Jun, Sep, Nov)
- Seharusnya menggunakan bulan berikutnya dengan tanggal yang sama

### Contoh Masalah:
- Due date: 7 Des 2025 → Next: 7 Jan 2026 ✅ (benar)
- Due date: 31 Jan 2025 → Next: 3 Mar 2025 ❌ (salah, seharusnya 28 Feb 2025)
- Due date: 31 Mar 2025 → Next: 30 Apr 2025 ✅ (benar secara kebetulan)

## ✅ Solusi

Menggunakan utility function `addOneMonth()` yang handle edge cases dengan benar.

### Edge Cases yang Dihandle:

1. **Tanggal 31 di bulan yang tidak punya 31 hari:**
   - 31 Jan → 28 Feb (tahun biasa) atau 29 Feb (tahun kabisat)
   - 31 Mar → 30 Apr
   - 31 May → 30 Jun
   - 31 Aug → 30 Sep
   - 31 Oct → 30 Nov
   - 31 Dec → 31 Jan (tahun berikutnya) ✅

2. **Tanggal normal:**
   - 7 Des → 7 Jan ✅
   - 15 Feb → 15 Mar ✅
   - 30 Apr → 30 Mei ✅

### Implementasi:

```typescript
// File: src/lib/date-utils.ts
export function addOneMonth(date: Date): Date {
    const result = new Date(date);
    const originalDay = result.getDate();
    
    // Add one month
    result.setMonth(result.getMonth() + 1);
    
    // Check if the day overflowed (e.g., Jan 31 → Feb 31 becomes Mar 3)
    // If so, we need to adjust to the last day of the target month
    if (result.getDate() !== originalDay) {
        // Day overflowed, meaning the target month doesn't have enough days
        // Set to the last day of the target month
        result.setDate(0); // Go to last day of previous month (which is our target month)
    }
    
    return result;
}
```

### Cara Kerja:

1. Copy tanggal base
2. Tambah 1 bulan menggunakan `setMonth(month + 1)`
3. Cek apakah tanggal berubah (overflow):
   - Jika tanggal sama → OK, return
   - Jika tanggal berbeda → Artinya bulan target tidak punya cukup hari
     - Gunakan trik `setDate(0)` untuk mendapatkan hari terakhir bulan sebelumnya (yang adalah bulan target kita)

### Contoh Perhitungan:

```typescript
// Case 1: Normal date
addOneMonth(new Date('2025-12-07'))
// Step 1: 2025-12-07
// Step 2: setMonth(11 + 1) → 2026-01-07
// Step 3: getDate() = 7, originalDay = 7 → sama, return 2026-01-07 ✅

// Case 2: 31 Jan
addOneMonth(new Date('2025-01-31'))
// Step 1: 2025-01-31
// Step 2: setMonth(0 + 1) → 2025-02-31 → overflow menjadi 2025-03-03
// Step 3: getDate() = 3, originalDay = 31 → berbeda!
// Step 4: setDate(0) → 2025-02-28 (last day of Feb) ✅

// Case 3: 31 Mar
addOneMonth(new Date('2025-03-31'))
// Step 1: 2025-03-31
// Step 2: setMonth(2 + 1) → 2025-04-31 → overflow menjadi 2025-05-01
// Step 3: getDate() = 1, originalDay = 31 → berbeda!
// Step 4: setDate(0) → 2025-04-30 (last day of Apr) ✅
```

## 🔄 Tempat yang Diupdate

1. **Webhook Xendit** (`src/app/api/webhooks/xendit/route.ts`)
   - Update nextBillingDate saat invoice REGULAR_MONTHLY dibayar

2. **Mark Invoice As Paid** (`src/app/admin/leads/[id]/actions.ts`)
   - Update nextBillingDate saat invoice REGULAR_MONTHLY dibayar manual

3. **Match Payment With Invoice** (`src/app/admin/billing/unmatched-payments/actions.ts`)
   - Update nextBillingDate saat sync manual payment

## 📝 Logika Pembayaran

### Jika dibayar SEBELUM jatuh tempo:
- Base date = `dueDate`
- Next billing = `addOneMonth(dueDate)`
- Contoh: Due 7 Des, bayar 5 Des → Next: 7 Jan ✅

### Jika dibayar SETELAH jatuh tempo:
- Base date = `paidAt`
- Next billing = `addOneMonth(paidAt)`
- Contoh: Due 7 Des, bayar 10 Des → Next: 10 Jan ✅

## 🎯 Best Practice

### Mengapa menggunakan `setDate(0)`?

Ini adalah teknik standar dalam JavaScript untuk mendapatkan hari terakhir bulan sebelumnya:
- `new Date(2025, 3, 0)` → 31 Mar 2025 (last day of March)
- `new Date(2025, 2, 0)` → 28 Feb 2025 (last day of February)

### Alternatif yang Dipertimbangkan:

1. **Manual calculation dengan switch case:**
   ```typescript
   // ❌ Complex dan error-prone
   if (month === 0 && day === 31) { // Jan 31
       return new Date(year, 1, isLeapYear(year) ? 29 : 28);
   }
   // ... banyak case lainnya
   ```

2. **Library seperti date-fns atau moment:**
   ```typescript
   // ✅ Bagus tapi menambah dependency
   import { addMonths } from 'date-fns';
   ```

3. **Native JavaScript dengan setDate(0):**
   ```typescript
   // ✅ Simple, no dependency, standard practice
   result.setDate(0);
   ```

**Keputusan:** Menggunakan native JavaScript dengan `setDate(0)` karena:
- Tidak perlu dependency tambahan
- Standard practice yang banyak digunakan
- Simple dan mudah dipahami
- Handle semua edge cases dengan benar

## ✅ Testing

### Test Cases:

| Input Date | Expected Output | Status |
|------------|----------------|--------|
| 2025-12-07 | 2026-01-07 | ✅ |
| 2025-01-31 | 2025-02-28 | ✅ |
| 2024-01-31 | 2024-02-29 | ✅ (leap year) |
| 2025-03-31 | 2025-04-30 | ✅ |
| 2025-04-30 | 2025-05-30 | ✅ |
| 2025-05-31 | 2025-06-30 | ✅ |
| 2025-07-31 | 2025-08-31 | ✅ |
| 2025-08-31 | 2025-09-30 | ✅ |
| 2025-10-31 | 2025-11-30 | ✅ |
| 2025-12-31 | 2026-01-31 | ✅ |

## 🔍 Kompleksitas

**Kompleksitas:** O(1) - Constant time
**Dependency:** Tidak ada (native JavaScript)
**Maintainability:** Sangat mudah (single function, clear logic)

## 📚 Referensi

- [MDN: Date.prototype.setDate()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setDate)
- [MDN: Date.prototype.setMonth()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setMonth)
- [Stack Overflow: Adding months to a date in JavaScript](https://stackoverflow.com/questions/1643320/get-last-day-of-a-month)


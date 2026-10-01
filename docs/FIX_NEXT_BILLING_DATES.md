# Fix Next Billing Dates untuk Invoice yang Sudah Dibayar

## 📋 Overview

Script ini digunakan untuk memperbaiki `nextBillingDate` pada semua subscription yang sudah membayar invoice REGULAR_MONTHLY sebelum implementasi logika baru.

## 🎯 Tujuan

Setelah implementasi logika baru menggunakan `addOneMonth()` (bulan berikutnya dengan tanggal yang sama), perlu memperbaiki data yang sudah ada di database yang masih menggunakan logika lama (`setDate(date + 30)`).

## 📝 Logika Perbaikan

Untuk setiap invoice REGULAR_MONTHLY yang sudah PAID:

1. **Jika dibayar SEBELUM jatuh tempo** (`paidAt <= dueDate`):
   - Base date = `dueDate`
   - New nextBillingDate = `addOneMonth(dueDate)`
   - Contoh: Due 7 Des 2025, bayar 5 Des 2025 → Next: 7 Jan 2026 ✅

2. **Jika dibayar SETELAH jatuh tempo** (`paidAt > dueDate`):
   - Base date = `paidAt`
   - New nextBillingDate = `addOneMonth(paidAt)`
   - Contoh: Due 7 Des 2025, bayar 10 Des 2025 → Next: 10 Jan 2026 ✅

## 🚀 Cara Menggunakan

### Endpoint

```
GET /api/admin/fix-next-billing-dates
```

### Request

Tidak ada parameter yang diperlukan. Endpoint ini akan:
1. Mencari semua invoice REGULAR_MONTHLY dengan status PAID
2. Memperbaiki nextBillingDate untuk setiap subscription terkait
3. Mengembalikan report lengkap

### Response

```json
{
  "success": true,
  "message": "Fixed nextBillingDate for X subscriptions",
  "results": {
    "total": 100,
    "updated": 95,
    "skipped": 3,
    "errors": [
      {
        "invoiceId": "xxx",
        "error": "Error message"
      }
    ],
    "details": [
      {
        "invoiceId": "xxx",
        "invoiceNumber": "INV-2025-12-001",
        "userId": "yyy",
        "userName": "John Doe",
        "dueDate": "2025-12-07T00:00:00.000Z",
        "paidAt": "2025-12-05T10:30:00.000Z",
        "oldNextBillingDate": "2026-01-04T00:00:00.000Z",
        "newNextBillingDate": "2026-01-07T00:00:00.000Z",
        "baseDateUsed": "2025-12-07T00:00:00.000Z"
      }
    ]
  }
}
```

### Contoh Penggunaan

#### Menggunakan curl:

```bash
curl -X GET http://localhost:3000/api/admin/fix-next-billing-dates
```

#### Menggunakan browser:

Buka URL: `http://localhost:3000/api/admin/fix-next-billing-dates`

#### Menggunakan Postman/Insomnia:

1. Method: GET
2. URL: `http://localhost:3000/api/admin/fix-next-billing-dates`
3. Send request

## ⚠️ Catatan Penting

1. **Idempotent**: Script ini aman untuk dijalankan berulang kali. Jika nextBillingDate sudah benar, tidak akan diubah lagi.

2. **Skip Conditions**: Script akan skip invoice jika:
   - User tidak punya subscription
   - Invoice tidak punya `paidAt` date

3. **Error Handling**: Jika ada error pada satu invoice, script akan continue ke invoice berikutnya dan mencatat error di response.

4. **Logging**: Semua proses akan di-log ke console untuk monitoring.

## 📊 Monitoring

Setelah menjalankan script, check:
1. Response JSON untuk melihat berapa banyak yang di-update
2. Console logs untuk detail setiap update
3. Database untuk memverifikasi nextBillingDate sudah benar

## 🔍 Verifikasi

Setelah menjalankan script, verifikasi dengan query:

```sql
-- Check beberapa subscription yang sudah di-update
SELECT 
    u.name,
    i.invoice_number,
    i.due_date,
    i.paid_at,
    s.next_billing_date,
    DATE_ADD(
        CASE 
            WHEN i.paid_at <= i.due_date THEN i.due_date
            ELSE i.paid_at
        END,
        INTERVAL 1 MONTH
    ) as expected_next_billing_date
FROM invoices i
JOIN users u ON i.user_id = u.id
JOIN subscriptions s ON s.user_id = u.id
WHERE i.category = 'REGULAR_MONTHLY'
  AND i.status = 'PAID'
  AND i.deleted_at IS NULL
ORDER BY i.paid_at DESC
LIMIT 10;
```

## 🛡️ Safety

- Script hanya membaca dan update data, tidak menghapus
- Setiap update di-log dengan detail lengkap
- Error pada satu invoice tidak menghentikan proses keseluruhan
- Response mencakup detail lengkap untuk audit

## 📅 Kapan Harus Dijalankan

1. **Setelah implementasi logika baru** - Untuk memperbaiki data lama
2. **Setelah migration** - Jika ada perubahan struktur data
3. **Periodic check** - Jika perlu memastikan konsistensi data

## 🔄 Re-run

Script ini aman untuk dijalankan berulang kali. Jika nextBillingDate sudah benar (sesuai dengan logika baru), tidak akan diubah.


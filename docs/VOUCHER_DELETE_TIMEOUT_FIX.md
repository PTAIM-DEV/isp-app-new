# Analisis & Fix: Error 504 Gateway Timeout saat Delete Voucher

## Masalah

Error 504 Gateway Timeout terjadi saat menghapus voucher dengan pesan:
```
Gagal menghapus voucher: Server mengembalikan halaman HTML (Status: 504). 
Kemungkinan ada masalah dengan autentikasi atau server error.
```

## Root Cause Analysis

### Penyebab Utama:
1. **Timeout ke MikroTik Server**
   - Ketika check/remove user di MikroTik, koneksi timeout
   - Server MikroTik tidak merespons atau terlalu lambat
   - Network issue atau server offline

2. **Next.js API Route Timeout**
   - Default timeout untuk API routes (biasanya 10-30 detik)
   - Jika operasi MikroTik lebih lama dari timeout, Next.js mengembalikan 504

3. **Tidak Ada Timeout Handling**
   - Check MikroTik tidak punya timeout wrapper
   - Request hang sampai Next.js timeout

## Solusi yang Diimplementasikan

### 1. Timeout Wrapper untuk MikroTik Check
```typescript
// Add timeout wrapper untuk prevent 504
const timeoutMs = (server.timeout || 5000) + 2000; // Add 2s buffer

const checkPromise = routerosService.getHotspotUser(serverId, username);
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('MikroTik check timeout')), timeoutMs)
);

const userExists = await Promise.race([checkPromise, timeoutPromise]);
```

### 2. Detailed Logging
Menambahkan logging detail untuk debugging:
- Start time tracking
- Server status check
- Timeout duration
- Error details dengan stack trace
- Elapsed time untuk setiap operasi

### 3. Frontend Timeout
Menambahkan AbortController di frontend:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

const response = await fetch(url, {
  method: 'DELETE',
  signal: controller.signal
});
```

### 4. Better Error Messages
- Pesan error yang lebih jelas untuk user
- Differentiate antara timeout, server error, dan network error
- Suggestion untuk user (refresh page, check server status)

### 5. Graceful Degradation
- Jika server offline → skip check, langsung hapus dari DB
- Jika timeout → log warning, tetap hapus dari DB
- Tidak fail delete jika MikroTik check gagal

## Log Format

Semua log menggunakan format:
```
[DELETE VOUCHER] <action> <details>
```

Contoh:
```
[DELETE VOUCHER] Starting MikroTik check for voucher abc123, username: user1
[DELETE VOUCHER] Server status: CONNECTED, name: Server A
[DELETE VOUCHER] Checking user existence with timeout: 7000ms
[DELETE VOUCHER] User check completed in 1234ms, exists: true
[DELETE VOUCHER] User exists, removing from MikroTik...
[DELETE VOUCHER] User removed from MikroTik in 2345ms
```

## Error Handling Flow

```
1. Check server status
   ├─ CONNECTED → Continue to check MikroTik
   ├─ DISCONNECTED → Skip check, delete from DB only
   └─ ERROR → Skip check, delete from DB only

2. Check user in MikroTik (if CONNECTED)
   ├─ Success → Remove from MikroTik → Delete from DB
   ├─ Timeout → Log warning → Delete from DB
   └─ Error → Log error → Delete from DB

3. Delete from Database
   └─ Always execute (even if MikroTik operations fail)
```

## Testing Scenarios

### Scenario 1: Server Online, User Exists
- ✅ Check user → Found
- ✅ Remove from MikroTik → Success
- ✅ Delete from DB → Success

### Scenario 2: Server Online, User Not Found
- ✅ Check user → Not found
- ⏭️ Skip remove
- ✅ Delete from DB → Success

### Scenario 3: Server Offline
- ⏭️ Skip check (server status = DISCONNECTED)
- ✅ Delete from DB → Success
- ⚠️ Log warning

### Scenario 4: Server Timeout
- ⏱️ Check user → Timeout after 7s
- ⚠️ Log timeout error
- ✅ Delete from DB → Success

### Scenario 5: Network Error
- ❌ Check user → Network error
- ⚠️ Log error
- ✅ Delete from DB → Success

## Monitoring & Debugging

### Check Logs
```bash
# Cari log delete voucher
grep "DELETE VOUCHER" logs/app.log

# Cari timeout errors
grep "timeout" logs/app.log | grep "DELETE VOUCHER"

# Cari errors
grep "Error checking/removing" logs/app.log
```

### Metrics to Monitor
- Average delete time
- Timeout rate
- Server offline rate
- Error rate by server

## Best Practices

1. **Always check server status first** - Skip MikroTik check if offline
2. **Use timeout wrapper** - Prevent hanging requests
3. **Log everything** - Easy debugging
4. **Graceful degradation** - Don't fail delete if MikroTik check fails
5. **User-friendly errors** - Clear messages with suggestions

## Future Improvements

1. **Async Queue** - Queue MikroTik operations untuk retry later
2. **Health Check** - Periodic check server health
3. **Cache Server Status** - Reduce DB queries
4. **Retry Logic** - Retry failed operations with exponential backoff
5. **Metrics Dashboard** - Monitor delete operations


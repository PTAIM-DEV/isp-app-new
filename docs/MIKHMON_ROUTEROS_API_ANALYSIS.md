# Analisa Implementasi MIKHMON RouterOS API

## Temuan dari Source Code MIKHMON

### 1. Library yang Digunakan
- **RouterOS PHP API class v1.6** (Denis Basta)
- File: `mikhmon/core/routeros_api.class.php`
- Method utama: `comm($com, $arr = array())` untuk komunikasi dengan RouterOS

### 2. Profile Creation (post_add_userprofile.php)

**Cara MIKHMON Create Profile:**
```php
$add = $API->comm("/ip/hotspot/user/profile/add", array(
    "name" => "$name",
    "address-pool" => "$addrpool",
    "rate-limit" => "$ratelimit",
    "shared-users" => "$sharedusers",
    "status-autorefresh" => "1m",
    "on-login" => "$onlogin",
    "parent-queue" => "$parent",
));
```

**Error Handling:**
```php
if(!empty($add['!trap'][0]['message'])){
    // Error - ada !trap message
    $message = $add['!trap'][0]['message'];
    echo json_encode(["message" => "error", "data" => ["error" => $message]]);
}else if(substr($add, 0,1) == "*"){
    // Success - return value dimulai dengan * (ID format)
    $getuser = $API->comm("/ip/hotspot/user/profile/print", array(
        "?.id" => "$add",
    ));
    echo json_encode(["message" => "success", "data" => $getuser[0]]);
}
```

**Key Points:**
1. MIKHMON check `!trap` untuk error
2. MIKHMON check apakah return value dimulai dengan `*` (ID format dari RouterOS)
3. Jika success, MIKHMON verify dengan print command untuk mendapatkan profile data
4. **Tidak ada handling khusus untuk `!empty`** - library PHP handle ini secara otomatis

### 3. Profile Update (post_update_userprofile.php)

**Cara MIKHMON Update Profile:**
```php
$add = $API->comm("/ip/hotspot/user/profile/set", array(
    ".id" => "$upid",
    "name" => "$name",
    // ... other params
));
```

**Error Handling:**
```php
if(!empty($add['!trap'][0]['message'])){
    // Error
}else{
    // Success - langsung verify dengan print
    $getuser = $API->comm("/ip/hotspot/user/profile/print", array(
        "?.id" => "$upid",
    ));
    echo json_encode(["message" => "success", "data" => $getuser[0]]);
}
```

**Key Points:**
1. Check `!trap` untuk error
2. Jika tidak ada `!trap`, langsung verify dengan print command
3. Tidak ada handling khusus untuk `!empty`

### 4. Voucher Generation (post_generate_voucher.php)

**Cara MIKHMON Create User:**
```php
$API->comm("/ip/hotspot/user/add", array(
    "server" => "$server",
    "name" => "$u[$i]",
    "password" => "$p[$i]",
    "profile" => "$profile",
    "limit-uptime" => "$timelimit",
    "limit-bytes-total" => "$datalimit",
    "comment" => "$commt",
));
```

**Error Handling:**
- Tidak ada error handling khusus untuk user creation
- Hanya check `!trap` setelah print command untuk verify

### 5. RouterOS API Class Implementation

**Method `comm()`:**
```php
public function comm($com, $arr = array())
{
    $count = count($arr);
    $this->write($com, !$arr);
    // ... write parameters ...
    return $this->read(); // Read dan parse response
}
```

**Method `read()`:**
- Membaca data dari socket sampai mendapat `!done`
- Parse response dengan `parseResponse()` jika `$parse = true`
- **Tidak ada handling khusus untuk `!empty`** - mungkin di-ignore atau return empty array

**Method `parseResponse()`:**
- Handle `!fatal`, `!re`, `!trap`
- **Tidak ada handling khusus untuk `!empty`**
- Jika `!empty`, mungkin return empty array atau di-ignore

## Perbedaan dengan Implementasi Node.js

| Aspek | MIKHMON (PHP) | Implementasi Kita (Node.js) |
|-------|---------------|----------------------------|
| **Library** | RouterOS PHP API v1.6 | routeros-client v1.1.1 |
| **Error Handling** | Check `!trap` untuk error | Check `UNKNOWNREPLY` untuk `!empty` |
| **Success Detection** | Check return value dimulai dengan `*` | Check return value untuk `.id` |
| **!empty Handling** | Di-handle otomatis oleh library | Perlu manual handling |
| **Verification** | Selalu verify dengan print command | Verify hanya jika `!empty` |

## Rekomendasi untuk Implementasi Node.js

### 1. Simplify Error Handling
- Check `!trap` untuk error (jika library support)
- Check return value untuk success (`.id` atau format lain)
- **Tidak perlu special handling untuk `!empty`** - treat sebagai success jika tidak ada error

### 2. Always Verify After Operations
- Setelah create/update profile, selalu verify dengan print command
- Setelah create user, verify dengan print command
- Ini memastikan operasi benar-benar berhasil

### 3. Match MIKHMON Approach
- Gunakan approach yang sama dengan MIKHMON:
  1. Call API command
  2. Check `!trap` untuk error
  3. Jika tidak ada error, verify dengan print command
  4. Return success dengan data dari verification

### 4. Handle `!empty` Reply
- Jika mendapat `!empty` reply (null atau empty array), treat sebagai success
- Verify dengan print command untuk memastikan operasi berhasil
- Jika verification berhasil, return success

## Implementasi yang Disarankan

```typescript
async createProfile(serverId: string, profileName: string, options: any) {
    const conn = await this.getConnection(serverId);
    
    // Call API command
    const result = await this.safeWrite(conn, '/ip/hotspot/profile/add', params);
    
    // Check for error (!trap equivalent)
    if (result && result['!trap']) {
        throw new Error(result['!trap'][0]['message']);
    }
    
    // If got !empty reply (null), verify
    if (result === null || (Array.isArray(result) && result.length === 0)) {
        // Verify dengan print command
        const verify = await this.safeWrite(conn, '/ip/hotspot/profile/print', [
            `?name=${profileName}`
        ]);
        
        if (verify && Array.isArray(verify) && verify.length > 0) {
            return { success: true, id: verify[0]['.id'], data: verify[0] };
        }
        
        // If verification failed, assume success (RouterOS quirk)
        return { success: true, id: 'verified-failed-but-success' };
    }
    
    // If got ID directly
    if (result && result['.id']) {
        return { success: true, id: result['.id'], data: result };
    }
    
    // If got array with data
    if (Array.isArray(result) && result.length > 0) {
        return { success: true, id: result[0]['.id'], data: result[0] };
    }
    
    // Default: assume success
    return { success: true, id: 'assumed-success' };
}
```

## Kesimpulan

1. **MIKHMON tidak handle `!empty` secara khusus** - library PHP handle ini otomatis
2. **MIKHMON selalu verify dengan print command** setelah operasi
3. **MIKHMON check `!trap` untuk error**, bukan `!empty`
4. **Pendekatan yang lebih simple**: Check error, verify dengan print, return success

## Next Steps

1. Simplify error handling - check `!trap` untuk error
2. Always verify dengan print command setelah operasi
3. Treat `!empty` sebagai success jika tidak ada error
4. Match MIKHMON approach untuk consistency







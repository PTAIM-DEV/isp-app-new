# Analisa Alternatif Library RouterOS

## Masalah Saat Ini

1. **Library `routeros-client` v1.1.1** tidak fully compatible dengan RouterOS 7.x
2. Error `!empty` reply tidak di-handle dengan baik
3. Profile creation dan scheduler installation sering timeout atau gagal
4. Voucher bisa dibuat tapi profile dan scheduler tidak terinstall

## Pendekatan Alternatif

### 1. Fix Library Node.js RouterOS

#### Opsi A: Fork & Patch `routeros-client`
**Pros:**
- Tetap dalam ekosistem Node.js
- Tidak perlu dependency tambahan
- Kontrol penuh atas library

**Cons:**
- Library sudah tidak aktif dikembangkan (discontinued Maret 2024)
- Perlu maintenance sendiri
- Time-consuming untuk patch semua edge cases

#### Opsi B: Gunakan Library Alternatif Node.js

**`routeros-node`** (https://github.com/renomureza/routeros-node)
- ✅ Masih aktif dikembangkan
- ✅ Support RouterOS 6.43+
- ✅ Promise-based API
- ⚠️ Perlu test compatibility dengan RouterOS 7.x

**`ros-rest`** (https://github.com/renomureza/ros-rest)
- ✅ REST API (RouterOS v7.1beta4+)
- ✅ Lebih modern dan simple
- ⚠️ Hanya support RouterOS 7.1beta4+
- ⚠️ Perlu RouterOS dengan REST API enabled

**`node-routeros`** (https://github.com/aluisiora/node-routeros)
- ✅ Alternative library
- ⚠️ Perlu test compatibility

#### Rekomendasi untuk Opsi B:
Coba `routeros-node` dulu karena:
- Masih aktif dikembangkan
- Support RouterOS 6.43+ (kemungkinan support 7.x)
- Promise-based (lebih mudah digunakan)
- Tidak perlu REST API (masih pakai API tradisional)

### 2. Gunakan PHP Script via Command Line

#### Setup:
1. Install PHP CLI: `sudo apt install php8.3-cli`
2. Install PHP RouterOS API library:
   - `librouteros` (https://github.com/dapphp/librouteros)
   - Atau `routeros-api` (https://github.com/BenMenking/routeros-api)

#### Implementasi:
1. Buat PHP script untuk:
   - Create/update profile
   - Install scheduler
   - Create user
   - Verify operations

2. Panggil dari Node.js menggunakan `child_process.exec` atau `child_process.spawn`

**Pros:**
- ✅ PHP RouterOS API library lebih mature dan proven (MIKHMON pakai ini)
- ✅ Handle `!empty` reply dengan baik
- ✅ Tidak perlu fix library Node.js
- ✅ Bisa reuse logic dari MIKHMON

**Cons:**
- ⚠️ Perlu install PHP CLI
- ⚠️ Perlu manage PHP dependencies (Composer)
- ⚠️ Perlu handle error dari PHP script
- ⚠️ Perlu parse output dari PHP script
- ⚠️ Slightly more complex (2 languages)

#### Contoh Implementasi:

**PHP Script** (`scripts/routeros-profile.php`):
```php
<?php
require_once 'vendor/autoload.php';
use PEAR2\Net\RouterOS;

$host = $argv[1];
$port = $argv[2];
$username = $argv[3];
$password = $argv[4];
$action = $argv[5]; // 'create-profile', 'install-scheduler', etc.
$params = json_decode($argv[6], true);

try {
    $client = new RouterOS\Client($host, $username, $password, $port);
    
    switch ($action) {
        case 'create-profile':
            // Create profile logic
            $response = $client->sendSync(new RouterOS\Request('/ip/hotspot/profile/add', ...));
            echo json_encode(['success' => true, 'id' => $response->getProperty('.id')]);
            break;
        // ... other actions
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit(1);
}
```

**Node.js Wrapper**:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function createProfileViaPHP(config: MikrotikConnectionConfig, profileName: string, options: any) {
    const scriptPath = path.join(process.cwd(), 'scripts', 'routeros-profile.php');
    const params = JSON.stringify({ profileName, ...options });
    
    const { stdout, stderr } = await execAsync(
        `php ${scriptPath} ${config.host} ${config.port} ${config.username} ${config.password} create-profile '${params}'`
    );
    
    const result = JSON.parse(stdout);
    if (!result.success) {
        throw new Error(result.error);
    }
    
    return result;
}
```

## Perbandingan Pendekatan

| Aspek | Fix Node.js Library | PHP Script via CLI |
|-------|---------------------|-------------------|
| **Kompleksitas** | Medium | Medium-High |
| **Dependency** | Node.js only | Node.js + PHP |
| **Maintenance** | Perlu maintain fork | PHP script lebih simple |
| **Proven** | Belum tested | MIKHMON proven |
| **Performance** | Direct API call | Process spawn overhead |
| **Error Handling** | Dalam Node.js | Perlu parse dari PHP |
| **Time to Implement** | 2-3 hari | 1-2 hari |

## Rekomendasi

### Pendekatan Hybrid (Recommended)

1. **Primary**: Gunakan PHP script untuk operasi yang bermasalah:
   - Profile creation
   - Scheduler installation
   - Operations yang sering timeout

2. **Fallback**: Tetap gunakan Node.js library untuk:
   - Simple operations (get users, list sessions)
   - Operations yang tidak bermasalah

3. **Future**: Migrate ke `routeros-node` jika compatible dengan RouterOS 7.x

### Implementasi Hybrid:

```typescript
class RouterOSService {
    async createProfile(serverId: string, profileName: string, options: any) {
        // Try PHP script first (more reliable)
        try {
            return await this.createProfileViaPHP(serverId, profileName, options);
        } catch (phpError) {
            console.warn('PHP script failed, trying Node.js library...');
            // Fallback to Node.js library
            return await this.createProfileViaNodeJS(serverId, profileName, options);
        }
    }
}
```

## Langkah Implementasi

### Opsi 1: PHP Script (Recommended untuk Quick Fix)

1. Install PHP CLI: `sudo apt install php8.3-cli php8.3-curl`
2. Install Composer: `curl -sS https://getcomposer.org/installer | php`
3. Install PHP RouterOS library: `composer require dapphp/librouteros`
4. Buat PHP scripts untuk:
   - `create-profile.php`
   - `install-scheduler.php`
   - `verify-profile.php`
5. Buat Node.js wrapper untuk call PHP scripts
6. Update `routeros-profile-service.ts` untuk gunakan PHP script

### Opsi 2: Migrate ke `routeros-node`

1. Install `routeros-node`: `npm install routeros-node`
2. Test compatibility dengan RouterOS 7.x
3. Update `routeros-service.ts` untuk gunakan `routeros-node`
4. Remove `routeros-client` dependency

## Keputusan

**Untuk sistem yang harus fully automatic dan proven:**
- ✅ **Gunakan PHP Script** (karena MIKHMON proven dengan approach ini)

**Untuk sistem yang ingin tetap dalam Node.js ecosystem:**
- ✅ **Coba `routeros-node`** dulu, jika tidak compatible baru gunakan PHP script

**Untuk quick fix:**
- ✅ **Hybrid approach**: PHP untuk operations bermasalah, Node.js untuk yang simple







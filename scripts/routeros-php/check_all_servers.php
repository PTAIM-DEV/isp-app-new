#!/usr/bin/env php
<?php
/**
 * Check expired vouchers untuk semua server dari database
 * Dijalankan via cron job setiap beberapa detik/menit
 * Usage: php check_all_servers.php
 */

require_once __DIR__ . '/check_expired_vouchers.php';
require_once __DIR__ . '/../../vendor/autoload.php';

// Load Prisma client (atau gunakan database connection langsung)
// Untuk sekarang, kita akan read dari .env dan connect ke database

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/../..');
$dotenv->load();

/**
 * Decrypt password dari database
 * Menggunakan AES-256-CBC dengan scrypt key derivation (sama dengan TypeScript)
 * 
 * Node.js menggunakan: crypto.scryptSync(key, 'salt', 32)
 * Untuk kompatibilitas, kita perlu menggunakan scrypt dengan parameter yang sama
 */
function decryptPassword($encryptedPassword) {
    $encryptionKey = $_ENV['ENCRYPTION_KEY'] ?? 'default-key-change-in-production';
    $algorithm = 'aes-256-cbc';
    
    // Split iv dan encrypted data (format: iv:encrypted)
    $parts = explode(':', $encryptedPassword);
    if (count($parts) !== 2) {
        throw new Exception('Invalid encrypted password format');
    }
    
    $ivHex = $parts[0];
    $encryptedHex = $parts[1];
    
    // Convert hex to binary
    $iv = hex2bin($ivHex);
    if ($iv === false) {
        throw new Exception('Invalid IV format');
    }
    
    $encrypted = hex2bin($encryptedHex);
    if ($encrypted === false) {
        throw new Exception('Invalid encrypted data format');
    }
    
    // Derive key menggunakan scrypt
    // Node.js crypto.scryptSync menggunakan default: N=16384, r=8, p=1
    // Kita akan menggunakan implementasi yang kompatibel
    $salt = 'salt'; // Sama dengan TypeScript
    
    // Coba menggunakan sodium scrypt jika tersedia (lebih akurat)
    if (extension_loaded('sodium') && function_exists('sodium_crypto_pwhash_scryptsalsa208sha256')) {
        // Sodium scrypt dengan parameter yang mendekati Node.js default
        // Node.js default: N=16384, r=8, p=1
        // Sodium interactive: opslimit=524288, memlimit=16777216 (N=16384, r=8, p=1)
        $key = sodium_crypto_pwhash_scryptsalsa208sha256(
            32, // key length
            $encryptionKey,
            $salt,
            SODIUM_CRYPTO_PWHASH_SCRYPTSALSA208SHA256_OPSLIMIT_INTERACTIVE,
            SODIUM_CRYPTO_PWHASH_SCRYPTSALSA208SHA256_MEMLIMIT_INTERACTIVE
        );
    } else {
        // Fallback: gunakan hash_pbkdf2 dengan SHA256
        // Ini tidak 100% kompatibel dengan scrypt, tapi akan bekerja untuk sebagian besar kasus
        // Jika tidak bekerja, perlu install extension sodium atau gunakan library scrypt
        $key = hash_pbkdf2('sha256', $encryptionKey, $salt, 16384, 32, true);
    }
    
    // Decrypt menggunakan openssl
    $decrypted = openssl_decrypt($encrypted, $algorithm, $key, OPENSSL_RAW_DATA, $iv);
    
    if ($decrypted === false) {
        $error = openssl_error_string();
        throw new Exception('Failed to decrypt password' . ($error ? ': ' . $error : ''));
    }
    
    return $decrypted;
}

$databaseUrl = $_ENV['DATABASE_URL'] ?? null;

if (!$databaseUrl) {
    echo json_encode([
        'success' => false,
        'error' => 'DATABASE_URL not found in .env'
    ]);
    exit(1);
}

// Parse database URL dan connect
// Format: postgresql://user:password@host:port/database
preg_match('/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/', $databaseUrl, $matches);

if (count($matches) < 6) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid DATABASE_URL format'
    ]);
    exit(1);
}

$dbUser = $matches[1];
$dbPass = $matches[2];
$dbHost = $matches[3];
$dbPort = $matches[4];
$dbName = $matches[5];

try {
    $pdo = new PDO(
        "pgsql:host=$dbHost;port=$dbPort;dbname=$dbName",
        $dbUser,
        $dbPass
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get all active servers
    $stmt = $pdo->query("SELECT id, host, port, username, password FROM \"MikrotikServer\" WHERE \"isActive\" = true");
    $servers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $results = [];
    $totalExpired = 0;

    foreach ($servers as $server) {
        try {
            // Decrypt password dari database
            $password = decryptPassword($server['password']);
            
            // Call check_expired_vouchers.php untuk server ini
            $output = shell_exec(
                sprintf(
                    'php %s "%s" "%s" "%s" "%s" 2>&1',
                    __DIR__ . '/check_expired_vouchers.php',
                    escapeshellarg($server['host']),
                    escapeshellarg($server['port']),
                    escapeshellarg($server['username']),
                    escapeshellarg($password)
                )
            );

            $result = json_decode($output, true);
            
            if ($result && $result['success']) {
                $totalExpired += $result['expired_count'] ?? 0;
                $results[] = [
                    'server_id' => $server['id'],
                    'host' => $server['host'],
                    'success' => true,
                    'expired_count' => $result['expired_count'] ?? 0
                ];
            } else {
                $results[] = [
                    'server_id' => $server['id'],
                    'host' => $server['host'],
                    'success' => false,
                    'error' => $result['error'] ?? 'Unknown error'
                ];
            }
        } catch (Exception $e) {
            $results[] = [
                'server_id' => $server['id'],
                'host' => $server['host'],
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'servers_processed' => count($servers),
        'total_expired' => $totalExpired,
        'results' => $results,
        'executed_at' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit(1);
}



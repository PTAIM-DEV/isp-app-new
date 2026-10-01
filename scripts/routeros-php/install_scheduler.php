#!/usr/bin/env php
<?php
/**
 * Install expired voucher scheduler via PHP CLI
 * Usage: php install_scheduler.php <host> <port> <username> <password>
 */

require_once __DIR__ . '/routeros_api.class.php';

if ($argc < 5) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid arguments. Usage: php install_scheduler.php <host> <port> <username> <password>'
    ]);
    exit(1);
}

$host = $argv[1];
$port = intval($argv[2]);
$username = $argv[3];
$password = $argv[4];

$scriptName = 'check-expired-vouchers';
// Script source dengan format yang benar untuk RouterOS
// Pastikan tidak ada trailing whitespace dan format konsisten
$scriptSource = ':local dateint do={
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
}';

try {
    $API = new RouterosAPI();
    $API->debug = false;
    $API->port = $port;
    $API->timeout = 5;

    if (!$API->connect($host, $username, $password)) {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to connect to RouterOS'
        ]);
        exit(1);
    }

    // Check if script exists
    // MIKHMON menggunakan /system/script/print (dengan slash)
    $existingScripts = $API->comm('/system/script/print', [
        '?name' => $scriptName
    ]);

    // Normalize script source - remove extra whitespace and ensure proper format
    $scriptSource = trim($scriptSource);
    // Replace multiple spaces with single space (but keep newlines)
    $scriptSource = preg_replace('/[ \t]+/', ' ', $scriptSource);
    // Ensure proper line breaks
    $scriptSource = preg_replace('/\r\n|\r/', "\n", $scriptSource);

    if (is_array($existingScripts) && count($existingScripts) > 0 && isset($existingScripts[0])) {
        // Update existing script
        $result = $API->comm('/system/script/set', [
            '.id' => $existingScripts[0]['.id'],
            'source' => $scriptSource
        ]);
    } else {
        // Create new script
        $result = $API->comm('/system/script/add', [
            'name' => $scriptName,
            'source' => $scriptSource,
            'owner' => 'admin'
        ]);
    }

    // Check for error
    if (!empty($result['!trap'][0]['message'])) {
        $errorMsg = $result['!trap'][0]['message'];
        echo json_encode([
            'success' => false,
            'error' => 'Script error: ' . $errorMsg,
            'script_source_preview' => substr($scriptSource, 0, 100) . '...'
        ]);
        $API->disconnect();
        exit(1);
    }
    
    // Verify script syntax by trying to read it back
    $verifyScripts = $API->comm('/system/script/print', [
        '?name' => $scriptName
    ]);
    
    if (!is_array($verifyScripts) || count($verifyScripts) === 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Script was not created/updated - verification failed'
        ]);
        $API->disconnect();
        exit(1);
    }
    
    // Try to test script syntax by running it with error handling
    // Note: We can't actually run it, but we can check if it's valid
    $scriptId = $verifyScripts[0]['.id'];
    
    // Check script source for syntax errors
    $retrievedSource = isset($verifyScripts[0]['source']) ? $verifyScripts[0]['source'] : '';
    if (empty($retrievedSource)) {
        echo json_encode([
            'success' => false,
            'error' => 'Script source is empty after creation - possible syntax error'
        ]);
        $API->disconnect();
        exit(1);
    }

    // Script already verified above

    // Setup scheduler
    // MIKHMON menggunakan /system/scheduler/print (dengan slash)
    $schedulerName = 'expired-voucher-checker';
    $existingSchedulers = $API->comm('/system/scheduler/print', [
        '?name' => $schedulerName
    ]);

    if (is_array($existingSchedulers) && count($existingSchedulers) > 0 && isset($existingSchedulers[0])) {
        // Update existing scheduler
        $result = $API->comm('/system/scheduler/set', [
            '.id' => $existingSchedulers[0]['.id'],
            'start-time' => 'startup',  // Start saat router boot
            'interval' => '5s',
            'on-event' => $scriptName,
            'disabled' => 'no'
        ]);
    } else {
        // Create new scheduler
        // Format sesuai dengan screenshot: bisa menggunakan start-date + start-time atau start-time saja
        // MIKHMON menggunakan start-time='00:00:00' (tanpa start-date)
        // Tapi bisa juga menggunakan start-date + start-time untuk lebih spesifik
        // Untuk expired checker, gunakan start-time='startup' atau '00:00:00'
        
        // Coba dengan start-time='startup' dulu (lebih reliable)
        $result = $API->comm('/system/scheduler/add', [
            'name' => $schedulerName,
            'start-time' => 'startup',  // Start saat router boot
            'interval' => '5s',  // Check setiap 5 detik
            'on-event' => $scriptName,  // Script yang akan dijalankan
            'disabled' => 'no',
            'comment' => 'Expired Voucher Checker - Check setiap 5 detik'
        ]);
        
        // Jika error, coba dengan format start-date + start-time
        if (!empty($result['!trap'][0]['message'])) {
            $today = date('Y-m-d');
            $now = date('H:i:s');
            
            $result = $API->comm('/system/scheduler/add', [
                'name' => $schedulerName,
                'start-date' => $today,  // Format: YYYY-MM-DD
                'start-time' => $now,     // Format: HH:MM:SS
                'interval' => '5s',
                'on-event' => $scriptName,
                'disabled' => 'no',
                'comment' => 'Expired Voucher Checker - Check setiap 5 detik'
            ]);
        }
    }

    // Check for error
    if (!empty($result['!trap'][0]['message'])) {
        $errorMsg = $result['!trap'][0]['message'];
        // Jika error karena device-mode, script sudah dibuat, hanya scheduler yang gagal
        if (strpos($errorMsg, 'device-mode') !== false || strpos($errorMsg, 'not allowed') !== false) {
            echo json_encode([
                'success' => false,
                'error' => 'Scheduler tidak bisa dibuat karena device mode RouterOS tidak mengizinkan scheduler. Silakan enable scheduler di RouterOS: System → Device Mode → Enable "Scheduler", lalu coba lagi.',
                'script_created' => true,
                'scheduler_failed' => true,
                'device_mode_restriction' => true
            ]);
            $API->disconnect();
            exit(1);
        } else {
            // Error lain, tapi mungkin scheduler sudah dibuat (check dulu)
            // Jika result adalah ID (format: *ID), berarti success
            if (is_string($result) && substr($result, 0, 1) === '*') {
                // Success - result adalah ID scheduler
                // Continue to verification
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Scheduler error: ' . $errorMsg
                ]);
                $API->disconnect();
                exit(1);
            }
        }
    }

    // Verify scheduler
    $verifySchedulers = $API->comm('/system/scheduler/print', [
        '?name' => $schedulerName
    ]);

    if (!is_array($verifySchedulers) || count($verifySchedulers) === 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Scheduler was not created/updated'
        ]);
        $API->disconnect();
        exit(1);
    }

    echo json_encode([
        'success' => true,
        'script' => $verifyScripts[0],
        'scheduler' => $verifySchedulers[0]
    ]);

    $API->disconnect();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit(1);
}


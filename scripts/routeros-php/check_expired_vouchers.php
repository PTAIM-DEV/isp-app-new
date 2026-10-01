#!/usr/bin/env php
<?php
/**
 * Check expired vouchers and disconnect them
 * Mirip dengan MIKHMON expire monitor, tapi dijalankan via CLI sebagai cron job
 * Usage: php check_expired_vouchers.php <host> <port> <username> <password>
 */

require_once __DIR__ . '/routeros_api.class.php';

if ($argc < 5) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid arguments. Usage: php check_expired_vouchers.php <host> <port> <username> <password>'
    ]);
    exit(1);
}

$host = $argv[1];
$port = intval($argv[2]);
$username = $argv[3];
$password = $argv[4];

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

    // Script untuk check expired vouchers (mirip MIKHMON)
    // Gunakan script source yang sama dengan install_scheduler.php
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

    // Execute script via RouterOS API
    // Gunakan script yang sudah ada (check-expired-vouchers) yang dibuat oleh install_scheduler.php
    $scriptName = 'check-expired-vouchers';
    $existingScripts = $API->comm('/system/script/print', [
        '?name' => $scriptName
    ]);

    // Always update script source untuk memastikan script lengkap dan benar
    if (!is_array($existingScripts) || count($existingScripts) === 0 || !isset($existingScripts[0])) {
        // Script belum ada, buat dulu
        $result = $API->comm('/system/script/add', [
            'name' => $scriptName,
            'source' => $scriptSource,
            'owner' => 'admin'
        ]);
        
        // Check for error
        if (!empty($result['!trap'][0]['message'])) {
            echo json_encode([
                'success' => false,
                'error' => 'Failed to create script: ' . $result['!trap'][0]['message']
            ]);
            $API->disconnect();
            exit(1);
        }
        
        // Get script ID from result (format: *ID)
        $scriptId = is_string($result) && substr($result, 0, 1) === '*' ? $result : null;
        
        // Verify script was created
        $verifyScripts = $API->comm('/system/script/print', ['?name' => $scriptName]);
        if (is_array($verifyScripts) && count($verifyScripts) > 0 && isset($verifyScripts[0])) {
            $scriptId = $verifyScripts[0]['.id'];
        } else {
            echo json_encode([
                'success' => false,
                'error' => 'Script was not created'
            ]);
            $API->disconnect();
            exit(1);
        }
    } else {
        // Script sudah ada, update dengan source yang benar
        $scriptId = $existingScripts[0]['.id'];
        
        // Update script source
        $result = $API->comm('/system/script/set', [
            '.id' => $scriptId,
            'source' => $scriptSource
        ]);
        
        // Check for error
        if (!empty($result['!trap'][0]['message'])) {
            echo json_encode([
                'success' => false,
                'error' => 'Failed to update script: ' . $result['!trap'][0]['message']
            ]);
            $API->disconnect();
            exit(1);
        }
        
        // Verify script was updated
        $verifyScripts = $API->comm('/system/script/print', ['?name' => $scriptName]);
        if (!is_array($verifyScripts) || count($verifyScripts) === 0 || !isset($verifyScripts[0])) {
            echo json_encode([
                'success' => false,
                'error' => 'Script was not updated'
            ]);
            $API->disconnect();
            exit(1);
        }
    }

    // Run script menggunakan script ID
    $runResult = $API->comm('/system/script/run', [
        '.id' => $scriptId
    ]);

    // Check for error
    if (!empty($runResult['!trap'][0]['message'])) {
        echo json_encode([
            'success' => false,
            'error' => 'Script execution error: ' . $runResult['!trap'][0]['message']
        ]);
        $API->disconnect();
        exit(1);
    }

    // Count expired users (optional, untuk reporting)
    $expiredUsers = $API->comm('/ip/hotspot/user/print', [
        '?limit-uptime' => '1s'
    ]);

    $expiredCount = is_array($expiredUsers) ? count($expiredUsers) : 0;

    echo json_encode([
        'success' => true,
        'message' => 'Expired vouchers checked and disconnected',
        'expired_count' => $expiredCount,
        'executed_at' => date('Y-m-d H:i:s')
    ]);

    $API->disconnect();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit(1);
}


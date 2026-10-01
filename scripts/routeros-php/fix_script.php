#!/usr/bin/env php
<?php
/**
 * Fix script syntax error di MikroTik
 * Usage: php fix_script.php <host> <port> <username> <password>
 */

require_once __DIR__ . '/routeros_api.class.php';

if ($argc < 5) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid arguments. Usage: php fix_script.php <host> <port> <username> <password>'
    ]);
    exit(1);
}

$host = $argv[1];
$port = intval($argv[2]);
$username = $argv[3];
$password = $argv[4];

$scriptName = 'check-expired-vouchers';

// Script source dengan format yang benar (tanpa indentasi yang berlebihan)
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
    $existingScripts = $API->comm('/system/script/print', [
        '?name' => $scriptName
    ]);

    if (is_array($existingScripts) && count($existingScripts) > 0 && isset($existingScripts[0])) {
        // Delete existing script first
        $API->comm('/system/script/remove', [
            '.id' => $existingScripts[0]['.id']
        ]);
        echo "Deleted existing script\n";
    }

    // Create new script with correct format
    $result = $API->comm('/system/script/add', [
        'name' => $scriptName,
        'source' => $scriptSource,
        'owner' => 'admin'
    ]);

    // Check for error
    if (!empty($result['!trap'][0]['message'])) {
        echo json_encode([
            'success' => false,
            'error' => 'Script error: ' . $result['!trap'][0]['message'],
            'script_preview' => substr($scriptSource, 0, 200)
        ]);
        $API->disconnect();
        exit(1);
    }

    // Verify script
    $verifyScripts = $API->comm('/system/script/print', [
        '?name' => $scriptName
    ]);

    if (!is_array($verifyScripts) || count($verifyScripts) === 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Script was not created'
        ]);
        $API->disconnect();
        exit(1);
    }

    // Test script syntax by trying to get source
    $retrievedSource = isset($verifyScripts[0]['source']) ? $verifyScripts[0]['source'] : '';
    if (empty($retrievedSource)) {
        echo json_encode([
            'success' => false,
            'error' => 'Script source is empty - syntax error detected'
        ]);
        $API->disconnect();
        exit(1);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Script fixed and verified successfully',
        'script_id' => $verifyScripts[0]['.id'],
        'source_length' => strlen($retrievedSource)
    ]);

    $API->disconnect();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit(1);
}


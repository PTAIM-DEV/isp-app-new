#!/usr/bin/env php
<?php
/**
 * Check expired voucher scheduler status
 * Usage: php check_scheduler.php <host> <port> <username> <password>
 */

require_once __DIR__ . '/routeros_api.class.php';

if ($argc < 5) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid arguments. Usage: php check_scheduler.php <host> <port> <username> <password>'
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

    $result = [
        'success' => true,
        'script' => null,
        'scheduler' => null
    ];

    // Check script
    // MIKHMON menggunakan /system/script/print (dengan slash)
    $scriptName = 'check-expired-vouchers';
    $scripts = $API->comm('/system/script/print', [
        '?name' => $scriptName
    ]);
    
    if (is_array($scripts) && count($scripts) > 0 && isset($scripts[0])) {
        $script = $scripts[0];
        $result['script'] = [
            'exists' => true,
            'id' => $script['.id'] ?? 'N/A',
            'name' => $script['name'] ?? 'N/A',
            'owner' => $script['owner'] ?? 'N/A',
            'source_preview' => isset($script['source']) ? substr($script['source'], 0, 100) . '...' : 'N/A'
        ];
    } else {
        $result['script'] = [
            'exists' => false,
            'message' => 'Script not found'
        ];
    }

    // Check scheduler
    // MIKHMON menggunakan /system/scheduler/print (dengan slash)
    $schedulerName = 'expired-voucher-checker';
    $schedulers = $API->comm('/system/scheduler/print', [
        '?name' => $schedulerName
    ]);
    
    if (is_array($schedulers) && count($schedulers) > 0 && isset($schedulers[0])) {
        $sched = $schedulers[0];
        $result['scheduler'] = [
            'exists' => true,
            'id' => $sched['.id'] ?? 'N/A',
            'name' => $sched['name'] ?? 'N/A',
            'interval' => $sched['interval'] ?? 'N/A',
            'on-event' => $sched['on-event'] ?? 'N/A',
            'disabled' => $sched['disabled'] ?? 'false',
            'start-time' => $sched['start-time'] ?? 'N/A',
            'next-run' => $sched['next-run'] ?? 'N/A'
        ];
    } else {
        $result['scheduler'] = [
            'exists' => false,
            'message' => 'Scheduler not found'
        ];
    }

    echo json_encode($result, JSON_PRETTY_PRINT);

    $API->disconnect();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit(1);
}


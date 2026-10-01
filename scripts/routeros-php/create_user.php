#!/usr/bin/env php
<?php
/**
 * Create RouterOS hotspot user via PHP CLI
 * Usage: php create_user.php <host> <port> <username> <password> <json_user_data>
 */

require_once __DIR__ . '/routeros_api.class.php';

if ($argc < 6) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid arguments. Usage: php create_user.php <host> <port> <username> <password> <json_user_data>'
    ]);
    exit(1);
}

$host = $argv[1];
$port = intval($argv[2]);
$apiUsername = $argv[3];
$apiPassword = $argv[4];
$jsonUserData = $argv[5];

$userData = json_decode($jsonUserData, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid JSON user data: ' . json_last_error_msg()
    ]);
    exit(1);
}

try {
    $API = new RouterosAPI();
    $API->debug = false;
    $API->port = $port;
    $API->timeout = 5;

    if (!$API->connect($host, $apiUsername, $apiPassword)) {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to connect to RouterOS'
        ]);
        exit(1);
    }

    $userParams = [
        'name' => $userData['username'],
    ];

    if (!empty($userData['password'])) {
        $userParams['password'] = $userData['password'];
    }

    // Profile harus string dan tidak kosong
    // Follow MIKHMON approach: langsung kirim profile name tanpa verify
    // RouterOS akan return error jika profile tidak ada
    if (!empty($userData['profile']) && is_string($userData['profile']) && trim($userData['profile']) !== '') {
        $userParams['profile'] = trim($userData['profile']);
    }

    if (!empty($userData['limitUptime'])) {
        $userParams['limit-uptime'] = $userData['limitUptime'];
    }

    if (!empty($userData['macCookieTimeout'])) {
        $userParams['mac-cookie-timeout'] = $userData['macCookieTimeout'];
    }

    if (isset($userData['addMacCookie'])) {
        $userParams['add-mac-cookie'] = $userData['addMacCookie'] ? 'yes' : 'no';
    }

    if (isset($userData['disabled'])) {
        $userParams['disabled'] = $userData['disabled'] ? 'yes' : 'no';
    }

    if (!empty($userData['comment'])) {
        $userParams['comment'] = $userData['comment'];
    }

    if (!empty($userData['server'])) {
        $userParams['server'] = $userData['server'];
    }

    // Debug: log parameters yang akan dikirim
    // error_log("User params: " . json_encode($userParams));

    $result = $API->comm('/ip/hotspot/user/add', $userParams);
    
    // Check for error
    if (!empty($result['!trap'][0]['message'])) {
        echo json_encode([
            'success' => false,
            'error' => $result['!trap'][0]['message']
        ]);
        $API->disconnect();
        exit(1);
    }
    
    // Get user ID from result
    $userId = null;
    if (is_string($result) && substr($result, 0, 1) == '*') {
        $userId = $result;
    } elseif (is_array($result) && isset($result['ret'])) {
        $userId = $result['ret'];
    }
    
    // Verify user was created
    $verify = $API->comm('/ip/hotspot/user/print', [
        '?name' => $userData['username']
    ]);
    
    if (is_array($verify) && count($verify) > 0 && $verify[0]['name'] === $userData['username']) {
        echo json_encode([
            'success' => true,
            'id' => $verify[0]['.id'],
            'data' => $verify[0]
        ]);
    } elseif ($userId) {
        echo json_encode([
            'success' => true,
            'id' => $userId,
            'note' => 'Created but verification returned empty'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'User creation returned empty result and user not found'
        ]);
        $API->disconnect();
        exit(1);
    }

    $API->disconnect();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit(1);
}


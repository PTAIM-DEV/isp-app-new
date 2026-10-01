#!/usr/bin/env php
<?php
/**
 * Verify RouterOS hotspot user exists
 * Usage: php verify_user.php <host> <port> <username> <password> <user_name>
 */

require_once __DIR__ . '/routeros_api.class.php';

if ($argc < 6) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid arguments. Usage: php verify_user.php <host> <port> <username> <password> <user_name>'
    ]);
    exit(1);
}

$host = $argv[1];
$port = intval($argv[2]);
$apiUsername = $argv[3];
$apiPassword = $argv[4];
$userName = $argv[5];

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

    // Get user by name
    $user = $API->comm('/ip/hotspot/user/print', [
        '?name' => $userName
    ]);
    
    if (is_array($user) && count($user) > 0) {
        $userData = $user[0];
        echo json_encode([
            'success' => true,
            'exists' => true,
            'data' => $userData
        ], JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            'success' => true,
            'exists' => false,
            'message' => 'User not found'
        ]);
    }

    $API->disconnect();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit(1);
}







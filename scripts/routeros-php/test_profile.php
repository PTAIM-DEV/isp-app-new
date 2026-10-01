#!/usr/bin/env php
<?php
/**
 * Test script untuk check profile di MikroTik
 */

require_once __DIR__ . '/routeros_api.class.php';

$host = $argv[1] ?? "210.211.21.30";
$port = intval($argv[2] ?? "18728");
$username = $argv[3] ?? "admin";
$password = $argv[4] ?? "G4str42025";

try {
    $API = new RouterosAPI();
    $API->debug = false;
    $API->port = $port;
    $API->timeout = 5;

    if (!$API->connect($host, $username, $password)) {
        echo "Failed to connect\n";
        exit(1);
    }

    // List all user profiles (bukan server profile)
    $profiles = $API->comm('/ip/hotspot/user/profile/print', []);
    
    echo "User Profiles found:\n";
    if (is_array($profiles)) {
        foreach ($profiles as $profile) {
            echo "- Name: " . ($profile['name'] ?? 'N/A') . "\n";
            echo "  ID: " . ($profile['.id'] ?? 'N/A') . "\n";
            echo "  Rate Limit: " . ($profile['rate-limit'] ?? 'N/A') . "\n";
            echo "  Shared Users: " . ($profile['shared-users'] ?? 'N/A') . "\n";
            echo "\n";
        }
    } else {
        echo "No profiles found or invalid response\n";
    }
    
    // Check specific profile
    $checkProfile = $API->comm('/ip/hotspot/user/profile/print', [
        '?name' => 'PAKET-12-JAM'
    ]);
    
    echo "\nChecking for 'PAKET-3-HARI':\n";
    if (is_array($checkProfile) && count($checkProfile) > 0) {
        echo "Found: " . json_encode($checkProfile[0], JSON_PRETTY_PRINT) . "\n";
    } else {
        echo "NOT FOUND\n";
    }

    $API->disconnect();
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}


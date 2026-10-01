#!/usr/bin/env php
<?php
/**
 * Create or update RouterOS hotspot profile via PHP CLI
 * Usage: php create_profile.php <host> <port> <username> <password> <profileName> <json_params>
 */

require_once __DIR__ . '/routeros_api.class.php';

if ($argc < 6) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid arguments. Usage: php create_profile.php <host> <port> <username> <password> <profileName> <json_params>'
    ]);
    exit(1);
}

$host = $argv[1];
$port = intval($argv[2]);
$username = $argv[3];
$password = $argv[4];
$profileName = $argv[5];
$jsonParams = $argv[6] ?? '{}';

$params = json_decode($jsonParams, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid JSON params: ' . json_last_error_msg()
    ]);
    exit(1);
}

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

    // Check if profile exists
    // MIKHMON menggunakan /ip/hotspot/user/profile (user profile, bukan server profile)
    // User profile digunakan untuk rate-limit per user
    $existing = $API->comm('/ip/hotspot/user/profile/print', [
        '?name' => $profileName
    ]);

    $profileParams = [
        'name' => $profileName
    ];
    
    // shared-users untuk user profile (MIKHMON menggunakan ini)
    if (!empty($params['sharedUsers'])) {
        $profileParams['shared-users'] = $params['sharedUsers'];
    } else {
        $profileParams['shared-users'] = '1'; // Default
    }
    
    // status-autorefresh untuk user profile (MIKHMON menggunakan ini)
    if (!empty($params['statusAutorefresh'])) {
        $profileParams['status-autorefresh'] = $params['statusAutorefresh'];
    } else {
        $profileParams['status-autorefresh'] = '1m'; // Default seperti MIKHMON
    }

    if (!empty($params['rateLimit'])) {
        $profileParams['rate-limit'] = $params['rateLimit'];
    } elseif (!empty($params['downloadSpeed']) || !empty($params['uploadSpeed'])) {
        $download = $params['downloadSpeed'] ?? '0';
        $upload = $params['uploadSpeed'] ?? '0';
        $profileParams['rate-limit'] = "$download/$upload";
    }

    if (!empty($params['addressPool'])) {
        $profileParams['address-pool'] = $params['addressPool'];
    }

    if (!empty($params['parentQueue'])) {
        $profileParams['parent-queue'] = $params['parentQueue'];
    }

    // limit-uptime tidak digunakan di profile, hanya di user
    // if (!empty($params['limitUptime'])) {
    //     $profileParams['limit-uptime'] = $params['limitUptime'];
    // }

    if (is_array($existing) && count($existing) > 0) {
        // Update existing profile
        $profileId = $existing[0]['.id'];
        $profileParams['.id'] = $profileId;
        
        $result = $API->comm('/ip/hotspot/user/profile/set', $profileParams);
        
        // Check for error
        if (!empty($result['!trap'][0]['message'])) {
            echo json_encode([
                'success' => false,
                'error' => $result['!trap'][0]['message']
            ]);
            $API->disconnect();
            exit(1);
        }
        
        // Verify profile was updated
        $verify = $API->comm('/ip/hotspot/user/profile/print', [
            '?.id' => $profileId
        ]);
        
        if (is_array($verify) && count($verify) > 0 && $verify[0]['name'] === $profileName) {
            echo json_encode([
                'success' => true,
                'action' => 'updated',
                'id' => $profileId,
                'data' => $verify[0]
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'action' => 'updated',
                'id' => $profileId,
                'note' => 'Updated but verification returned empty'
            ]);
        }
    } else {
        // Create new profile (user profile, bukan server profile)
        $result = $API->comm('/ip/hotspot/user/profile/add', $profileParams);
        
        // Check for error
        if (!empty($result['!trap'][0]['message'])) {
            echo json_encode([
                'success' => false,
                'error' => $result['!trap'][0]['message']
            ]);
            $API->disconnect();
            exit(1);
        }
        
        // Get profile ID from result
        $profileId = null;
        if (is_string($result) && substr($result, 0, 1) == '*') {
            $profileId = $result;
        } elseif (is_array($result) && isset($result['ret'])) {
            $profileId = $result['ret'];
        }
        
        // Verify profile was created
        $verify = $API->comm('/ip/hotspot/user/profile/print', [
            '?name' => $profileName
        ]);
        
        if (is_array($verify) && count($verify) > 0 && $verify[0]['name'] === $profileName) {
            echo json_encode([
                'success' => true,
                'action' => 'created',
                'id' => $verify[0]['.id'],
                'data' => $verify[0]
            ]);
        } elseif ($profileId) {
            echo json_encode([
                'success' => true,
                'action' => 'created',
                'id' => $profileId,
                'note' => 'Created but verification returned empty'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => 'Profile creation returned empty result and profile not found'
            ]);
            $API->disconnect();
            exit(1);
        }
    }

    $API->disconnect();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit(1);
}


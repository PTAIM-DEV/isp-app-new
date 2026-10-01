#!/usr/bin/env php
<?php
/**
 * Check script source di MikroTik
 * Usage: php check_script.php <host> <port> <username> <password>
 */

require_once __DIR__ . '/routeros_api.class.php';

if ($argc < 5) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid arguments. Usage: php check_script.php <host> <port> <username> <password>'
    ]);
    exit(1);
}

$host = $argv[1];
$port = intval($argv[2]);
$username = $argv[3];
$password = $argv[4];

$scriptName = 'check-expired-vouchers';

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

    // Get script
    $scripts = $API->comm('/system/script/print', [
        '?name' => $scriptName
    ]);

    if (!is_array($scripts) || count($scripts) === 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Script not found'
        ]);
        $API->disconnect();
        exit(1);
    }

    $script = $scripts[0];
    $source = isset($script['source']) ? $script['source'] : '';

    // Check for syntax errors
    $hasError = false;
    $errors = [];

    // Check for balanced braces
    $openBraces = substr_count($source, '{');
    $closeBraces = substr_count($source, '}');
    if ($openBraces !== $closeBraces) {
        $hasError = true;
        $errors[] = "Unbalanced braces: $openBraces open, $closeBraces close";
    }

    // Check for common syntax issues
    if (empty($source)) {
        $hasError = true;
        $errors[] = 'Script source is empty';
    }

    // Check for invalid characters at start
    if (substr(trim($source), 0, 1) !== ':') {
        $hasError = true;
        $errors[] = 'Script should start with :local or :if';
    }

    echo json_encode([
        'success' => true,
        'script' => [
            'name' => $script['name'],
            'owner' => $script['owner'] ?? 'admin',
            'last_started' => $script['last-started'] ?? null,
            'run_count' => $script['run-count'] ?? 0,
            'source_length' => strlen($source),
            'source_preview' => substr($source, 0, 200),
            'source_full' => $source,
            'has_error' => $hasError,
            'errors' => $errors,
            'brace_count' => [
                'open' => $openBraces,
                'close' => $closeBraces,
                'balanced' => $openBraces === $closeBraces
            ]
        ]
    ], JSON_PRETTY_PRINT);

    $API->disconnect();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit(1);
}


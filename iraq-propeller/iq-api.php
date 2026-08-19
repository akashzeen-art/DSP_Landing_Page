<?php
/**
 * Iraq Propeller LP — CMP API proxy
 * Providers:
 *   iqag  → Asiacell  http://143.198.213.74/prod/IQAGcmp
 *   iqkg  → Korek     http://143.198.213.74/prod/IQKGcmp
 *   iqzain→ Zain      http://159.89.163.174/prod/IQcmp
 *
 * Usage: iq-api.php?provider=iqag&path=sendPIN&cid=200&msisdn=...
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$provider = isset($_GET['provider']) ? strtolower(trim((string) $_GET['provider'])) : '';
$path = isset($_GET['path']) ? trim((string) $_GET['path'], '/') : '';

$bases = [
    'iqag' => 'http://143.198.213.74/prod/IQAGcmp',
    'iqkg' => 'http://143.198.213.74/prod/IQKGcmp',
    'iqzain' => 'http://159.89.163.174/prod/IQcmp',
];

$allowed = ['sendPIN', 'verifyPIN', 'status', 'redirect', 'antifraud'];

if (!isset($bases[$provider])) {
    http_response_code(400);
    echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Invalid provider']);
    exit;
}

if ($path === '' || !in_array($path, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Invalid or missing path']);
    exit;
}

$params = $_GET;
unset($params['provider'], $params['path']);
$query = http_build_query($params);
$url = $bases[$provider] . '/' . $path . ($query !== '' ? ('?' . $query) : '');

if ($path === 'redirect') {
    header('Location: ' . $url, true, 302);
    exit;
}

$body = false;
$httpCode = 200;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_USERAGENT => 'IraqPropeller-CMPProxy/1.0',
    ]);
    $body = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($body === false) {
        http_response_code(502);
        echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Proxy error: ' . curl_error($ch)]);
        curl_close($ch);
        exit;
    }
    curl_close($ch);
} else {
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 30,
            'ignore_errors' => true,
            'header' => "User-Agent: IraqPropeller-CMPProxy/1.0\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        http_response_code(502);
        echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Proxy error: enable PHP cURL']);
        exit;
    }
}

http_response_code($httpCode > 0 ? $httpCode : 200);
echo $body;

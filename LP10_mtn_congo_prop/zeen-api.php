<?php
/**
 * Proxy for Congo MTN CGcmp PIN APIs.
 * GET zeen-api.php?host=168.144.122.72&path=sendPIN&cid=19&msisdn=24206...&ip=...
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$hosts = [
    '168.144.122.72' => true,
];
$paths = [
    'sendPIN' => true,
    'verifyPIN' => true,
    'status' => true,
];

$host = isset($_GET['host']) ? trim($_GET['host']) : '168.144.122.72';
$path = isset($_GET['path']) ? trim($_GET['path']) : '';

if (!isset($hosts[$host]) || !isset($paths[$path])) {
    http_response_code(400);
    echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Invalid host or path']);
    exit;
}

$params = $_GET;
unset($params['host'], $params['path']);
$query = http_build_query($params);
$url = 'http://' . $host . '/prod/CGcmp/' . $path . ($query !== '' ? ('?' . $query) : '');

$body = false;
$httpCode = 200;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
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
    $ctx = stream_context_create(['http' => ['timeout' => 30, 'ignore_errors' => true]]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        http_response_code(502);
        echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Proxy error: enable PHP cURL or allow_url_fopen']);
        exit;
    }
}

http_response_code($httpCode > 0 ? $httpCode : 200);
echo $body;

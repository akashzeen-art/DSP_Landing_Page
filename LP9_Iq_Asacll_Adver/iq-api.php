<?php
/**
 * Iraq Asiacell Gamifya — IQAGcmp API proxy
 * GET iq-api.php?path=sendPIN&cid=224&msisdn=...&ip=...&sessionKey=...
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = isset($_GET['path']) ? trim((string) $_GET['path'], '/') : '';
$allowed = ['sendPIN', 'verifyPIN', 'status'];

if ($path === '' || !in_array($path, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Invalid or missing path']);
    exit;
}

$params = $_GET;
unset($params['path']);
$query = http_build_query($params);
$url = 'http://143.198.213.74/prod/IQAGcmp/' . $path . ($query !== '' ? ('?' . $query) : '');

$body = false;
$httpCode = 200;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_USERAGENT => 'IQ-Asiacell-Gamifya-Advertizer/1.0',
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
            'header' => "User-Agent: IQ-Asiacell-Gamifya-Advertizer/1.0\r\n",
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

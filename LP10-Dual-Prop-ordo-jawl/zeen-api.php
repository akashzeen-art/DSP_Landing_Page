<?php
/**
 * Proxy for Palestine Gamify Zeentec WAP APIs.
 * GET zeen-api.php?path=pingen&id=113&msisdn=...&ua=...&ip=...&param1=btn-1&clickid=...
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = isset($_GET['path']) ? trim((string) $_GET['path'], '/') : '';
$allowed = ['pingen', 'pinver', 'checkstatus', 'getportal'];

if ($path === '' || !in_array($path, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Invalid or missing path']);
    exit;
}

$params = $_GET;
unset($params['path']);
$query = http_build_query($params);
$url = 'https://wap.zeentec.com/pay/' . $path . ($query !== '' ? ('?' . $query) : '');

if ($path === 'getportal') {
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
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT => 'PS-Dual-Gamify/1.0',
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
            'header' => "User-Agent: PS-Dual-Gamify/1.0\r\n",
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        http_response_code(502);
        echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Proxy error: enable PHP cURL']);
        exit;
    }
}

$trim = trim((string) $body);
if (preg_match('/^(ACTIVE|INACTIVE)$/i', $trim)) {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(200);
    echo json_encode(['response' => strtoupper($trim), 'errorMessage' => $trim]);
    exit;
}

http_response_code($httpCode > 0 ? $httpCode : 200);
echo $body;

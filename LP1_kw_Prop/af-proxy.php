<?php
/**
 * STC Kuwait antifraud proxy.
 *   http://40.172.132.15/kwstc/mystrycenter/antifraud.php?...
 * Needed because the AF host is HTTP-only and the LP runs on HTTPS.
 */
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$url = isset($_GET['url']) ? trim((string) $_GET['url']) : '';
$okHost = strpos($url, 'http://40.172.132.15/kwstc/mystrycenter/antifraud.php') === 0;
if ($url === '' || !$okHost) {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(400);
    echo json_encode(['status' => false, 'msg' => 'Invalid url']);
    exit;
}

$body = false;
$httpCode = 200;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_USERAGENT => 'ZeenLP-KwStcAF/1.0',
    ]);
    $body = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ctype = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    if ($body === false) {
        header('Content-Type: application/json; charset=UTF-8');
        http_response_code(502);
        echo json_encode(['status' => false, 'msg' => 'AF proxy error: ' . curl_error($ch)]);
        curl_close($ch);
        exit;
    }
    curl_close($ch);
} else {
    $ctx = stream_context_create(['http' => ['timeout' => 15, 'ignore_errors' => true]]);
    $body = @file_get_contents($url, false, $ctx);
    $ctype = 'text/plain';
    if ($body === false) {
        header('Content-Type: application/json; charset=UTF-8');
        http_response_code(502);
        echo json_encode(['status' => false, 'msg' => 'AF proxy error']);
        exit;
    }
}

header('Content-Type: ' . ($ctype ? $ctype : 'text/plain') . '; charset=UTF-8');
http_response_code($httpCode > 0 ? $httpCode : 200);
echo $body;

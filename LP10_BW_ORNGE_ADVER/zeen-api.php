<?php
/**
 * Proxy for Zeen adnet APIs (BW Orange Premium games cid=3198).
 * GET zeen-api.php?path=sendpin&cid=3198&msisdn=267...&click_id=...
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$allowed = [
    'sendpin' => true,
    'verifypin' => true,
    'checkstatus' => true,
];

$path = isset($_GET['path']) ? strtolower(trim($_GET['path'], '/')) : '';
if ($path === '' || !isset($allowed[$path])) {
    http_response_code(400);
    echo json_encode(['status' => false, 'msg' => 'Invalid or missing path']);
    exit;
}

$params = $_GET;
unset($params['path']);

$userIp = isset($params['user_ip']) ? trim((string) $params['user_ip']) : '';
if ($userIp === '' || $userIp === '0.0.0.0') {
    $serverIp = isset($_SERVER['REMOTE_ADDR']) ? trim((string) $_SERVER['REMOTE_ADDR']) : '';
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $serverIp = trim($parts[0]);
    }
    if ($serverIp !== '') {
        $params['user_ip'] = $serverIp;
    }
}

$query = http_build_query($params);
$url = 'http://64.225.85.48/adnet/' . $path . ($query !== '' ? ('?' . $query) : '');

$body = false;
$httpCode = 200;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 90,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_USERAGENT => 'BW-Orange-PremiumGames/1.0',
    ]);
    $body = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($body === false) {
        http_response_code(502);
        echo json_encode(['status' => false, 'msg' => 'Proxy error: ' . curl_error($ch)]);
        curl_close($ch);
        exit;
    }
    curl_close($ch);
} else {
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 90,
            'ignore_errors' => true,
            'header' => "User-Agent: BW-Orange-PremiumGames/1.0\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        http_response_code(502);
        echo json_encode(['status' => false, 'msg' => 'Proxy error: enable PHP cURL or allow_url_fopen']);
        exit;
    }
}

http_response_code($httpCode > 0 ? $httpCode : 200);
echo $body;

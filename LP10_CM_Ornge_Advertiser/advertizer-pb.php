<?php
/**
 * Server-to-server Advertizer conversion postback.
 *
 *   http://postback.advertizer.com/pb.php?clickid={clickid}&txn_id={clickid}&amount=100&advertiser_id=Zeen1041&key=a5b193ada1cbd22a987bfe876496ac40
 *
 * clickid must be the real {clickid} / [[subid]] from the campaign URL.
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function adv_clickid() {
    $keys = ['clickid', 'click_id', 'subid', 'visitor_id'];
    foreach ($keys as $k) {
        if (isset($_GET[$k]) && trim((string) $_GET[$k]) !== '') {
            return trim((string) $_GET[$k]);
        }
    }
    return '';
}

function is_real_clickid($v) {
    if ($v === '') return false;
    $low = strtolower($v);
    if (strpos($v, 'local_') === 0) return false;
    if (in_array($low, ['clickid', 'subid', 'visitor_id', 'undefined', 'null'], true)) return false;
    if (strpos($v, '{') !== false || strpos($v, '${') !== false || strpos($v, '[[') !== false) return false;
    return true;
}

$clickId = adv_clickid();

if (!is_real_clickid($clickId)) {
    http_response_code(400);
    echo json_encode([
        'status' => false,
        'msg' => 'Missing or invalid clickid (need real Advertizer [[subid]] / clickid)'
    ]);
    exit;
}

$amount = isset($_GET['amount']) && trim((string) $_GET['amount']) !== ''
    ? trim((string) $_GET['amount'])
    : '100';

$txnId = isset($_GET['txn_id']) && trim((string) $_GET['txn_id']) !== ''
    ? trim((string) $_GET['txn_id'])
    : $clickId;

$pb = 'http://postback.advertizer.com/pb.php?' . http_build_query([
    'clickid' => $clickId,
    'txn_id' => $txnId,
    'amount' => $amount,
    'advertiser_id' => 'Zeen1041',
    'key' => 'a5b193ada1cbd22a987bfe876496ac40',
]);

$httpCode = 0;
$body = '';
$error = '';

if (function_exists('curl_init')) {
    $ch = curl_init($pb);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_USERAGENT => 'ZeenLP-AdvertizerPostback/1.0',
    ]);
    $body = curl_exec($ch);
    if ($body === false) {
        $error = curl_error($ch);
        $httpCode = 502;
    } else {
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    }
    curl_close($ch);
} else {
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 20,
            'ignore_errors' => true,
            'header' => "User-Agent: ZeenLP-AdvertizerPostback/1.0\r\n",
        ],
    ]);
    $body = @file_get_contents($pb, false, $ctx);
    if ($body === false) {
        $error = 'file_get_contents failed';
        $httpCode = 502;
    } else {
        $httpCode = 200;
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
            $httpCode = (int) $m[1];
        }
    }
}

$ok = ($error === '' && $httpCode >= 200 && $httpCode < 400);
http_response_code($ok ? 200 : 502);
echo json_encode([
    'status' => $ok,
    'http_code' => $httpCode,
    'clickid' => $clickId,
    'txn_id' => $txnId,
    'amount' => $amount,
    'postback_url' => $pb,
    'advertizer_body' => is_string($body) ? substr($body, 0, 500) : '',
    'error' => $error,
]);

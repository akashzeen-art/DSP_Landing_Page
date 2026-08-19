<?php
/**
 * PropellerAds S2S postback proxy.
 *   https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id={clickid}&payout={payout}
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function pb_clickid() {
    $keys = ['visitor_id', 'clickid', 'click_id', 'subid'];
    foreach ($keys as $k) {
        if (isset($_GET[$k]) && trim((string) $_GET[$k]) !== '') {
            return trim((string) $_GET[$k]);
        }
    }
    return '';
}

function is_real($v) {
    if ($v === '') return false;
    $low = strtolower($v);
    if (strpos($v, 'local_') === 0) return false;
    if (in_array($low, ['clickid', 'subid', 'visitor_id', 'undefined', 'null'], true)) return false;
    if (strpos($v, '{') !== false || strpos($v, '${') !== false || strpos($v, '[[') !== false) return false;
    return true;
}

$clickId = pb_clickid();
if (!is_real($clickId)) {
    http_response_code(400);
    echo json_encode(['status' => false, 'msg' => 'Missing or invalid visitor_id']);
    exit;
}

$payout = isset($_GET['payout']) && trim((string) $_GET['payout']) !== ''
    ? trim((string) $_GET['payout'])
    : '0.25';

$pb = 'https://ad.propellerads.com/conversion.php?' . http_build_query([
    'aid' => '3898869',
    'pid' => '',
    'tid' => '154120',
    'visitor_id' => $clickId,
    'payout' => $payout,
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
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT => 'ZeenLP-PropellerPostback/1.0',
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
            'header' => "User-Agent: ZeenLP-PropellerPostback/1.0\r\n",
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
    'visitor_id' => $clickId,
    'payout' => $payout,
    'postback_url' => $pb,
    'propeller_body' => is_string($body) ? substr($body, 0, 500) : '',
    'error' => $error,
]);

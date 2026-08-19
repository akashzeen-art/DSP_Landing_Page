<?php
/**
 * Clickadu S2S conversion postback.
 *
 *   http://sconvtrk.com/conversion/c9a445f69b2775082add794af494a0a289412ae3/?visitor_id=${SUBID}&aid=307904
 *
 * visitor_id must be the real ${SUBID} from the campaign URL (?clickid=).
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
    if (strpos($v, '{') !== false || strpos($v, '${') !== false) return false;
    return true;
}

$clickId = pb_clickid();
if (!is_real($clickId)) {
    http_response_code(400);
    echo json_encode(['status' => false, 'msg' => 'Missing or invalid visitor_id (need real Clickadu ${SUBID})']);
    exit;
}

$pb = 'http://sconvtrk.com/conversion/c9a445f69b2775082add794af494a0a289412ae3/?' . http_build_query([
    'visitor_id' => $clickId,
    'aid' => '307904',
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
        CURLOPT_USERAGENT => 'ZeenLP-ClickaduPostback/1.0',
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
            'header' => "User-Agent: ZeenLP-ClickaduPostback/1.0\r\n",
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
    'postback_url' => $pb,
    'clickadu_body' => is_string($body) ? substr($body, 0, 500) : '',
    'error' => $error,
]);

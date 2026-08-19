<?php
/**
 * Server-to-server Clickadu conversion postback.
 *
 *   http://sconvtrk.com/conversion/c9a445f69b2775082add794af494a0a289412ae3/?visitor_id=${SUBID}&aid=307904
 *
 * visitor_id must be the real Clickadu ${SUBID} from the campaign URL
 * (?clickid= / ?subid=). Do not fire with placeholders or local_ test ids.
 *
 * Example:
 *   clickadu-pb.php?visitor_id=REAL_SUBID
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function clickadu_visitor_id() {
    $keys = ['visitor_id', 'clickid', 'click_id', 'subid', 'sub_id'];
    foreach ($keys as $k) {
        if (isset($_GET[$k]) && trim((string) $_GET[$k]) !== '') {
            return trim((string) $_GET[$k]);
        }
    }
    return '';
}

function is_real_subid($v) {
    if ($v === '') return false;
    $low = strtolower($v);
    if ($v === '${SUBID}' || $v === '{subid}' || $v === '{SUBID}') return false;
    if ($low === 'clickid' || $low === 'subid' || $low === 'visitor_id') return false;
    if (strpos($v, 'local_') === 0) return false;
    return true;
}

$visitorId = clickadu_visitor_id();

if (!is_real_subid($visitorId)) {
    http_response_code(400);
    echo json_encode([
        'status' => false,
        'msg' => 'Missing or invalid visitor_id (need real Clickadu ${SUBID} from clickid/subid)'
    ]);
    exit;
}

$aid = '307904';
$pb = 'https://sconvtrk.com/conversion/c9a445f69b2775082add794af494a0a289412ae3/?' . http_build_query([
    'visitor_id' => $visitorId,
    'aid' => $aid,
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
    'visitor_id' => $visitorId,
    'aid' => $aid,
    'postback_url' => $pb,
    'clickadu_body' => is_string($body) ? substr($body, 0, 500) : '',
    'error' => $error,
]);

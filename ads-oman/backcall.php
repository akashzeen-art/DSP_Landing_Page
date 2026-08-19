<?php
/**
 * Conversion postback proxy — Adsterra / pbterra
 *
 *   https://www.pbterra.com/name/Zeendigital123/at?subid_short={clickid}&atpay={payout}
 *
 * clickid must be the real Adsterra ##SUB_ID_SHORT(action)## value.
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function ads_click_id() {
    $keys = ['subid_short', 'clickid', 'click_id', 'subid', 'cid'];
    foreach ($keys as $k) {
        if (isset($_GET[$k]) && trim((string) $_GET[$k]) !== '') {
            return trim((string) $_GET[$k]);
        }
        if (isset($_POST[$k]) && trim((string) $_POST[$k]) !== '') {
            return trim((string) $_POST[$k]);
        }
    }
    return '';
}

function is_real_clickid($v) {
    if ($v === '') return false;
    $low = strtolower($v);
    if (strpos($v, 'local_') === 0) return false;
    if (in_array($low, ['clickid', 'subid', 'subid_short', 'undefined', 'null'], true)) return false;
    if (strpos($v, '{') !== false || strpos($v, '${') !== false || strpos($v, '##') !== false) return false;
    return true;
}

function ads_fetch($url) {
    $httpCode = 0;
    $body = '';
    $error = '';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'ZeenLP-AdsterraPostback/1.1',
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
                'timeout' => 15,
                'ignore_errors' => true,
                'header' => "User-Agent: ZeenLP-AdsterraPostback/1.1\r\n",
            ],
        ]);
        $body = @file_get_contents($url, false, $ctx);
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
    return [$httpCode, is_string($body) ? $body : '', $error];
}

$clickId = ads_click_id();

if (!is_real_clickid($clickId)) {
    http_response_code(400);
    echo json_encode([
        'status' => false,
        'msg' => 'Missing or invalid subid_short (need real Adsterra ##SUB_ID_SHORT(action)## from clickid)'
    ]);
    exit;
}

$payout = isset($_GET['atpay']) && trim((string) $_GET['atpay']) !== ''
    ? trim((string) $_GET['atpay'])
    : '1';

$https = 'https://www.pbterra.com/name/Zeendigital123/at?' . http_build_query([
    'subid_short' => $clickId,
    'atpay' => $payout,
]);
$http = 'http://www.pbterra.com/name/Zeendigital123/at?' . http_build_query([
    'subid_short' => $clickId,
    'atpay' => $payout,
]);
$pixel = 'https://www.pbterra.com/conversion.gif?cid=' . rawurlencode($clickId);

list($httpCode, $body, $error) = ads_fetch($https);
if ($error !== '' || $httpCode < 200 || $httpCode >= 400) {
    list($httpCode2, $body2, $error2) = ads_fetch($http);
    if ($error2 === '' && $httpCode2 >= 200 && $httpCode2 < 400) {
        $httpCode = $httpCode2;
        $body = $body2;
        $error = '';
    }
}
ads_fetch($pixel);

$ok = ($error === '' && $httpCode >= 200 && $httpCode < 400);
http_response_code($ok ? 200 : 502);
echo json_encode([
    'status' => $ok,
    'http_code' => $httpCode,
    'subid_short' => $clickId,
    'atpay' => $payout,
    'postback_url' => $https,
    'pbterra_body' => is_string($body) ? substr($body, 0, 500) : '',
    'error' => $error,
]);

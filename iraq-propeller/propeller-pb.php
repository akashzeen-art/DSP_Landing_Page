<?php
/**
 * PropellerAds S2S conversion postback.
 * visitor_id = same ${SUBID} received as ?clickid= on LP.
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$visitorId = isset($_GET['visitor_id']) ? trim($_GET['visitor_id']) : '';
$payout = isset($_GET['payout']) ? trim($_GET['payout']) : '1';

if ($visitorId === '' || $visitorId === '${SUBID}' || strtolower($visitorId) === 'clickid') {
    http_response_code(400);
    echo json_encode([
        'status' => false,
        'msg' => 'Missing or invalid visitor_id (need Propeller ${SUBID} from clickid)',
    ]);
    exit;
}

$aid = '3898869';
$pid = '';
$tid = '154120';

$pb = 'https://ad.propellerads.com/conversion.php?' . http_build_query([
    'aid' => $aid,
    'pid' => $pid,
    'tid' => $tid,
    'visitor_id' => $visitorId,
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
        CURLOPT_USERAGENT => 'IraqPropeller-Postback/1.0',
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
            'header' => "User-Agent: IraqPropeller-Postback/1.0\r\n",
        ],
    ]);
    $body = @file_get_contents($pb, false, $ctx);
    if ($body === false) {
        $error = 'file_get_contents failed';
        $httpCode = 502;
    } else {
        $httpCode = 200;
    }
}

$ok = ($error === '' && $httpCode >= 200 && $httpCode < 400);
http_response_code($ok ? 200 : 502);
echo json_encode([
    'status' => $ok,
    'http_code' => $httpCode,
    'visitor_id' => $visitorId,
    'payout' => $payout,
    'error' => $error,
]);

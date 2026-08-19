<?php
/**
 * Zain Shield antifraud prepare (server-side snippet)
 * SERVICE_ID: xSf2bJoBY94rSvaeK2i0
 *
 * Returns JSON: { uniqid, source }
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('ServiceKey', 'xSf2bJoBY94rSvaeK2i0');
$txn = isset($_GET['uniqid']) ? trim((string) $_GET['uniqid']) : '';
if ($txn === '') {
    $txn = (string) time();
}
define('TransactionID', $txn);
define('APIURL', 'https://sg.apiserver.shield.monitoringservice.co/' . ServiceKey . '/' . TransactionID . '/JS');
define('ApiSnippetUrl', 'https://uk.api.shield.monitoringservice.co/');

$secreteHeaderParams = ['Upgrade-Insecure-Requests'];
$head = [];
if (function_exists('apache_request_headers')) {
    $head = apache_request_headers();
} elseif (function_exists('getallheaders')) {
    $head = getallheaders();
}

if (is_array($head)) {
    foreach ($secreteHeaderParams as $shp) {
        if (array_key_exists($shp, $head)) {
            unset($head[$shp]);
        }
    }
    $h = urlencode(json_encode($head));
} else {
    $h = '';
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO'])) {
    $scheme = $_SERVER['HTTP_X_FORWARDED_PROTO'];
}
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
$uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/';
$lpu = $scheme . '://' . $host . $uri;

$userIp = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    $userIp = trim($parts[0]);
}

$timestamp = str_replace('.', '', isset($_SERVER['REQUEST_TIME_FLOAT']) ? (string) $_SERVER['REQUEST_TIME_FLOAT'] : (string) microtime(true));
$ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'IraqPropeller-ZainShield/1.0';

$params = [
    'lpu' => urlencode($lpu),
    'timestamp' => $timestamp,
    'user_ip' => $userIp,
    'head' => $h,
];
$query = http_build_query($params);
$apiUrl = APIURL . '?' . $query;

$response = null;
if (function_exists('curl_init')) {
    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_USERAGENT => $ua,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $raw = curl_exec($ch);
    curl_close($ch);
    if ($raw !== false && $raw !== '') {
        $response = json_decode($raw);
    }
} else {
    $ctx = stream_context_create([
        'http' => [
            'user_agent' => $ua,
            'timeout' => 5,
        ],
    ]);
    $raw = @file_get_contents($apiUrl, false, $ctx);
    if ($raw !== false && $raw !== '') {
        $response = json_decode($raw);
    }
}

if (!empty($response) && isset($response->source) && isset($response->uniqid)) {
    echo json_encode([
        'response' => 'SUCCESS',
        'uniqid' => $response->uniqid,
        'source' => $response->source,
    ]);
    exit;
}

$uniqid = md5($userIp . '-' . TransactionID . '-' . microtime(true));
$hB64 = base64_encode($h);
$source = "(function(s, o, u, r, k){
b = s.URL;
v = (b.substr(b.indexOf(r)).replace(r + '=', '')).toString();
r = (v.indexOf('&') !== -1) ? v.split('&')[0] : v;
a = s.createElement(o),
m = s.getElementsByTagName(o)[0];
a.async = 1;
a.setAttribute('crossorigin', 'anonymous');
a.src = u+'script.js?ak='+k+'&lpi='+r+'&lpu='+encodeURIComponent(b)+'&key=$uniqid&_headers=" . $hB64 . "';
m.parentNode.insertBefore(a, m);
})(document, 'script', '" . ApiSnippetUrl . "', 'uniqid', '" . ServiceKey . "');";

echo json_encode([
    'response' => 'SUCCESS',
    'uniqid' => $uniqid,
    'source' => $source,
    'fallback' => true,
]);

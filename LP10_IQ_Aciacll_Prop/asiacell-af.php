<?php
/**
 * Asiacell VMS Antifraud Prepare proxy
 * Page=1 (MSISDN LP) | Page=2 (OTP)
 * ChannelID=22796
 *
 * Returns JSON: { antifrauduniqid, mcpuniqid, script }
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
if ($page !== 1 && $page !== 2) {
    $page = 1;
}

$msisdn = isset($_GET['msisdn']) ? preg_replace('/\D+/', '', (string) $_GET['msisdn']) : '';
$clickId = isset($_GET['clickid']) ? trim((string) $_GET['clickid']) : '';
if ($clickId === '' || $clickId === '${SUBID}') {
    $clickId = (string) mt_rand(100000, 999999999);
}

// Collect request headers for AF
$reqHeaders = [];
if (function_exists('getallheaders')) {
    $reqHeaders = getallheaders();
} else {
    foreach ($_SERVER as $k => $v) {
        if (strpos($k, 'HTTP_') === 0) {
            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($k, 5)))));
            $reqHeaders[$name] = $v;
        }
    }
}
$headersEncoded = base64_encode(json_encode($reqHeaders ?: new stdClass()));
$userIp = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    $userIp = trim($parts[0]);
}

$url = 'https://antifraud-vms.iraqcom.com/Prepare/?' . http_build_query([
    'Page' => $page,
    'ChannelID' => '22796',
    'ClickID' => $clickId,
    'Headers' => $headersEncoded,
    'UserIP' => base64_encode($userIp),
    'MSISDN' => $msisdn,
]);

$rawHeaders = '';
$body = '';
$httpCode = 0;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT => 'IraqPropeller-AsiacellAF/1.0',
    ]);
    $result = curl_exec($ch);
    if ($result === false) {
        http_response_code(502);
        echo json_encode(['response' => 'FAIL', 'errorMessage' => 'AF proxy error: ' . curl_error($ch)]);
        curl_close($ch);
        exit;
    }
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $rawHeaders = substr($result, 0, $headerSize);
    $body = substr($result, $headerSize);
    curl_close($ch);
} else {
    http_response_code(502);
    echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Enable PHP cURL for Asiacell AF']);
    exit;
}

$parsed = [];
foreach (explode("\r\n", $rawHeaders) as $line) {
    if (strpos($line, ':') !== false) {
        [$key, $value] = explode(':', $line, 2);
        $parsed[strtolower(trim($key))] = trim($value);
    }
}

$antifraudid = $parsed['antifrauduniqid'] ?? null;
$mcpuniqid = $parsed['mcpuniqid'] ?? null;

$script = null;
if (preg_match('/\/\*[\s\S]*/', $body, $matches)) {
    $script = $matches[0];
} elseif (trim($body) !== '') {
    // Sometimes body is the full script without comment start
    $trim = trim($body);
    if (stripos($trim, '<script') === false && (strpos($trim, 'function') !== false || strpos($trim, '/*') === 0)) {
        $script = $trim;
    }
}

echo json_encode([
    'response' => 'SUCCESS',
    'page' => $page,
    'antifrauduniqid' => $antifraudid,
    'mcpuniqid' => $mcpuniqid,
    'script' => $script,
    'http_code' => $httpCode,
]);

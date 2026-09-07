<?php
/**
 * IQ Asiacell — Shield AntiFraud (sdp.salasto.dev)
 * ChannelID=22737
 * Page 1 (MSISDN) / Page 2 (PIN)
 *
 * Returns JSON: { antifrauduniqid, mcpuniqid, script, af_clickid }
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
$clickId = isset($_GET['click_id']) ? trim((string) $_GET['click_id']) : '';
if ($clickId === '') {
    $clickId = isset($_GET['af_clickid']) ? trim((string) $_GET['af_clickid']) : '';
}
if ($clickId === '') {
    $clickId = 'clk' . base_convert((string) (int) (microtime(true) * 1000), 10, 36);
    $clickId = preg_replace('/[^a-z0-9]/i', '', $clickId);
    $clickId = substr($clickId, 0, 50);
}

$userIp = isset($_SERVER['REMOTE_ADDR']) ? trim((string) $_SERVER['REMOTE_ADDR']) : '0.0.0.0';
if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    $userIp = trim($parts[0]);
}

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

$headersJson = json_encode($reqHeaders ?: new stdClass());
$headersB64 = base64_encode($headersJson !== false ? $headersJson : '{}');
$userIpB64 = base64_encode($userIp);

$query = http_build_query([
    'Page' => $page,
    'ChannelID' => '22737',
    'ClickID' => $clickId,
    'Headers' => $headersB64,
    'UserIP' => $userIpB64,
    'MSISDN' => $msisdn,
]);

$url = 'https://sdp.salasto.dev:2053/Shield/AntiFraud/Prepare/?' . $query;

$body = false;
$httpCode = 200;
$headerStr = '';

if (!function_exists('curl_init')) {
    http_response_code(502);
    echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Enable PHP cURL for Asiacell AF']);
    exit;
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_USERAGENT => 'ZeenLP-AsiacellShield/1.0',
]);
$raw = curl_exec($ch);
if ($raw === false) {
    $err = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    echo json_encode(['response' => 'FAIL', 'errorMessage' => 'AF proxy error: ' . $err]);
    exit;
}
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$headerStr = substr($raw, 0, $headerSize);
$body = substr($raw, $headerSize);

function af_header_value($headerBlock, $name) {
    $pattern = '/^' . preg_quote($name, '/') . ':\s*(.+)$/im';
    if (preg_match($pattern, $headerBlock, $m)) {
        return trim($m[1]);
    }
    return '';
}

$antifraudid = af_header_value($headerStr, 'AntiFrauduniqid');
if ($antifraudid === '') {
    $antifraudid = af_header_value($headerStr, 'antifrauduniqid');
}
$mcpuniqid = af_header_value($headerStr, 'MCPuniqid');
if ($mcpuniqid === '') {
    $mcpuniqid = af_header_value($headerStr, 'MCPuniqud');
}
if ($mcpuniqid === '') {
    $mcpuniqid = af_header_value($headerStr, 'mcpuniqid');
}

/* Some Shield responses return JSON body with fields */
$parsed = json_decode((string) $body, true);
$script = (string) $body;
if (is_array($parsed)) {
    if (!empty($parsed['script'])) {
        $script = (string) $parsed['script'];
    } elseif (!empty($parsed['JS'])) {
        $script = (string) $parsed['JS'];
    } elseif (!empty($parsed['js'])) {
        $script = (string) $parsed['js'];
    }
    if ($antifraudid === '' && !empty($parsed['AntiFrauduniqid'])) {
        $antifraudid = (string) $parsed['AntiFrauduniqid'];
    }
    if ($antifraudid === '' && !empty($parsed['antifrauduniqid'])) {
        $antifraudid = (string) $parsed['antifrauduniqid'];
    }
    if ($mcpuniqid === '' && !empty($parsed['MCPuniqid'])) {
        $mcpuniqid = (string) $parsed['MCPuniqid'];
    }
    if ($mcpuniqid === '' && !empty($parsed['MCPuniqud'])) {
        $mcpuniqid = (string) $parsed['MCPuniqud'];
    }
    if ($mcpuniqid === '' && !empty($parsed['mcpuniqid'])) {
        $mcpuniqid = (string) $parsed['mcpuniqid'];
    }
}

http_response_code($httpCode > 0 && $httpCode < 600 ? $httpCode : 200);
echo json_encode([
    'response' => ($httpCode >= 200 && $httpCode < 400) ? 'SUCCESS' : 'FAIL',
    'page' => $page,
    'antifrauduniqid' => $antifraudid !== '' ? $antifraudid : null,
    'mcpuniqid' => $mcpuniqid !== '' ? $mcpuniqid : null,
    'script' => $script !== '' ? $script : null,
    'af_clickid' => $clickId,
    'http_code' => $httpCode,
]);

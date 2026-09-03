<?php
/**
 * IQ Asiacell — od-integrations provider_script proxy
 * carrierId=10009 | first_page (MSISDN) | second_page (PIN)
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
$afClickId = isset($_GET['af_clickid']) ? trim((string) $_GET['af_clickid']) : '';

if ($afClickId === '') {
    $afClickId = 'clk' . base_convert((string) (int) (microtime(true) * 1000), 10, 36);
    $afClickId = preg_replace('/[^a-z0-9]/i', '', $afClickId);
    $afClickId = substr($afClickId, 0, 50);
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
if (!isset($reqHeaders['ip']) && $userIp !== '') {
    $reqHeaders['ip'] = $userIp;
}

$headersJson = json_encode($reqHeaders ?: new stdClass());
$userIpB64 = base64_encode($userIp);
$headersB64 = base64_encode($headersJson !== false ? $headersJson : '{}');

$pageName = $page === 2 ? 'second_page' : 'first_page';
$additionalData = [
    'Page' => $page,
    'ClickID' => $afClickId,
    'MSISDN' => $page === 2 ? $msisdn : '',
];

if ($page === 1) {
    $additionalData['UserIP'] = $userIpB64;
    $additionalData['Headers'] = $headersB64;
}

$payload = json_encode([
    'carrierId' => 10009,
    'pageName' => $pageName,
    'method' => 'GET',
    'additionalData' => $additionalData,
]);

$providerUrl = 'https://ua.od-integrations.com/api/provider_script';
$httpCode = 0;
$body = '';
$error = '';

if (function_exists('curl_init')) {
    $ch = curl_init($providerUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: ZeenLP-AsiacellAF/2.0',
        ],
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
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
    http_response_code(502);
    echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Enable PHP cURL for Asiacell AF']);
    exit;
}

if ($error !== '' || $httpCode < 200 || $httpCode >= 400) {
    http_response_code(502);
    echo json_encode([
        'response' => 'FAIL',
        'errorMessage' => $error !== '' ? $error : ('provider_script HTTP ' . $httpCode),
        'http_code' => $httpCode,
    ]);
    exit;
}

$data = json_decode($body, true);
if (!is_array($data)) {
    http_response_code(502);
    echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Invalid provider_script JSON']);
    exit;
}

$responseHeaders = isset($data['headers']) && is_array($data['headers']) ? $data['headers'] : [];

function af_first_header($headers, $key) {
    if (!isset($headers[$key])) {
        $lk = strtolower($key);
        foreach ($headers as $k => $v) {
            if (strtolower((string) $k) === $lk) {
                $headers[$key] = $v;
                break;
            }
        }
    }
    $v = $headers[$key] ?? '';
    if (is_array($v)) {
        return isset($v[0]) ? trim((string) $v[0]) : '';
    }
    return trim((string) $v);
}

$antifraudid = af_first_header($responseHeaders, 'AntiFrauduniqid');
if ($antifraudid === '') {
    $antifraudid = af_first_header($responseHeaders, 'antifrauduniqid');
}
$mcpuniqid = af_first_header($responseHeaders, 'MCPuniqid');
if ($mcpuniqid === '') {
    $mcpuniqid = af_first_header($responseHeaders, 'mcpuniqid');
}

$script = isset($data['body']) ? (string) $data['body'] : '';

echo json_encode([
    'response' => 'SUCCESS',
    'page' => $page,
    'antifrauduniqid' => $antifraudid !== '' ? $antifraudid : null,
    'mcpuniqid' => $mcpuniqid !== '' ? $mcpuniqid : null,
    'script' => $script !== '' ? $script : null,
    'af_clickid' => $afClickId,
    'http_code' => $httpCode,
]);

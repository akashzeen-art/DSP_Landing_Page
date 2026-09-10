<?php
/**
 * Proxy for Palestine Gamify Zeentec APIs.
 * GET zeen-api.php?path=pingen&id=116&msisdn=...&ua=...&ip=...&param1=msisdnBtn&clickid=...
 *
 * Host: https://zeentec.com/pay/...
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * API base (no trailing slash).
 */
$API_BASE = 'https://zeentec.com/pay';

/**
 * Optional: force DNS resolve (curl --resolve). Leave empty for normal DNS.
 */
$API_RESOLVE_IP = '';

$path = isset($_GET['path']) ? trim((string) $_GET['path'], '/') : '';
$allowed = ['pingen', 'pinver', 'checkstatus', 'getportal'];

if ($path === '' || !in_array($path, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['response' => 'FAIL', 'errorMessage' => 'Invalid or missing path']);
    exit;
}

$params = $_GET;
unset($params['path']);
$query = http_build_query($params);
$url = rtrim($API_BASE, '/') . '/' . $path . ($query !== '' ? ('?' . $query) : '');

if ($path === 'getportal') {
    header('Location: ' . $url, true, 302);
    exit;
}

$host = parse_url($API_BASE, PHP_URL_HOST);
$scheme = parse_url($API_BASE, PHP_URL_SCHEME) ?: 'https';
$port = ($scheme === 'https') ? 443 : 80;

/* Fast-fail with a clear message when DNS is missing (avoids vague curl 502). */
if ($API_RESOLVE_IP === '' && $host) {
    $resolved = @gethostbyname($host);
    if ($resolved === $host || $resolved === false || $resolved === '') {
        http_response_code(502);
        echo json_encode([
            'response' => 'FAIL',
            'errorMessage' =>
                'DNS missing for ' . $host . ' (NXDOMAIN). ' .
                'DNS missing for ' . $host . '. Set $API_BASE / $API_RESOLVE_IP in zeen-api.php.',
            'api_base' => $API_BASE,
            'url' => $url,
        ]);
        exit;
    }
}

$body = false;
$httpCode = 200;
$curlError = '';

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT => 'PS-Dual-Gamify/1.0',
    ];
    if ($API_RESOLVE_IP !== '' && $host) {
        $opts[CURLOPT_RESOLVE] = [$host . ':' . $port . ':' . $API_RESOLVE_IP];
        $opts[CURLOPT_SSL_VERIFYHOST] = 0; /* host may not match cert until DNS is live */
        $opts[CURLOPT_SSL_VERIFYPEER] = false;
    }
    curl_setopt_array($ch, $opts);
    $body = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($body === false) {
        $curlError = curl_error($ch);
        http_response_code(502);
        echo json_encode([
            'response' => 'FAIL',
            'errorMessage' => 'Proxy error: ' . $curlError,
            'api_base' => $API_BASE,
            'url' => $url,
        ]);
        curl_close($ch);
        exit;
    }
    curl_close($ch);
} else {
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 30,
            'ignore_errors' => true,
            'header' => "User-Agent: PS-Dual-Gamify/1.0\r\n",
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        http_response_code(502);
        echo json_encode([
            'response' => 'FAIL',
            'errorMessage' => 'Proxy error: enable PHP cURL; also check DNS for ' . $host,
            'api_base' => $API_BASE,
        ]);
        exit;
    }
}

$trim = trim((string) $body);
if (preg_match('/^(ACTIVE|INACTIVE)$/i', $trim)) {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(200);
    echo json_encode(['response' => strtoupper($trim), 'errorMessage' => $trim]);
    exit;
}

if ($trim === '') {
    http_response_code(502);
    echo json_encode([
        'response' => 'FAIL',
        'errorMessage' => 'Empty response from upstream (' . $API_BASE . '). Host/DNS may be wrong.',
        'http_code' => $httpCode,
        'url' => $url,
    ]);
    exit;
}

http_response_code($httpCode > 0 ? $httpCode : 200);
echo $body;

<?php
header('Content-Type: application/json');
echo json_encode([
    'php' => true,
    'version' => PHP_VERSION,
    'curl' => function_exists('curl_init'),
]);

<?php
header('Content-Type: application/json; charset=UTF-8');
echo json_encode([
    'status' => true,
    'msg' => 'PHP OK',
    'lp' => 'LP13_GOG_PS',
    'service' => 'Gamify',
    'geo' => 'PS',
]);

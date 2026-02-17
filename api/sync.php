<?php
/**
 * ABSOLUTE APP - API SYNC
 * Ubicación: absolutecompany.co/app/api/sync.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Archivo donde se guardará toda la base de datos
$dataFile = 'data_absolute.json';

// Manejo de peticiones pre-flight de CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// 1. Cargar datos actuales del archivo JSON
$currentData = [
    "users" => [],
    "inventory" => [],
    "orders" => []
];

if (file_exists($dataFile)) {
    $jsonContent = file_get_contents($dataFile);
    if (!empty($jsonContent)) {
        $decoded = json_decode($jsonContent, true);
        if ($decoded) {
            $currentData = $decoded;
        }
    }
}

// 2. Procesar POST (Guardar datos enviados por la App)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);

    if ($input) {
        // Si el frontend envía un paquete de sincronización completa
        if (isset($input['type']) && $input['type'] === 'sync_all') {
            if (isset($input['users'])) $currentData['users'] = $input['users'];
            if (isset($input['inventory'])) $currentData['inventory'] = $input['inventory'];
            if (isset($input['orders'])) $currentData['orders'] = $input['orders'];
        } 
        // Si envía un cambio de un tipo específico (backup)
        else if (isset($input['type']) && isset($input['data'])) {
            $key = $input['type']; // 'users', 'inventory' o 'orders'
            $currentData[$key] = $input['data'];
        }

        // Guardar el estado final en el archivo JSON del servidor
        file_put_contents($dataFile, json_encode($currentData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}

// 3. Responder siempre con el estado actual del servidor
echo json_encode($currentData);
?>
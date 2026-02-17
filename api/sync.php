
<?php
/**
 * ABSOLUTE APP - API SYNC (SECURED)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$dataFile = 'data_absolute.json';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// 1. Cargar datos actuales
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

// 2. Procesar POST (Guardar datos)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);

    if ($input) {
        if (isset($input['type']) && $input['type'] === 'sync_all') {
            
            // SEGURIDAD: Si el frontend envía usuarios, conservamos las contraseñas del servidor 
            // si el frontend no las envía (para evitar borrarlas accidentalmente)
            if (isset($input['users'])) {
                foreach ($input['users'] as $index => $incomingUser) {
                    // Si el usuario ya existe en el servidor y el incoming no trae password, mantenemos el del servidor
                    if (!isset($incomingUser['password']) || empty($incomingUser['password'])) {
                        foreach ($currentData['users'] as $serverUser) {
                            if ($serverUser['email'] === $incomingUser['email']) {
                                $input['users'][$index]['password'] = $serverUser['password'];
                                break;
                            }
                        }
                    }
                }
                $currentData['users'] = $input['users'];
            }
            
            if (isset($input['inventory'])) $currentData['inventory'] = $input['inventory'];
            if (isset($input['orders'])) $currentData['orders'] = $input['orders'];
        }

        file_put_contents($dataFile, json_encode($currentData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}

// 3. SEGURIDAD EXTREMA: Eliminar contraseñas antes de enviar la respuesta al navegador
// Las contraseñas solo se usan para el login inicial, no deben viajar en cada sync.
$safeData = $currentData;
if (isset($safeData['users'])) {
    foreach ($safeData['users'] as &$user) {
        unset($user['password']); // El cliente nunca vuelve a recibir la contraseña
    }
}

echo json_encode($safeData);
?>

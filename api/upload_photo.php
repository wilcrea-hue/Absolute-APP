<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$targetDir = "../fotografia-evidencia/";
if (!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (isset($input['image']) && isset($input['name'])) {
    $data = $input['image'];
    $name = preg_replace("/[^a-zA-Z0-9]/", "_", $input['name']);
    
    if (preg_match('/^data:image\/(\w+);base64,/', $data, $type)) {
        $data = substr($data, strpos($data, ',') + 1);
        $type = strtolower($type[1]);

        if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png'])) {
            echo json_encode(['error' => 'Tipo de imagen no permitido']);
            exit;
        }

        $data = base64_decode($data);
        if ($data === false) {
            echo json_encode(['error' => 'Error al decodificar base64']);
            exit;
        }
    } else {
        echo json_encode(['error' => 'Formato de imagen inválido']);
        exit;
    }

    $fileName = time() . '_' . $name . '.' . $type;
    $filePath = $targetDir . $fileName;

    if (file_put_contents($filePath, $data)) {
        // Construir URL absoluta basada en el servidor actual
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
        $host = $_SERVER['HTTP_HOST'];
        $scriptPath = $_SERVER['SCRIPT_NAME']; // e.g. /app/api/upload_photo.php
        $appPath = dirname(dirname($scriptPath)); // e.g. /app
        
        $url = $protocol . "://" . $host . ($appPath === '/' ? '' : $appPath) . "/fotografia-evidencia/" . $fileName;
        
        echo json_encode(['url' => $url]);
    } else {
        echo json_encode(['error' => 'No se pudo guardar el archivo en el servidor']);
    }
} else {
    echo json_encode(['error' => 'Datos de entrada incompletos']);
}
?>

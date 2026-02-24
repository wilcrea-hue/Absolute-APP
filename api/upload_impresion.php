<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$targetDir = "../impresion/";
if (!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (isset($input['file']) && isset($input['name'])) {
    $data = $input['file'];
    $originalName = $input['name'];
    
    // Extraer extensión
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $cleanName = preg_replace("/[^a-zA-Z0-9]/", "_", pathinfo($originalName, PATHINFO_FILENAME));
    
    // Permitir formatos comunes de impresión
    $allowed = ['pdf', 'ai', 'psd', 'jpg', 'jpeg', 'png', 'tiff', 'cdr', 'eps'];
    if (!in_array($ext, $allowed)) {
        echo json_encode(['error' => 'Formato de archivo no permitido para impresión.']);
        exit;
    }

    // Decodificar base64
    if (strpos($data, ',') !== false) {
        $data = substr($data, strpos($data, ',') + 1);
    }
    
    $decodedData = base64_decode($data);
    if ($decodedData === false) {
        echo json_encode(['error' => 'Error al decodificar el archivo.']);
        exit;
    }

    $fileName = time() . '_' . $cleanName . '.' . $ext;
    $filePath = $targetDir . $fileName;

    if (file_put_contents($filePath, $decodedData)) {
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
        $host = $_SERVER['HTTP_HOST'];
        $scriptPath = $_SERVER['SCRIPT_NAME'];
        $appPath = dirname(dirname($scriptPath));
        
        $url = $protocol . "://" . $host . ($appPath === '/' ? '' : $appPath) . "/impresion/" . $fileName;
        
        echo json_encode(['url' => $url]);
    } else {
        echo json_encode(['error' => 'No se pudo guardar el archivo en el servidor.']);
    }
} else {
    echo json_encode(['error' => 'Datos de entrada incompletos.']);
}
?>

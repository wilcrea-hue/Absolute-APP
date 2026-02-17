<?php
/**
 * ABSOLUTE APP - MAIL ENGINE
 * Ubicación: absolutecompany.co/app/api/send_email.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);

    if (!$input || !isset($input['to']) || !isset($input['subject']) || !isset($input['html'])) {
        echo json_encode(["success" => false, "message" => "Datos insuficientes para el envío."]);
        exit;
    }

    $to = $input['to'];
    $subject = $input['subject'];
    $message = $input['html'];
    $cc = isset($input['cc']) ? $input['cc'] : '';

    // Configuración de cabeceras para HTML
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: ABSOLUTE App <notificaciones@absolutecompany.co>" . "\r\n";
    
    if (!empty($cc)) {
        $headers .= "Cc: " . $cc . "\r\n";
    }
    
    $headers .= "Reply-To: contacto@absolutecompany.co" . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    // Envío del correo
    if (mail($to, $subject, $message, $headers)) {
        echo json_encode(["success" => true, "message" => "Correo enviado exitosamente."]);
    } else {
        echo json_encode(["success" => false, "message" => "El servidor no pudo enviar el correo."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Método no permitido."]);
}
?>
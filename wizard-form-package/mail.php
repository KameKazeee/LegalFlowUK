<?php
$service = $_POST['services'];
$full_name = $_POST['full_name'];
$email = $_POST['email'];
$number= $_POST['number'];
$gender= $_POST['gender'];
$code_opti1= $_POST['code_opti1'];
$code_opti2= $_POST['code_opti2'];
$code_opti3= $_POST['code_opti3'];
// etc


$to = 'dexayo5005@lexu4g.com'; // change here
$subject = 'Your Service Details'; // change here
$from = 'test@email.com'; // change here
 
// To send HTML mail, the Content-type header must be set
$headers  = 'MIME-Version: 1.0' . "\r\n";
$headers .= 'Content-type: text/html; charset=iso-8859-1' . "\r\n";
 
// Create email headers
$headers .= 'From: '.$from."\r\n".
    'Reply-To: '.$from."\r\n" .
    'X-Mailer: PHP/' . phpversion();
 
// Compose a simple HTML email message
$message = '<html><body>';
$message .= '<h1 style="color:#f40;">Hi '.$full_name.'!</h1>';
$message .= '<p style="color:#080;font-size:18px;">You are register for '.$service.'</p>';
$message .= '<h4 style="color:#080;font-size:22px;">Here is your details</h4>';
$message .= '<p style="color:#080;font-size:18px;">Email: '.$email.'</p>';
$message .= '<p style="color:#080;font-size:18px;">Phone: '.$number.'</p>';
$message .= '<p style="color:#080;font-size:18px;">Gender: '.$gender.'</p>';
$message .= '<p style="color:#080;font-size:18px;">Optimization and Accessibility: '.$code_opti1 . $code_opti2 . $code_opti3.'</p>';
$message .= '</body></html>';
 
// Sending email
if (mail($to, $subject, $message, $headers)) {
    echo 'Your mail has been sent successfully.';
} else {
    echo 'Unable to send email. Please try again.';
}

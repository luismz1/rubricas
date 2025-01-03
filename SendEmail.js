// sendEmail.js
const nodemailer = require('nodemailer');

// Función para enviar el correo con la rúbrica reconstruida
const sendRubricEmail = async (email, rubricJson) => {
  try {
    // Configura el transportador de correo
    let transporter = nodemailer.createTransport({
      service: 'gmail', // O el servicio de correo que utilices
      auth: {
        user: 'sistemarubricassolicitudesinfo@gmail.com', // Cambia esto por tu correo
        pass: 'vsps uyyr auwk xsaf', // Cambia esto por tu contraseña o utiliza un token de aplicación
      },
    });

    // Configuración del mensaje
    let mailOptions = {
      from: 'sistemarubricassolicitudesinfo@gmail.com', // Cambia esto por el correo desde el que envías
      to: email, // Dirección de correo del destinatario
      subject: 'Prouesta Liberada',
      text: 'La propuesta ha sido liberada. A continuación tienes los detalles.',
      html: `
        <h1>Rúbrica Liberada</h1>
        <p>La rúbrica ha sido liberada. A continuación tienes los detalles.</p>
        <pre>${JSON.stringify(rubricJson, null, 2)}</pre>
      `, // Enviamos el JSON como un bloque de texto
    };

    // Envía el correo
    let info = await transporter.sendMail(mailOptions);

    console.log('Correo enviado: %s', info.messageId);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
  }
};

module.exports = sendRubricEmail;

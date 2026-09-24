const nodemailer = require('nodemailer')

const REQUIRED_EMAIL_SETTINGS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'JOBS_EMAIL_TO'
]

const getEmailSettings = () => {
  const missingSettings = REQUIRED_EMAIL_SETTINGS.filter((setting) => !process.env[setting])
  if (missingSettings.length > 0) {
    throw new Error(`Falta configurar: ${missingSettings.join(', ')}`)
  }

  const port = Number(process.env.SMTP_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT no es válido')
  }

  return {
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: process.env.JOBS_EMAIL_TO
  }
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const safeSubjectValue = (value) =>
  String(value)
    .replace(/[\r\n]/g, ' ')
    .trim()

const renderDetailRow = (label, value) => `
  <tr>
    <td style="padding: 0 0 6px; color: #64748b; font-size: 13px; line-height: 20px;">
      ${escapeHtml(label)}
    </td>
  </tr>
  <tr>
    <td style="padding: 0 0 20px; color: #111827; font-size: 16px; font-weight: 600; line-height: 24px;">
      ${escapeHtml(value)}
    </td>
  </tr>
`

const renderJobApplicationHtml = ({ puesto, nombreApellido, email, telefono, mensaje }) => {
  const phoneText = telefono || 'No informado'
  const messageText = mensaje || 'Sin mensaje adicional'

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Nueva postulación</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #eef2f6; font-family: Arial, Helvetica, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #eef2f6;">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 640px; overflow: hidden; border-radius: 12px; background-color: #ffffff; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);">
                <tr>
                  <td style="padding: 28px 36px; background-color: #3d3d3d;">
                    <div style="color: #ffffff; font-size: 30px; font-weight: 800; font-style: italic; letter-spacing: -1px;">
                      INDIANA
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px; background-color: #075f91; background-image: linear-gradient(135deg, #16466f 0%, #0789bd 100%);">
                    <div style="margin-bottom: 10px; color: #d9f3ff; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                      Trabajá con nosotros
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 30px; line-height: 38px;">
                      Nueva postulación recibida
                    </h1>
                    <p style="margin: 12px 0 0; color: #e6f6ff; font-size: 16px; line-height: 24px;">
                      ${escapeHtml(nombreApellido)} se postuló para ${escapeHtml(puesto)}.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${renderDetailRow('Puesto', puesto)}
                      ${renderDetailRow('Nombre y apellido', nombreApellido)}
                      ${renderDetailRow('Email', email)}
                      ${renderDetailRow('Teléfono', phoneText)}
                    </table>
                    <div style="margin-top: 4px; padding: 22px; border-left: 4px solid #0789bd; border-radius: 6px; background-color: #f1f7fb;">
                      <div style="margin-bottom: 8px; color: #16466f; font-size: 13px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase;">
                        Mensaje
                      </div>
                      <div style="color: #334155; font-size: 15px; line-height: 24px;">
                        ${escapeHtml(messageText).replaceAll('\n', '<br>')}
                      </div>
                    </div>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top: 28px;">
                      <tr>
                        <td style="border-radius: 6px; background-color: #1026a8;">
                          <a href="mailto:${encodeURIComponent(email)}" style="display: inline-block; padding: 14px 24px; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none;">
                            Responder al postulante
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 28px 0 0; color: #64748b; font-size: 13px; line-height: 20px;">
                      El CV se encuentra adjunto a este correo.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 36px; border-top: 1px solid #e5e7eb; background-color: #f8fafc; color: #64748b; font-size: 12px; line-height: 18px;">
                    Mensaje generado desde el formulario de postulaciones de Indiana.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

const sendJobApplicationEmail = async ({
  puesto,
  nombreApellido,
  email,
  telefono,
  mensaje,
  cv
}) => {
  const settings = getEmailSettings()
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: settings.auth
  })
  const phoneText = telefono || 'No informado'
  const messageText = mensaje || 'Sin mensaje adicional'

  await transporter.sendMail({
    from: settings.from,
    to: settings.to,
    replyTo: email,
    subject: `Nueva postulación: ${safeSubjectValue(puesto)}`,
    text: [
      `Puesto: ${puesto}`,
      `Nombre y apellido: ${nombreApellido}`,
      `Email: ${email}`,
      `Teléfono: ${phoneText}`,
      '',
      'Mensaje:',
      messageText
    ].join('\n'),
    html: renderJobApplicationHtml({ puesto, nombreApellido, email, telefono, mensaje }),
    attachments: [
      {
        filename: cv.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'),
        content: cv.buffer,
        contentType: cv.mimetype
      }
    ]
  })
}

module.exports = { sendJobApplicationEmail }

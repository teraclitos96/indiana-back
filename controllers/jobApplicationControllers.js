const { sendJobApplicationEmail } = require('../services/jobApplicationMailer')
const AppError = require('../errors/AppError')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const getTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '')

const hasValidDocxSignature = (buffer) => {
  const hasZipSignature =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04

  return (
    hasZipSignature &&
    buffer.includes(Buffer.from('[Content_Types].xml')) &&
    buffer.includes(Buffer.from('word/document.xml'))
  )
}

const hasValidCvSignature = (cv) => {
  if (!cv?.buffer) return false
  if (cv.mimetype === 'application/pdf') {
    return cv.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))
  }
  if (cv.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return hasValidDocxSignature(cv.buffer)
  }
  return false
}

const validateApplication = ({ puesto, nombreApellido, email, telefono, mensaje, cv }) => {
  if (!puesto || !nombreApellido || !email || !cv) {
    return 'Puesto, nombre y apellido, email y CV son obligatorios'
  }
  if (!hasValidCvSignature(cv)) {
    return 'El contenido del CV no corresponde a un PDF o DOCX válido'
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return 'El email no es válido'
  }
  if (puesto.length > 100 || nombreApellido.length > 120) {
    return 'Puesto o nombre y apellido superan el máximo permitido'
  }
  if (telefono.length > 40) {
    return 'El teléfono supera el máximo permitido'
  }
  if (mensaje.length > 2000) {
    return 'El mensaje no puede superar los 2000 caracteres'
  }
  return null
}

exports.createJobApplication = async (req, res) => {
  const application = {
    puesto: getTrimmedString(req.body.puesto),
    nombreApellido: getTrimmedString(req.body.nombreApellido),
    email: getTrimmedString(req.body.email).toLowerCase(),
    telefono: getTrimmedString(req.body.telefono),
    mensaje: getTrimmedString(req.body.mensaje),
    cv: req.file
  }
  const validationError = validateApplication(application)

  if (validationError) {
    throw new AppError(validationError, 400)
  }

  try {
    await sendJobApplicationEmail(application)
    res.status(200).json({
      error: null,
      msg: 'Postulación enviada correctamente'
    })
  } catch (error) {
    console.error('Failed to send job application email:', error.message)
    throw new AppError('No se pudo enviar la postulación. Intentá nuevamente más tarde', 503, {
      cause: error
    })
  }
}

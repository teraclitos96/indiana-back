const multer = require('multer')
const path = require('path')
const AppError = require('../errors/AppError')

const MAX_CV_SIZE_BYTES = 4 * 1024 * 1024
const ALLOWED_CV_TYPES = new Map([
  ['.pdf', 'application/pdf'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
])

const cvFileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase()
  const expectedMimeType = ALLOWED_CV_TYPES.get(extension)

  if (expectedMimeType && file.mimetype === expectedMimeType) {
    return cb(null, true)
  }

  const error = new Error('El CV debe ser un archivo PDF o DOCX')
  error.statusCode = 400
  cb(error)
}

const uploadJobApplication = multer({
  storage: multer.memoryStorage(),
  fileFilter: cvFileFilter,
  limits: {
    fileSize: MAX_CV_SIZE_BYTES,
    files: 1,
    fields: 5,
    parts: 7,
    fieldSize: 10 * 1024
  }
}).single('cv')

const handleJobApplicationUploadErrors = (error, req, res, next) => {
  if (!error) return next()

  if (error instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'El CV no puede superar los 4 MB',
      LIMIT_FILE_COUNT: 'Solo se permite adjuntar un CV',
      LIMIT_FIELD_COUNT: 'El formulario contiene demasiados campos',
      LIMIT_UNEXPECTED_FILE: 'El archivo debe enviarse en el campo cv'
    }
    return next(
      new AppError(messages[error.code] || 'El formulario contiene demasiados datos', 400, {
        cause: error
      })
    )
  }

  if (error.statusCode) {
    return next(new AppError(error.message, error.statusCode, { cause: error }))
  }

  next(error)
}

module.exports = {
  uploadJobApplication,
  handleJobApplicationUploadErrors,
  cvFileFilter
}

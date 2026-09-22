const multer = require('multer')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const AppError = require('../errors/AppError')
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const IMAGE_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.webp']

let folder = ''
if (process.env.NODE_ENV === 'production') {
  folder = '../../../tmp'
} else {
  folder = '../tmp'
}

const uploadFile = () => {
  const storage = multer.diskStorage({
    destination: path.join(__dirname, folder),
    filename: (req, file, cb) => {
      cb(null, uuidv4() + path.extname(file.originalname))
    }
  })

  const fileFilter = (req, file, cb) => {
    const extname = path.extname(file.originalname).toLowerCase()
    if (IMAGE_EXTENSIONS.includes(extname) && IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Incorrect format of the image'))
    }
  }

  const limits = {
    files: 30,
    fileSize: MAX_IMAGE_SIZE_BYTES
  }

  const uploadExtraPhotos = multer({ storage, fileFilter, limits }).array('extraPhotos')

  const uploadCarPhotos = multer({ storage, fileFilter, limits }).fields([
    { name: 'fotoPrincipal', maxCount: 1 },
    { name: 'fotoHover', maxCount: 1 },
    { name: 'fotosExtra' }
  ])

  return { uploadExtraPhotos, uploadCarPhotos }
}

const errFormatImages = 'Incorrect format of the image'

const handleMulterErrors = (err, req, res, next) => {
  if (!err) {
    return next()
  }

  if (err instanceof multer.MulterError) {
    const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    return next(new AppError(err.message, statusCode, { cause: err }))
  }

  if (err.message === errFormatImages) {
    return next(new AppError(err.message, 400, { cause: err }))
  }

  next(err)
}

module.exports = { uploadFile, handleMulterErrors }

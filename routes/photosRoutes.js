const router = require('express').Router()
const tokenValidation = require('../middlewars/auth')
const { photoBodyValidators } = require('../validations/validationPhotos')
const {
  createPhoto,
  getAllPhotos,
  getAllPhotosPrivate,
  getOnePhoto,
  deletePhoto,
  updatePhoto,
  updateCarStatus
} = require('../controllers/photosControllers')
const { uploadFile, handleMulterErrors } = require('../middlewars/imageUpload')
const asyncHandler = require('../middlewars/asyncHandler')
const validateRequest = require('../middlewars/validateRequest')
const { cachePublicGet, noStore } = require('../middlewars/cacheControl')

router.post(
  '/create',
  tokenValidation(process.env.SUPER_USER),
  uploadFile().uploadCarPhotos,
  handleMulterErrors,
  [...photoBodyValidators],
  validateRequest,
  asyncHandler(createPhoto)
)
router.get('/getallphotos', cachePublicGet, asyncHandler(getAllPhotos))
router.get(
  '/getallphotos/private',
  noStore,
  tokenValidation(process.env.SUPER_USER),
  asyncHandler(getAllPhotosPrivate)
)
router.get('/getonephoto/:id', cachePublicGet, asyncHandler(getOnePhoto))
router.put(
  '/updatephoto/:id',

  tokenValidation(process.env.SUPER_USER),
  uploadFile().uploadCarPhotos,
  handleMulterErrors,
  [...photoBodyValidators],
  validateRequest,
  asyncHandler(updatePhoto)
)
router.patch(
  '/updatestatus/:id',
  tokenValidation(process.env.SUPER_USER),
  asyncHandler(updateCarStatus)
)
router.delete(
  '/deletephoto/:id',
  tokenValidation(process.env.SUPER_USER),
  asyncHandler(deletePhoto)
)
module.exports = router

const router = require('express').Router()
const tokenValidation = require('../middlewars/auth')
const { photoBodyValidators } = require('../validations/validationPhotos')
const { createPhoto, getAllPhotos, getOnePhoto, deletePhoto, updatePhoto } = require('../controllers/photosControllers')
const { uploadFile, handleMulterErrors } = require('../middlewars/multer')
const asyncHandler = require('../middlewars/asyncHandler')
const validateRequest = require('../middlewars/validateRequest')

router.post(
  '/create',
  tokenValidation(process.env.SUPER_USER),
  uploadFile().uploadCarPhotos,
  handleMulterErrors,
  [
    ...photoBodyValidators
  ],
  validateRequest,
  asyncHandler(createPhoto))
router.get(
  '/getallphotos',
  asyncHandler(getAllPhotos))
router.get(
  '/getonephoto/:id',
  asyncHandler(getOnePhoto))
router.put(
  '/updatephoto/:id',

  tokenValidation(process.env.SUPER_USER),
  uploadFile().uploadCarPhotos,
  handleMulterErrors,
  [
    ...photoBodyValidators
  ],
  validateRequest,
  asyncHandler(updatePhoto))
router.delete(
  '/deletephoto/:id',
  tokenValidation(process.env.SUPER_USER),
  asyncHandler(deletePhoto))
module.exports = router

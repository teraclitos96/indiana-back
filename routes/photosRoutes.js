const router = require('express').Router()
const tokenValidation = require('../middlewars/auth')
const { photoBodyValidators } = require('../validations/validationPhotos')
const { createPhoto, getAllPhotos, getOnePhoto, deletePhoto, updatePhoto, updateCarStatus } = require('../controllers/photosControllers')
const { uploadFile, handleMulterErrors } = require('../middlewars/multer')

router.post(
  '/create',
  tokenValidation(process.env.SUPER_USER),
  uploadFile().uploadCarPhotos,
  handleMulterErrors,
  [
    ...photoBodyValidators
  ],
  createPhoto)
router.get(
  '/getallphotos',
  getAllPhotos)
router.get(
  '/getonephoto/:id',
  getOnePhoto)
router.put(
  '/updatephoto/:id',

  tokenValidation(process.env.SUPER_USER),
  uploadFile().uploadCarPhotos,
  handleMulterErrors,
  [
    ...photoBodyValidators
  ],
  updatePhoto)
router.patch(
  '/updatestatus/:id',
  tokenValidation(process.env.SUPER_USER),
  updateCarStatus)
router.delete(
  '/deletephoto/:id',
  tokenValidation(process.env.SUPER_USER),
  deletePhoto)
module.exports = router

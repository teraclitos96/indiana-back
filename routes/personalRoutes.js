const router = require('express').Router()
const tokenValidation = require('../middlewars/auth')
const { createPersonalInformation, getPersonalInformation, updatePersonalInformation } = require('../controllers/personalControllers')
const { validateEmptyFields, validateLengthFields } = require('../validations/validationPersonal')
const { uploadFile, handleMulterErrors } = require('../middlewars/multer')
router.post(
  '/create',
  tokenValidation(process.env.SUPER_USER),
  uploadFile().uploadOneImage,
  handleMulterErrors,
  [
    ...validateEmptyFields(),
    ...validateLengthFields()
  ],
  createPersonalInformation)
router.get(
  '/getpersonalinformation',
  getPersonalInformation)
router.put(
  '/updatepersonalinformation/:id',
  tokenValidation(process.env.SUPER_USER), uploadFile().uploadOneImage,
  handleMulterErrors,
  [
    ...validateEmptyFields(),
    ...validateLengthFields()
  ],
  updatePersonalInformation)
module.exports = router

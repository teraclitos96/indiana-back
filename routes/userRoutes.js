const { createUser, loginUser, logoutUser } = require('../controllers/userControllers')
const { validateEmptyFields, validateLengthFields } = require('../validations/validationUser')
const tokenValidation = require('../middlewars/auth')
const { createRateLimit } = require('../middlewars/rateLimit')
const asyncHandler = require('../middlewars/asyncHandler')
const validateRequest = require('../middlewars/validateRequest')
const router = require('express').Router()
const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
  keyGenerator: (req) => req.ip
})

router.post(
  '/createuser',
  [
    ...validateEmptyFields(),
    ...validateLengthFields()
  ],
  validateRequest,
  asyncHandler(createUser))
router.post(
  '/loginuser',
  loginRateLimit,
  [
    ...validateEmptyFields(),
    ...validateLengthFields()
  ],
  validateRequest,
  asyncHandler(loginUser))
router.post('/logoutuser', tokenValidation(process.env.SUPER_USER), asyncHandler(logoutUser))
module.exports = router

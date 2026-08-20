const { createUser, loginUser, logoutUser } = require('../controllers/userControllers')
const { validateEmptyFields, validateLengthFields } = require('../validations/validationUser')
const tokenValidation = require('../middlewars/auth')
const { createRateLimit } = require('../middlewars/rateLimit')
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
  createUser)
router.post(
  '/loginuser',
  loginRateLimit,
  [
    ...validateEmptyFields(),
    ...validateLengthFields()
  ],
  loginUser)
router.post('/logoutuser', tokenValidation(process.env.SUPER_USER), logoutUser)
module.exports = router

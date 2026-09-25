const router = require('express').Router()
const { createJobApplication } = require('../controllers/jobApplicationControllers')
const {
  uploadJobApplication,
  handleJobApplicationUploadErrors
} = require('../middlewars/jobApplicationUpload')
const { createRateLimit } = require('../middlewars/rateLimit')
const asyncHandler = require('../middlewars/asyncHandler')
const { noStore } = require('../middlewars/cacheControl')

const applicationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 5,
  message: 'Demasiadas postulaciones. Intentá nuevamente más tarde'
})

router.post(
  '/apply',
  noStore,
  applicationRateLimit,
  uploadJobApplication,
  handleJobApplicationUploadErrors,
  asyncHandler(createJobApplication)
)

module.exports = router

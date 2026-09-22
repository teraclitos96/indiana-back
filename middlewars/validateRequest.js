const { validationResult } = require('express-validator')
const fs = require('fs/promises')
const AppError = require('../errors/AppError')

const getUploadedFiles = (req) => {
  if (req.file) return [req.file]
  if (!req.files) return []
  if (Array.isArray(req.files)) return req.files
  return Object.values(req.files).flat()
}

const removeTemporaryFiles = async (req) => {
  const paths = getUploadedFiles(req)
    .map((file) => file.path)
    .filter(Boolean)

  await Promise.allSettled(paths.map((filePath) => fs.unlink(filePath)))
}

const validateRequest = async (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    await removeTemporaryFiles(req)
    return next(new AppError(errors.array()[0].msg, 400))
  }

  next()
}

module.exports = validateRequest

const jwt = require('jsonwebtoken')
const TokenRevokeModel = require('../models/tokenRevokeSchema')
const AppError = require('../errors/AppError')
const asyncHandler = require('./asyncHandler')

const tokenValidation = (roleAuth) =>
  asyncHandler(async (req, res, next) => {
    let tokenValue = ''

    if (
      req.header('authorization') &&
      req.header('authorization').toLowerCase().startsWith('bearer')
    ) {
      tokenValue = req.header('authorization').split(' ')[1]
    }

    const verify = tokenValue && jwt.verify(tokenValue, process.env.JWT_SECRET)

    if (!tokenValue || !verify.id) {
      throw new AppError('token missing or invalid', 401)
    }
    const { role, id } = verify

    const isTokenRevoke = await TokenRevokeModel.findOne({ tokenRevoke: tokenValue })

    if (isTokenRevoke) {
      throw new AppError('token revoked', 401)
    }
    if (role !== roleAuth) {
      throw new AppError('you have no authorization', 403)
    }

    res.locals.id = id
    res.locals.token = tokenValue

    next()
  })
module.exports = tokenValidation

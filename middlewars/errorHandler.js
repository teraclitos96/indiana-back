const AppError = require('../errors/AppError')
const jwt = require('jsonwebtoken')
const { setPrivateNoStore } = require('./cacheControl')

const normalizeError = (error) => {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return new AppError('JSON inválido', 400, { cause: error })
  }

  if (error.name === 'CastError') {
    return new AppError('ID inválido', 400, { cause: error })
  }

  if (error.name === 'ValidationError') {
    return new AppError('Los datos enviados no son válidos', 400, { cause: error })
  }

  if (error.code === 11000) {
    return new AppError('El recurso ya existe', 409, { cause: error })
  }

  if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
    return new AppError('token missing or invalid', 401, { cause: error })
  }

  if (error.name === 'MongooseServerSelectionError') {
    return new AppError('Base de datos temporalmente no disponible', 503, { cause: error })
  }

  return error
}

const notFoundHandler = (req, res, next) => {
  next(new AppError('Ruta no encontrada', 404))
}

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  setPrivateNoStore(res)
  const normalizedError = normalizeError(error)
  const statusCode = normalizedError.statusCode || 500

  if (statusCode >= 500 && !normalizedError.isOperational) {
    console.error('Unhandled request error:', error)
  }

  res.status(statusCode).json({
    error: true,
    msg: normalizedError.isOperational ? normalizedError.message : 'Error interno del servidor'
  })
}

module.exports = {
  errorHandler,
  notFoundHandler
}

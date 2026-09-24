class AppError extends Error {
  constructor(message, statusCode, options = {}) {
    super(message, options)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.isOperational = true
  }
}

module.exports = AppError

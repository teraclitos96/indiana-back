const createRateLimit = ({
  windowMs = 15 * 60 * 1000,
  maxAttempts = 10,
  keyGenerator = (req) => req.ip
} = {}) => {
  const loginAttempts = new Map()

  return (req, res, next) => {
    const key = keyGenerator(req)
    const now = Date.now()
    const current = loginAttempts.get(key)

    if (!current || current.resetAt <= now) {
      loginAttempts.set(key, {
        count: 1,
        resetAt: now + windowMs
      })
      return next()
    }

    if (current.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000)
      res.set('Retry-After', String(retryAfterSeconds))
      return res.status(429).json({
        error: true,
        msg: 'too many login attempts, try again later'
      })
    }

    current.count += 1
    loginAttempts.set(key, current)
    next()
  }
}

module.exports = { createRateLimit }

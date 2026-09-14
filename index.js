const express = require('express')
const app = express()
const morgan = require('morgan')
const cors = require('cors')

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const connectDatabase = require('./dataBase')
const PORT = process.env.PORT || 3001
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('ALLOWED_ORIGINS must be set in production')
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(null, false)
  }
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))
app.use(cors(corsOptions))

app.use(async (req, res, next) => {
  try {
    await connectDatabase()
    next()
  } catch (error) {
    console.error('Error connecting to MongoDB:', error)
    res.status(503).json({
      error: true,
      msg: 'Database temporarily unavailable'
    })
  }
})

const routes = require('./routes')

app.use('/', routes)

const startServer = async () => {
  try {
    await connectDatabase()
    app.listen(PORT, () => {
      console.log('back ejecutandose en el puerto: ', PORT)
      console.log('enviroment:', process.env.NODE_ENV)
    })
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error)
    process.exitCode = 1
  }
}

if (require.main === module) {
  startServer()
}

module.exports = app

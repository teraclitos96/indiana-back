const express = require('express')
const app = express()
const morgan = require('morgan')
const cors = require('cors')

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
require('./dataBase')
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

const routes = require('./routes')

app.use('/', routes)

app.listen(PORT, () => {
  console.log('back ejecutandose en el puerto: ', PORT)
  console.log('enviroment:', process.env.NODE_ENV)
})

const mongoose = require('mongoose')

const connectionCache = globalThis.indianaMongoConnection || {
  promise: null
}

globalThis.indianaMongoConnection = connectionCache

const connectDatabase = async () => {
  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is not defined')
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  if (!connectionCache.promise) {
    connectionCache.promise = mongoose.connect(process.env.MONGO_URL, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10000
    })
  }

  try {
    await connectionCache.promise
    return mongoose
  } finally {
    connectionCache.promise = null
  }
}

module.exports = connectDatabase

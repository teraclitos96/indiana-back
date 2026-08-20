const mongoose = require('mongoose')
const dotenv = require('dotenv')

const CONFIRMATION = 'RESET_DEV_CAR_PHOTOS'
const PHOTO_FIELDS = ['fotoPrincipal', 'fotoHover', 'fotosExtra']

const parseArguments = (args) => ({
  execute: args.includes('--execute'),
  includeCloudinary: args.includes('--include-cloudinary'),
  confirmation: args
    .find((argument) => argument.startsWith('--confirm='))
    ?.split('=')
    .slice(1)
    .join('=')
})

const getMongoDatabase = (mongoUrl) => {
  if (!mongoUrl) return ''
  const path = mongoUrl.replace(/^mongodb(?:\+srv)?:\/\//, '').split('/')[1]
  return decodeURIComponent((path || '').split('?')[0])
}

const assertDevelopmentTarget = ({ nodeEnv, mongoUrl }) => {
  if (nodeEnv !== 'development') {
    throw new Error(`Entorno no permitido: NODE_ENV debe ser development (actual: ${nodeEnv || 'sin definir'})`)
  }

  const database = getMongoDatabase(mongoUrl)
  if (!database.toLowerCase().endsWith('dev')) {
    throw new Error('Base de datos no permitida: el nombre definido en MONGO_URL debe terminar en "dev"')
  }
}

const assertResetAllowed = (allowDatabaseReset) => {
  if (allowDatabaseReset !== 'true') {
    throw new Error('Reset no autorizado: definí ALLOW_DATABASE_RESET=true en el entorno local')
  }
}

const collectPublicIds = (cars) => [
  ...new Set(
    cars.flatMap((car) => {
      return PHOTO_FIELDS.flatMap((field) => {
        const photos = Array.isArray(car[field]) ? car[field] : [car[field]]
        return photos.map((photo) => photo?.public_id).filter(Boolean)
      })
    })
  )
]

const assertSafeCloudinaryIds = (publicIds) => {
  const unsafeId = publicIds.find(
    (publicId) => !publicId.startsWith('indiana/')
  )
  if (unsafeId) {
    throw new Error(
      `Se canceló el borrado: el public_id "${unsafeId}" está fuera de la carpeta indiana/`
    )
  }
}

const deleteFromCloudinary = async (publicIds) => {
  if (publicIds.length === 0) return

  const { cloudinary } = require('../middlewars/cloudinary')
  for (const publicId of publicIds) {
    const result = await cloudinary.v2.uploader.destroy(publicId, {
      invalidate: true
    })
    if (!['ok', 'not found'].includes(result.result)) {
      throw new Error(
        `Cloudinary no pudo borrar "${publicId}": ${result.result}`
      )
    }
  }
}

const run = async () => {
  dotenv.config()
  const options = parseArguments(process.argv.slice(2))
  const mongoUrl = process.env.MONGO_URL

  assertResetAllowed(process.env.ALLOW_DATABASE_RESET)
  assertDevelopmentTarget({ nodeEnv: process.env.NODE_ENV, mongoUrl })

  if (options.includeCloudinary && !options.execute) {
    throw new Error(
      '--include-cloudinary solo puede usarse junto con --execute'
    )
  }
  if (options.execute && options.confirmation !== CONFIRMATION) {
    throw new Error(`Para ejecutar el reset agregá --confirm=${CONFIRMATION}`)
  }
  if (
    options.includeCloudinary &&
    process.env.ALLOW_CLOUDINARY_RESET !== 'true'
  ) {
    throw new Error(
      'Para borrar archivos remotos definí ALLOW_CLOUDINARY_RESET=true explícitamente'
    )
  }

  await mongoose.connect(mongoUrl)
  const PhotosModel = require('../models/photosSchema')
  const cars = await PhotosModel.find({}, PHOTO_FIELDS.join(' ')).lean()
  const publicIds = collectPublicIds(cars)
  const databaseName = mongoose.connection.name

  console.log('Entorno: development')
  console.log(`Base: ${databaseName}`)
  console.log(`Autos a eliminar: ${cars.length}`)
  console.log(`Referencias de Cloudinary encontradas: ${publicIds.length}`)

  if (!options.execute) {
    console.log(
      `Vista previa: no se modificó nada. Para ejecutar agregá --execute --confirm=${CONFIRMATION}`
    )
    return
  }

  if (options.includeCloudinary) {
    assertSafeCloudinaryIds(publicIds)
    await deleteFromCloudinary(publicIds)
    console.log(`Archivos eliminados de Cloudinary: ${publicIds.length}`)
  } else if (publicIds.length > 0) {
    console.warn(
      'Las imágenes de Cloudinary se conservaron. Usá --include-cloudinary solo si también querés eliminarlas.'
    )
  }

  const result = await PhotosModel.deleteMany({})
  console.log(`Autos eliminados de MongoDB: ${result.deletedCount}`)
}

if (require.main === module) {
  run()
    .catch((error) => {
      console.error(`Reset cancelado: ${error.message}`)
      process.exitCode = 1
    })
    .finally(async () => {
      await mongoose.disconnect()
    })
}

module.exports = {
  assertDevelopmentTarget,
  assertResetAllowed,
  collectPublicIds,
  getMongoDatabase,
  parseArguments
}

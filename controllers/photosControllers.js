const PhotosModel = require('../models/photosSchema')
const { deleteFilesFromCloudinary } = require('../middlewars/cloudinary')
const { deleteFiles } = require('../services/functionsPhotos')
// const { validationResult } = require('express-validator')
const { newArrayPhotosCloudinaryFunction } = require('../middlewars/cloudinary')

const flattenFiles = (filesObject) => {
  return Object.values(filesObject).flat()
}

// Helpers
const HIGHLIGHTED_PHOTOS = [
  'fotoPrincipal',
  'fotoHover'
]

const ALL_PHOTOS = [
  ...HIGHLIGHTED_PHOTOS,
  'fotosExtra'
]

const DISCOUNT_TYPES = {
  PERCENTAGE: 'PORCENTAJE',
  FIXED_AMOUNT: 'MONTO_FIJO'
}

const createValidationError = (message) => {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

const parseDescuento = (descuento) => {
  if (descuento == null || descuento === '') return {}

  // Backward compatibility: legacy numeric descuento is interpreted as percentage.
  if (typeof descuento === 'number') {
    return { tipo: DISCOUNT_TYPES.PERCENTAGE, valor: descuento }
  }

  if (typeof descuento !== 'string') return descuento

  let parsed
  try {
    parsed = JSON.parse(descuento)
  } catch {
    throw createValidationError('El descuento debe ser un JSON valido')
  }

  if (typeof parsed === 'number') {
    return { tipo: DISCOUNT_TYPES.PERCENTAGE, valor: parsed }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw createValidationError('El descuento debe ser un objeto con { tipo, valor }')
  }

  return parsed
}

const MAIN_PROPERTIES = [
  ...HIGHLIGHTED_PHOTOS,
  'modelo',
  'marca',
  'anio',
  'precio',
  'caja',
  'kilometraje',
  'precioOferta',
  'descuento',
  'oferta',
  'estado'
]

const extractPublicIdsFromCarDoc = (carDoc) => {
  if (!carDoc) return []
  return ALL_PHOTOS
    .map(k => {
      if (Array.isArray(carDoc[k])) {
        return carDoc[k].map(photo => photo.public_id)
      } else if (carDoc[k] && carDoc[k].public_id) {
        return carDoc[k].public_id
      }
      return null
    })
    .filter(Boolean).flat()
}

const calcularPrecioOferta = ({ precio, descuento = {} }) => {
  const precioTotal = Number(precio)
  if (!Number.isFinite(precioTotal) || precioTotal <= 0) {
    throw createValidationError('El precio debe ser un número válido mayor a 0')
  }

  const valorDescuento = Number(descuento.valor ?? 0)
  if (!Number.isFinite(valorDescuento) || valorDescuento < 0) {
    throw createValidationError('El valor del descuento debe ser un número válido mayor o igual a 0')
  }

  const tipoDescuento = descuento.tipo || DISCOUNT_TYPES.FIXED_AMOUNT

  if (!Object.values(DISCOUNT_TYPES).includes(tipoDescuento)) {
    throw createValidationError('El tipo de descuento debe ser PORCENTAJE o MONTO_FIJO')
  }

  if (tipoDescuento === DISCOUNT_TYPES.PERCENTAGE && valorDescuento > 100) {
    throw createValidationError('El descuento en porcentaje no puede ser mayor a 100')
  }

  const precioOferta = tipoDescuento === DISCOUNT_TYPES.PERCENTAGE
    ? precioTotal - precioTotal * (valorDescuento / 100)
    : precioTotal - valorDescuento

  if (precioOferta <= 0) {
    throw createValidationError('El descuento no puede ser mayor o igual al precio')
  }

  return precioOferta
}

exports.createPhoto = async (req, res) => {
  const {
    marca, modelo, version, precio, caja, segmento, cilindrada, color,
    anio, combustible, kilometraje, traccion, HP, descuento, oferta
  } = req.body
  const files = req.files || {}
  const filesArray = flattenFiles(files)
  const missingPhotos = HIGHLIGHTED_PHOTOS.filter(field => !files[field] || files[field].length === 0)
  if (missingPhotos.length > 0) {
    deleteFiles(filesArray)
    return res.status(400).json({
      error: true,
      msg: `Faltan las siguientes fotos obligatorias: ${missingPhotos.join(', ')}`
    })
  }

  const carExists = await PhotosModel.findOne(
    { marca, modelo, version, kilometraje },
    {},
    { collation: { locale: 'es', strength: 1 } }
  )
  if (carExists) {
    deleteFiles(filesArray)
    return res.status(400).json({ error: true, msg: 'Este auto ya está registrado' })
  }

  let cloudinaryResults
  try {
    const parsedDescuento = parseDescuento(descuento)
    const precioOferta = calcularPrecioOferta({ precio, descuento: parsedDescuento })
    cloudinaryResults = await newArrayPhotosCloudinaryFunction(filesArray)

    // Mismo mapeo que en create original: usar fieldName para las claves
    const carPhotos = cloudinaryResults.reduce((acc, photo) => {
      const key = photo.fieldName // <-- congruente con create
      if (!acc[key]) {
        acc[key] = {
          url: photo.url,
          public_id: photo.public_id,
          original_name: photo.original_name
        }
      } else {
        acc[key] = [...(Array.isArray(acc[key]) ? acc[key] : [acc[key]]), {
          url: photo.url,
          public_id: photo.public_id,
          original_name: photo.original_name
        }]
      }
      return acc
    }, {})

    const newCar = new PhotosModel({
      ...carPhotos,
      marca,
      modelo,
      version,
      precio,
      caja,
      segmento,
      cilindrada,
      color,
      anio,
      combustible,
      kilometraje,
      traccion,
      HP,
      descuento: parsedDescuento,
      precioOferta,
      oferta
    })

    await newCar.save()
    res.status(201).json({ error: null, msg: 'Auto creado correctamente' })
  } catch (error) {
    if (cloudinaryResults && cloudinaryResults.length) {
      // revierte subidas a Cloudinary si falló la persistencia
      const arrayOfPublicIds = cloudinaryResults.map(p => Array.isArray(p) ? p.map(i => i.public_id) : p.public_id).flat()
      await deleteFilesFromCloudinary(arrayOfPublicIds)
    }
    res.status(error.statusCode || 500).json({ error: true, msg: error.message })
  } finally {
    deleteFiles(filesArray)
  }
}

exports.updatePhoto = async (req, res) => {
  // Debe ser congruente con create: exigir las 5 fotos y el mismo mapeo
  const {
    marca, modelo, version, precio, caja, segmento, cilindrada, color,
    anio, combustible, kilometraje, traccion, HP, descuento, oferta, eliminadas = []
  } = req.body

  const files = req.files || {}
  const filesArray = flattenFiles(files)
  let carPhotos = {}
  const photosPublicIdsToDelete = [...eliminadas]

  const missingPhotos = HIGHLIGHTED_PHOTOS.filter(field => !files[field])

  const newPhotos = Object.keys(files).filter(k => k !== 'fotosExtra')

  let oldPhoto = null
  let newUploads = null

  try {
    oldPhoto = await PhotosModel.findById(req.params.id)
    if (!oldPhoto) {
      deleteFiles(filesArray)
      return res.status(404).json({ error: true, msg: 'Auto no encontrado' })
    }

    // Validar unicidad si cambia marca+modelo+versión
    const carExists = await PhotosModel.findOne(
      { marca, modelo, version, kilometraje },
      {},
      { collation: { locale: 'es', strength: 1 } }
    )

    const isSameCar =
      (marca + modelo + version)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() ===
      (oldPhoto.marca + oldPhoto.modelo + oldPhoto.version)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

    if (!isSameCar && carExists) {
      deleteFiles(filesArray)
      return res.status(400).json({ error: true, msg: 'Este auto ya está registrado' })
    }

    const parsedDescuento = parseDescuento(descuento)
    const precioOferta = calcularPrecioOferta({ precio, descuento: parsedDescuento })

    // Subir nuevas fotos (congruente con create)
    if (filesArray.length > 0) {
      newUploads = await newArrayPhotosCloudinaryFunction(filesArray)
      carPhotos = newUploads.reduce((acc, photo) => {
        const key = photo.fieldName
        if (!acc[key]) {
          acc[key] = {
            url: photo.url,
            public_id: photo.public_id,
            original_name: photo.original_name
          }
        } else {
          acc[key] = [...(Array.isArray(acc[key]) ? acc[key] : [acc[key]]), {
            url: photo.url,
            public_id: photo.public_id,
            original_name: photo.original_name
          }]
        }
        return acc
      }, {})
    }

    if (missingPhotos.length > 0) {
      missingPhotos.forEach(field => {
        carPhotos[field] = oldPhoto[field]
      })
    }
    if (newPhotos.length > 0) {
      photosPublicIdsToDelete.push(...newPhotos.map(f => oldPhoto[f]?.public_id).filter(Boolean))
    }
    const oldPhotosExtraNotDeleted = oldPhoto.fotosExtra
      ? oldPhoto.fotosExtra.filter(photo => !eliminadas.includes(photo.public_id))
      : []
    if (!carPhotos.fotosExtra) {
      carPhotos.fotosExtra = []
    }
    if (!Array.isArray(carPhotos.fotosExtra)) {
      carPhotos.fotosExtra = [carPhotos.fotosExtra]
    }
    if (oldPhotosExtraNotDeleted.length > 0) {
      carPhotos.fotosExtra = [
        ...oldPhotosExtraNotDeleted,
        ...carPhotos.fotosExtra || []
      ]
    }

    // Actualizar documento
    const updated = await PhotosModel.findByIdAndUpdate(
      req.params.id,
      {
        ...carPhotos,
        marca,
        modelo,
        version,
        precio,
        caja,
        segmento,
        cilindrada,
        color,
        anio,
        combustible,
        kilometraje,
        traccion,
        HP,
        descuento: parsedDescuento,
        precioOferta,
        oferta
      },
      { new: true }
    )

    // Borrar fotos antiguas de Cloudinary solo si el update fue OK
    if (photosPublicIdsToDelete.length > 0) {
      await deleteFilesFromCloudinary(photosPublicIdsToDelete)
    }

    res.status(200).json({ error: null, msg: 'Auto actualizado correctamente', updated })
  } catch (error) {
    // Si falló luego de subir nuevas, borra nuevas para no dejar basura
    if (newUploads && newUploads.length) {
      await deleteFilesFromCloudinary(newUploads.map(p => p.public_id))
    }
    res.status(error.statusCode || 500).json({ error: true, msg: error.message })
  } finally {
    deleteFiles(filesArray)
  }
}

exports.getAllPhotos = async (req, res) => {
  const { cursor = 1, limit = 8 } = req.query
  const parsedCursor = parseInt(cursor, 10) || 1
  const parsedLimit = parseInt(limit, 10) || 8

  const parseArray = (v) => {
    if (!v) return []
    return String(v).split(',').map(s => s.trim()).filter(Boolean)
  }

  const parseRange = (v) => {
    if (!v) return null
    const parts = String(v).split(',').map(s => s.trim())
    if (parts.length >= 2) {
      const min = Number(parts[0])
      const max = Number(parts[1])
      if (!isNaN(min) && !isNaN(max)) return [min, max]
    }
    return null
  }

  try {
    // Filtros desde query
    const marcas = parseArray(req.query.marca) // ej: ?marca=Toyota,Ford
    const cajas = parseArray(req.query.caja) // ej: ?caja=Manual,Automática
    const combustibles = parseArray(req.query.combustible) // ej: ?combustible=Nafta,Gasoil
    const kmRange = parseRange(req.query.km) // ej: ?km=0,50000
    const precioRange = parseRange(req.query.precio) // ej: ?precio=2000000,5000000
    const anioRange = parseRange(req.query.anio) // ej: ?anio=2015,2024

    console.log({ marcas, cajas, combustibles, kmRange, precioRange, anioRange })

    // Construir filtro dinámico
    const filter = {
      $or: [
        {
          estado: {
            $in: [
              PhotosModel.CAR_STATUSES.ACTIVE,
              PhotosModel.CAR_STATUSES.SOLD
            ]
          }
        },
        { estado: { $exists: false } }
      ]
    }
    if (marcas.length) filter.marca = { $in: marcas }
    if (cajas.length) filter.caja = { $in: cajas }
    if (combustibles.length) filter.combustible = { $in: combustibles }
    if (kmRange) {
      const [minKm, maxKm] = kmRange
      filter.kilometraje = { $gte: minKm, $lte: maxKm }
    }
    if (precioRange) {
      const [minP, maxP] = precioRange
      filter.precio = { $gte: minP, $lte: maxP }
    }
    if (anioRange) {
      const [minY, maxY] = anioRange
      filter.anio = { $gte: minY, $lte: maxY }
    }

    const allPhotos = await PhotosModel.paginate(
      filter,
      {
        page: parsedCursor,
        limit: parsedLimit,
        sort: { createdAt: -1 },
        collation: { locale: 'es', strength: 1 },
        lean: true, // devuelve objetos JS planos, no documentos de mongoose
        select: `${MAIN_PROPERTIES.join(' ')}`
      }
    )

    allPhotos.docs = allPhotos.docs.map(doc => {
      doc.estado = doc.estado || PhotosModel.CAR_STATUSES.ACTIVE
      return {
        _id: doc._id,
        ...MAIN_PROPERTIES.reduce((acc, prop) => {
          acc[prop] = doc[prop]
          return acc
        }, {})
      }
    })

    res.status(200).json({ error: null, allPhotos })
  } catch (error) {
    res.status(500).json({ error: true, msg: error.message })
  }
}
exports.getOnePhoto = async (req, res) => {
  try {
    const getOnePhoto = await PhotosModel.findById(req.params.id.trim())
    res.status(200).json({ error: null, getOnePhoto })
  } catch (error) {
    res.status(500).json({ error: true, msg: error.message })
  }
}

exports.updateCarStatus = async (req, res) => {
  const estado = typeof req.body.estado === 'string'
    ? req.body.estado.trim().toUpperCase()
    : ''
  const validStatuses = Object.values(PhotosModel.CAR_STATUSES)

  if (!validStatuses.includes(estado)) {
    return res.status(400).json({
      error: true,
      msg: `El estado debe ser uno de: ${validStatuses.join(', ')}`
    })
  }

  try {
    const updated = await PhotosModel.findByIdAndUpdate(
      req.params.id.trim(),
      { $set: { estado } },
      { new: true, runValidators: true }
    ).select('_id estado')

    if (!updated) {
      return res.status(404).json({ error: true, msg: 'Auto no encontrado' })
    }

    res.status(200).json({
      error: null,
      msg: 'Estado del auto actualizado correctamente',
      updated
    })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: true, msg: 'ID de auto inválido' })
    }
    res.status(500).json({ error: true, msg: error.message })
  }
}

exports.deletePhoto = async (req, res) => {
  try {
    const photoDeleted = await PhotosModel.findByIdAndDelete(req.params.id)
    if (!photoDeleted) {
      return res.status(404).json({ error: true, msg: 'Auto no encontrado' })
    }

    // Borrar fotos de Cloudinary del documento eliminado
    const publicIds = extractPublicIdsFromCarDoc(photoDeleted)
    if (publicIds.length) {
      await deleteFilesFromCloudinary(publicIds)
    }

    res.status(200).json({ error: null, msg: 'Auto eliminado correctamente' })
  } catch (error) {
    res.status(500).json({ error: true, msg: error.message })
  }
}

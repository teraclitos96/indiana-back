const { body } = require('express-validator')

const photoBodyValidators = [
  body('marca').isString().trim().notEmpty(),
  body('modelo').isString().trim().notEmpty(),
  body('precio').isNumeric(),
  body('caja').isString().trim().notEmpty(),
  body('anio').isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('kilometraje').isInt({ min: 0 })
]
module.exports = { photoBodyValidators }

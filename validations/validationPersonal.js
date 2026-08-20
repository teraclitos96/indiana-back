const { body } = require('express-validator')

const personalFields = ['profileName', 'profileDescription']

const validateEmptyFields = () => {
  return personalFields.map((field) => body(field).trim().notEmpty().withMessage(`field ${field} empty`))
}
const validateLengthFields = () => {
  return personalFields.map((field) => {
    if (field !== 'profileDescription') {
      return body(field).trim().isLength({ min: 5, max: 20 }).withMessage(`the field ${field} must have from 5 to 20 characters`)
    } else {
      return body(field).trim().isLength({ min: 8, max: 1000 }).withMessage(`the field ${field} must have at least 8 characters`)
    }
  })
}
module.exports = { validateEmptyFields, validateLengthFields }

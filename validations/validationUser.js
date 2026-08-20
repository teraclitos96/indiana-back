const { body } = require('express-validator')

const userFields = ['username', 'password']

const validateEmptyFields = () => {
  return userFields.map((field) => body(field).trim().notEmpty().withMessage(`field ${field} empty`))
}
const validateLengthFields = () => {
  return userFields.map((field) => {
    return body(field).trim().isLength({ min: 8, max: 20 }).withMessage(`the field ${field} must have from 8 to 20 characters`)
  })
}
module.exports = { validateEmptyFields, validateLengthFields }

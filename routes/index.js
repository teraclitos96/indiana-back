const express = require('express')
const router = express.Router()
const userRoutes = require('./userRoutes')
const photosRoutes = require('./photosRoutes')

router.use('/photos', photosRoutes)
router.use('/user', userRoutes)

module.exports = router

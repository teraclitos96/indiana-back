const express = require('express')
const router = express.Router()
const userRoutes = require('./userRoutes')
const photosRoutes = require('./photosRoutes')
const jobApplicationRoutes = require('./jobApplicationRoutes')

router.use('/photos', photosRoutes)
router.use('/user', userRoutes)
router.use('/jobs', jobApplicationRoutes)

module.exports = router

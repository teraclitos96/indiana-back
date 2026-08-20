const router = require('express').Router()
const { createOrder, captureOrder, cancelOrder } = require('../controllers/paymentControllers')

router.post('/createorder', createOrder)
router.post('/captureorder', captureOrder)
router.get('/cancelorder', cancelOrder)
module.exports = router

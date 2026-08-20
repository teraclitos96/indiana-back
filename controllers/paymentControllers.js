const axios = require('axios')
const PaymentModel = require('../models/paymentSchema')
const { PAYPAL_CLIENT_ID, PAYPAL_SECRET_KEY, PAYPAL_API } = process.env
const generateAccessToken = async () => {
  try {
    console.log({ })
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET_KEY) {
      throw new Error('MISSING_API_CREDENTIALS')
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ':' + PAYPAL_SECRET_KEY
    ).toString('base64')
    const response = await axios.post(
        `${PAYPAL_API}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })

    return response.data.access_token
  } catch (error) {
    console.error('Failed to generate Access Token:', error)
  }
}

exports.createOrder = async (req, res) => {
  const accessToken = await generateAccessToken()
  const total = req.body.cart.reduce((sum, current) => { return sum + current.price * current.quantity }, 0)
  const itemsDetail = req.body.cart.map(item => {
    return {
      name: item.artistName,
      unit_amount: {
        currency_code: 'USD',
        value: item.price
      },
      quantity: item.quantity
    }
  })

  const url = `${PAYPAL_API}/v2/checkout/orders`

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD',
          value: total,
          breakdown: {
            item_total: {
              currency_code: 'USD',
              value: total
            }
          }
        },
        items: itemsDetail
      }
    ]
  }
  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  try {
    res.status(response.status).json({ id: response.data.id })
  } catch (error) {
    res.status(500).json({ error: true, msg: 'Failed to create order.' })
  }
}
exports.captureOrder = async (req, res) => {
  try {
    const accessToken = await generateAccessToken()
    const { orderID } = req.body

    const url = `${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`
    const response = await axios.post(url, null, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (response.status === 201) {
      const { id, status, payment_source: { paypal: { email_address, account_id } } } = response.data
      const { amount: { currency_code, value }, create_time } = response.data?.purchase_units?.[0]?.payments?.captures?.[0]
      const paymentMethod = Object.keys(response.data?.payment_source)[0]

      const newPayment = new PaymentModel({
        transactionId: id,
        status,
        userId: account_id,
        emailAddress: email_address,
        paymentAmount: value,
        currency: currency_code,
        paymentDate: create_time,
        paymentMethod
      })

      await newPayment.save()

      res.status(response.status).json({ error: null, msg: 'Purchase completed successfully' })
    } else {
      res.status(response.status).json({ error: true, msg: 'Failed to capture order.' })
    }
  } catch (error) {
    console.error('Error capturing order:', error)
    res.status(500).json({ error: true, msg: 'Internal server error.' })
  }
}
exports.cancelOrder = (req, res) => {
  res.send('order cancelled')
}

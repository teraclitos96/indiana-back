const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    required: true
  },
  emailAddress: {
    type: String,
    required: true
  },

  userId: {
    type: String,
    required: true
  },
  paymentAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    required: true
  }

//   items: [
//     {
//       itemName: String,
//       quantity: Number,
//       itemPrice: Number
//     }
//   ]
})

const PaymentModel = mongoose.model('Payments', paymentSchema)

module.exports = PaymentModel

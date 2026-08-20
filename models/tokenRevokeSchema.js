const mongoose = require('mongoose')

const TokenRevokeSchema = new mongoose.Schema({
  tokenRevoke: {
    type: String,
    trim: true
  },
  expiration: {
    type: Date,
    required: true,
    index: { expires: '12h' }
  }

})

const TokenRevokeModel = mongoose.model('token', TokenRevokeSchema)
module.exports = TokenRevokeModel

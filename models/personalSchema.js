const mongoose = require('mongoose')

const PersonalSchema = new mongoose.Schema({
  profileName: {
    type: String,
    required: true,
    trim: true
  },

  profile_IMG: {
    original_name: { type: String, trim: true, required: true },
    public_id: { type: String, trim: true, required: true }
  },

  profileDescription: {
    type: String,
    require: true
  }
})

const PersonalModel = mongoose.model('personal', PersonalSchema)
module.exports = PersonalModel

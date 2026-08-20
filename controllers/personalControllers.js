const PersonalModel = require('../models/personalSchema')
const { uploadFileToCloudinary, cloudinary } = require('../middlewars/cloudinary')
const { validationResult } = require('express-validator')
const fs = require('fs-extra')
const deleteFile = (file) => {
  fs.unlink(file.path)
}
exports.createPersonalInformation = async (req, res) => {
  const {
    profileName,
    profileDescription
  } = req.body

  const file = req.file
  if (!file) {
    return res
      .status(400)
      .json({ error: true, msg: 'you must send a photo' })
  }
  const checkIfThereIsAlreadyPersonalInformation = await PersonalModel.find()
  if (checkIfThereIsAlreadyPersonalInformation.length > 0) {
    deleteFile(file)
    return res
      .status(400)
      .json({ error: true, msg: 'personal information already exist' })
  }
  const errorFromExpressValidator = validationResult(req)
  if (!errorFromExpressValidator.isEmpty()) {
    deleteFile(file)

    return res
      .status(400)
      .json({ error: true, msg: errorFromExpressValidator.array()[0].msg })
  }
  const imgProfileCloudinary = await uploadFileToCloudinary(file)

  try {
    const newPersonalInformation = new PersonalModel({
      profileName,
      profile_IMG: imgProfileCloudinary,
      profileDescription

    })
    await newPersonalInformation.save()
    res.status(201).json({ error: null, msg: 'Personal information created correctly' })
  } catch (error) {
    res.status(500).json({ error: true, msg: error.message })
  } finally {
    deleteFile(file)
  }
}
exports.getPersonalInformation = async (req, res) => {
  try {
    const allInformation = await PersonalModel.find()

    res.status(200).json({ error: null, allInformation })
  } catch (error) {
    res.status(500).json({ error: true, msg: error.message })
  }
}
exports.updatePersonalInformation = async (req, res) => {
  const {
    profileName,
    profileDescription
  } = req.body
  const file = req.file
  if (!file) {
    return res
      .status(400)
      .json({ error: true, msg: 'you must send a photo' })
  }
  const errorFromExpressValidator = validationResult(req)
  if (!errorFromExpressValidator.isEmpty()) {
    deleteFile(file)

    return res
      .status(400)
      .json({ error: true, msg: errorFromExpressValidator.array()[0].msg })
  }
  const profilePhoto = await uploadFileToCloudinary(file)

  try {
    const personalInformationMongoToUpdate = await PersonalModel.findById({
      _id: req.params.id
    })
    if (!personalInformationMongoToUpdate) {
      await cloudinary.v2.uploader.destroy(profilePhoto.public_id)
      return res.status(404).json({ error: true, msg: 'personal information not found' })
    }

    const deleteProfilePhotoPromise = cloudinary.v2.uploader.destroy(personalInformationMongoToUpdate.profile_IMG.public_id)
    await PersonalModel.findByIdAndUpdate({ _id: req.params.id },
      {
        profileName,
        profile_IMG: profilePhoto,
        profileDescription

      },
      { new: true })

    await deleteProfilePhotoPromise
    res.status(200).json({ error: null, msg: 'personal information updated' })
  } catch (error) {
    await cloudinary.v2.uploader.destroy(profilePhoto.public_id)
    res.status(500).json({ error: true, msg: error.message })
  } finally {
    deleteFile(file)
  }
}

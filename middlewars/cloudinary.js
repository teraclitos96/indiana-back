const cloudinary = require('cloudinary')

const photoEdition = {
  folder: 'indiana',
  transformation: {
    crop: 'fill',
    fetch_format: 'auto',
    quality: 100,
    gravity: 'auto'
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET
})
const uploadFileToCloudinary = async (file, fieldName) => {
  return cloudinary.v2.uploader
    .upload(file.path, photoEdition)
    .then((result) => {
      return {
        fieldName,
        url: result.secure_url,
        original_name: file.originalname.split('.')[0],
        public_id: result.public_id
      }
    })
}
const newArrayPhotosCloudinaryFunction = async (files) => {
  const arrayFilesPromises = files.map((file) => {
    if (Array.isArray(file) && file.length > 0) {
      return Promise.all(file.map(f => uploadFileToCloudinary(f, file.fieldname)))
    }
    return uploadFileToCloudinary(file, file.fieldname)
  })

  return (await Promise.all(arrayFilesPromises)).flat()
}

const deleteFilesFromCloudinary = async (arrayOfFilesToBeDeletedPromises) => {
  arrayOfFilesToBeDeletedPromises.map(publicId => cloudinary.v2.uploader.destroy(publicId))
  await Promise.all(arrayOfFilesToBeDeletedPromises)
}
module.exports = { newArrayPhotosCloudinaryFunction, cloudinary, uploadFileToCloudinary, deleteFilesFromCloudinary }

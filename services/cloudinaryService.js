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
const uploadImage = async (file, fieldName) => {
  return cloudinary.v2.uploader.upload(file.path, photoEdition).then((result) => {
    return {
      fieldName,
      url: result.secure_url,
      original_name: file.originalname.split('.')[0],
      public_id: result.public_id
    }
  })
}
const uploadCarPhotos = async (files) => {
  const uploadPromises = files.map((file) => {
    if (Array.isArray(file) && file.length > 0) {
      return Promise.all(file.map((f) => uploadImage(f, file.fieldname)))
    }
    return uploadImage(file, file.fieldname)
  })

  return (await Promise.all(uploadPromises)).flat()
}

const deleteImage = (publicId, options = {}) => {
  return cloudinary.v2.uploader.destroy(publicId, options)
}

const deleteImages = async (publicIds, options = {}) => {
  return Promise.all(publicIds.map((publicId) => deleteImage(publicId, options)))
}

module.exports = {
  uploadCarPhotos,
  uploadImage,
  deleteImage,
  deleteImages
}

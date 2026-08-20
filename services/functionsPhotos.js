const fs = require('fs-extra')
const deleteFiles = (files) => {
  for (const file of files) {
    if (Array.isArray(file)) {
      for (const f of file) {
        fs.unlink(f.path)
      }
    } else {
      fs.unlink(file.path)
    }
  }
}

module.exports = { deleteFiles }

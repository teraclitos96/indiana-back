const { dangerouslyDeleteByTag } = require('@vercel/functions')
const { CARS_CACHE_TAG } = require('../middlewars/cacheControl')

const deleteCarsCache = async () => {
  if (process.env.VERCEL !== '1') return

  try {
    await dangerouslyDeleteByTag(CARS_CACHE_TAG, {
      revalidationDeadlineSeconds: 0
    })
  } catch (error) {
    console.error('Could not delete cars cache:', error)
  }
}

module.exports = {
  deleteCarsCache
}

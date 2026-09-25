const VERCEL_CACHE_HEADER = 'Vercel-CDN-Cache-Control'
const VERCEL_CACHE_TAG_HEADER = 'Vercel-Cache-Tag'
const CARS_CACHE_TAG = 'cars'

const setPrivateNoStore = (res) => {
  res.removeHeader(VERCEL_CACHE_HEADER)
  res.removeHeader(VERCEL_CACHE_TAG_HEADER)
  res.removeHeader('CDN-Cache-Control')
  res.setHeader('Cache-Control', 'private, no-store')
}

const cachePublicGet = (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    setPrivateNoStore(res)
    return next()
  }

  // Keep the browser from retaining a validator for a response that may be
  // deleted independently from Vercel's CDN cache.
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader(
    VERCEL_CACHE_HEADER,
    'public, max-age=300, stale-while-revalidate=60'
  )
  res.setHeader(VERCEL_CACHE_TAG_HEADER, CARS_CACHE_TAG)
  next()
}

const noStore = (req, res, next) => {
  setPrivateNoStore(res)
  next()
}

module.exports = {
  cachePublicGet,
  noStore,
  setPrivateNoStore,
  CARS_CACHE_TAG
}

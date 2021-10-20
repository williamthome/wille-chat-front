export const SW_FILE_PATH = '/sw.js'

// Names of the two caches used in this version of the service worker.
// Change to v2, etc. when you update any of the local resources, which will
// in turn trigger the install event again.
export const PRECACHE_NAME = 'precache-v1'
export const RUNTIME_NAME = 'runtime'

// Caching duration of the items, one week here
export const CACHING_DURATION = 7 * 24 * 3600

// Verbose logging or not
export const DEBUG = true

export const SW_EXPIRES_HEADER_NAME = 'sw-cache-expires'
export const PURGE_EXPIRED_MESSAGE = 'PURGE_EXPIRED'

// A list of local resources we always want to be cached.
export const PRECACHE_URLS = [
  '/manifest.json',
  '/images/icons/hello-icon-144.png',
  '/favicon.png',
  '/',
  '/main.css',
  '/main.mjs',
  '/scripts/vendor.mjs',
]

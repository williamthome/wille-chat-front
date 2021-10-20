import { PRECACHE_NAME, PRECACHE_URLS, RUNTIME_NAME, SW_EXPIRES_HEADER_NAME } from './pwa.config'
import { log, error, cacheUrl } from './pwa.helper'

declare const self: ServiceWorkerGlobalScope

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', async (event) => {
  if (process.env.NODE_ENV === 'development') return

  event.waitUntil(
    caches
      .open(PRECACHE_NAME)
      .then((cache) =>
        Promise.all(PRECACHE_URLS.map(async (url) => cacheUrl(cache, 'Pre-caching', url)))
      )
      .then(() => self.skipWaiting())
      .catch((err) => error(err))
  )

  log('INSTALLED')
})

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', (event) => {
  if (process.env.NODE_ENV === 'development') return

  const currentCaches = [PRECACHE_NAME, RUNTIME_NAME]
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName))
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            return caches.delete(cacheToDelete)
          })
        )
      })
      .then(() => self.clients.claim())
      .catch((err) => error(err))
  )

  log('ACTIVATED')
})

// The fetch handler serves responses for same-origin resources from a cache.
// If no response is found, it populates the runtime cache with the response
// from the network before returning it to the page.
self.addEventListener('fetch', (event) => {
  if (process.env.NODE_ENV === 'development') return

  const { request } = event
  const { url } = request
  const { origin } = self.location

  // Skip cross-origin requests, like those for Google Analytics.
  if (url.startsWith(origin) && PRECACHE_URLS.includes(url.split(origin)[1])) {
    event.respondWith(
      self.caches.open(PRECACHE_NAME).then((cache) =>
        cache.match(request).then((response) => {
          // If no match try get runtime cache
          if (!response) {
            self.caches.open(PRECACHE_NAME).then((cache) => {
              cache.match(request).then((runtimeResponse) => {
                response = runtimeResponse
              })
            })
          }

          // If there is a match from the cache
          if (response) {
            log(`Serving ${url} from cache`)

            const expirationHeader = response.headers.get(SW_EXPIRES_HEADER_NAME)

            if (expirationHeader) {
              const expirationDate = Date.parse(expirationHeader)

              // Check it is not already expired and return from the cache
              if (expirationDate > Date.now()) {
                return response
              }
            }
          }

          // Otherwise, let's fetch it from the network
          log(`No match in cache for ${url}, using network`)

          // Note: We HAVE to use fetch(url) here to ensure we
          // have a CORS-compliant request. Otherwise, we could get back
          // an opaque response which we cannot inspect
          // (https://developer.mozilla.org/en-US/docs/Web/API/Response/type).
          return cacheUrl(cache, 'Updating', url)
        })
      )
    )
  }
})

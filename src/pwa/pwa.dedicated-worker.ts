import { PRECACHE_NAME, PURGE_EXPIRED_MESSAGE, SW_EXPIRES_HEADER_NAME } from './pwa.config'
import { log } from './pwa.helper'

// eslint-disable-next-line no-undef
declare const self: DedicatedWorkerGlobalScope

self.addEventListener('message', (event) => {
  log(`Received message ${event.data}`)

  const eventData = JSON.parse(event.data)

  // Clean cache when we receive the message asking to do so
  if (eventData.action === PURGE_EXPIRED_MESSAGE) {
    log('Purging expireds from cache...')
    self.caches.open(PRECACHE_NAME).then((cache) =>
      cache.keys().then((keys) =>
        keys.forEach(
          // Loop over all requests stored in the cache and get the matching cached response
          (key) =>
            cache.match(key).then((cachedResponse) => {
              if (!cachedResponse) return

              // Get expiration from headers
              const expirationHeader = cachedResponse.headers.get(SW_EXPIRES_HEADER_NAME)
              if (!expirationHeader) return

              // Check expiration and eventually delete the cached item
              const expirationDate = Date.parse(expirationHeader)
              if (expirationDate < Date.now()) {
                cache.delete(key)
                log(`${key.url} expired and purged from cache`)
              }
            })
        )
      )
    )
    log('Expired purgeds')
  }
})

import { log, error } from './pwa.helper'
import { SW_FILE_PATH, PURGE_EXPIRED_MESSAGE } from './pwa.config'

export default async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register(SW_FILE_PATH)

        log('Registered:', registration)

        if ('caches' in window) {
          try {
            navigator.serviceWorker.controller?.postMessage(
              JSON.stringify({
                action: PURGE_EXPIRED_MESSAGE,
              })
            )
          } catch (error) {
            log('Purge failed:', error)
          }
        }
      } catch (err) {
        error('Registration failed:', err)
      }
    })
  }
}

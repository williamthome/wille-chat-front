import { log, error, clearServiceWorkerCache } from './pwa.helper'

export default async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    addEventListener('load', async () => {
      try {
        await clearServiceWorkerCache()
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          try {
            const result = await registration.unregister()
            log('UNREGISTERED', result)
          } catch (err) {
            error('Unregistration failed:', err)
          }
        }
      } catch (err) {
        error('Unregistration failed:', err)
      }
    })
  }
}

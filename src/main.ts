import '@/extensions'
import registerServiceWorker from '@/pwa/pwa.register'
import unregisterServiceWorker from '@/pwa/pwa.unregister'
import App from './App.svelte'

const init = async (): Promise<void> => {
  const isProd = process.env.NODE_ENV === 'production'
  isProd && (await registerServiceWorker())
  !isProd && (await unregisterServiceWorker())
}

init()

export default new App({
  target: document.body,
})

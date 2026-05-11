// Service worker for Web Push + PWA shell
// Versioned cache name lets us invalidate on deploys.
const CACHE_VERSION = 'muraja3a-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('push', (event) => {
  let payload = { title: 'مُراجِع', body: '', url: '/dashboard' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch (_e) {
    if (event.data) payload.body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      lang: payload.lang || 'ar',
      dir: payload.lang === 'en' ? 'ltr' : 'rtl',
      tag: payload.tag || 'due-reminder',
      renotify: true,
      data: { url: payload.url || '/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})

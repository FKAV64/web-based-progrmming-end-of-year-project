try {
  importScripts('./ngsw-worker.js');
  console.log('[SW] Angular worker loaded');
} catch (error) {
  console.log('[SW] Angular worker unavailable, running push-only worker:', error);
}

self.addEventListener('push', (event) => {
  let data = null;

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      console.log('[SW] Push payload parse failed:', error);
    }
  }

  console.log('[SW] Push received:', data);

  if (!data) {
    console.log('[SW] Push event has no data');
    return;
  }

  const title = data.title || 'Kripto Dashboard';
  const options = {
    body: data.body || '',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    data: { url: data.url || '/alerts' },
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || '/alerts';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});

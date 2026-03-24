// FitCore Push Notification Service Worker
// Handles push events and notification clicks

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'FitCore', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: '/fitcore-logo.png',
    badge: '/fitcore-logo.png',
    tag: data.tag || 'fitcore-notification',
    data: {
      url: data.url || '/',
    },
    // Vibrate on mobile: short-long-short
    vibrate: [100, 200, 100],
    // Keep notification until user interacts
    requireInteraction: data.requireInteraction ?? false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'FitCore', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Only allow relative paths (starts with /) — reject external URLs
  const rawUrl = event.notification.data?.url || '/';
  const url = typeof rawUrl === 'string' && rawUrl.startsWith('/') ? rawUrl : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open new tab
      return clients.openWindow(url);
    })
  );
});

// Voca Push Notification Service Worker v2
// This handles incoming push notifications even when the app is closed

// Force immediate activation - don't wait for old SW to die
self.addEventListener('install', (event) => {
    console.log('[Service Worker v2] Installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker v2] Activating...');
    event.waitUntil(clients.claim());
});
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received');

    // ALWAYS show a notification - never return early without one
    let title = 'Voca';
    let options = {
        body: 'You have a new notification',
        icon: '/pwa-192x192.png',
        badge: '/favicon-96x96.png',
        vibrate: [100, 50, 100],
        tag: 'voca-notification',
        data: { url: '/' }
    };

    // Try to parse the push data
    if (event.data) {
        try {
            const data = event.data.json();
            console.log('[Service Worker] Push data:', data);

            title = data.title || 'Voca';
            options = {
                body: data.body || 'New notification from Voca',
                icon: data.icon || '/pwa-192x192.png',
                badge: '/favicon-96x96.png',
                vibrate: [100, 50, 100],
                data: data.data || { url: '/' },
                tag: data.tag || 'voca-notification',
                renotify: data.renotify || false,
                requireInteraction: data.type === 'call',
                actions: data.actions || []
            };
        } catch (parseError) {
            console.error('[Service Worker] Failed to parse push data:', parseError);
            // Try plain text fallback
            try {
                const text = event.data.text();
                if (text) {
                    options.body = text;
                }
            } catch (textError) {
                console.error('[Service Worker] Failed to get text:', textError);
            }
        }
    }

    // CRITICAL: Always wait for notification to be shown
    event.waitUntil(
        self.registration.showNotification(title, options)
            .catch(err => {
                console.error('[Service Worker] showNotification failed:', err);
                // Last resort fallback
                return self.registration.showNotification('Voca', {
                    body: 'Check the app for new activity',
                    icon: '/pwa-192x192.png'
                });
            })
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked, data:', event.notification.data);

    event.notification.close();

    const data = event.notification.data || {};
    const targetUrl = data.url || '/chat';
    const notificationType = data.type || 'message';

    console.log('[Service Worker] Opening URL:', targetUrl, 'type:', notificationType);

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((windowClients) => {
            console.log('[Service Worker] Found', windowClients.length, 'windows');

            // Try to find an existing Voca window
            for (const client of windowClients) {
                // Focus and navigate existing window
                if ('focus' in client && 'navigate' in client) {
                    console.log('[Service Worker] Navigating existing window to:', targetUrl);
                    return client.focus().then(() => {
                        return client.navigate(targetUrl);
                    });
                }
            }

            // No existing window - open new one
            console.log('[Service Worker] Opening new window:', targetUrl);
            return clients.openWindow(targetUrl);
        }).catch(err => {
            console.error('[Service Worker] Error handling click:', err);
            // Fallback - just open the app
            return clients.openWindow('/chat');
        })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[Service Worker] Notification closed');
});

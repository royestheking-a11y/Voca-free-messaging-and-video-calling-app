// Voca Push Notification Service Worker
// This handles incoming push notifications even when the app is closed

self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received:', event);

    const handlePush = async () => {
        try {
            if (!event.data) {
                console.log('[Service Worker] Push event has no data');
                // Even with no data, we should show something to avoid the "Site updated" message
                return self.registration.showNotification('Voca', {
                    body: 'New notification',
                    icon: '/pwa-192x192.png'
                });
            }

            let data;
            try {
                data = event.data.json();
            } catch (e) {
                console.warn('[Service Worker] Failed to parse JSON, using text:', e);
                // Fallback if not JSON
                return self.registration.showNotification('Voca', {
                    body: event.data.text() || 'New notification',
                    icon: '/pwa-192x192.png'
                });
            }

            console.log('[Service Worker] Push data:', data);

            const options = {
                body: data.body || 'New notification from Voca',
                icon: data.icon || '/pwa-192x192.png',
                badge: '/favicon-96x96.png',
                vibrate: [100, 50, 100],
                data: data.data || {},
                tag: data.tag || 'voca-notification',
                renotify: data.renotify || false,
                requireInteraction: data.type === 'call',
                actions: data.actions || []
            };

            return self.registration.showNotification(data.title || 'Voca', options);

        } catch (error) {
            console.error('[Service Worker] Error processing push:', error);
            // Absolute fallback to prevent "Site updated in background"
            return self.registration.showNotification('Voca', {
                body: 'New message received',
                icon: 'https://voca-web-app.vercel.app/pwa-192x192.png',
                badge: '/favicon-96x96.png'
            });
        }
    };

    event.waitUntil(handlePush());
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked:', event);

    event.notification.close();

    const action = event.action;
    const data = event.notification.data;

    // Handle action buttons
    if (action === 'answer') {
        // Open app with call=true parameter
        event.waitUntil(
            clients.openWindow(data.url || '/')
        );
    } else if (action === 'decline') {
        // Just close the notification, maybe send decline to server
        console.log('[Service Worker] Call declined');
    } else {
        // Default click - open the URL
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                // Check if app is already open
                for (const client of clientList) {
                    if (client.url.includes('voca') && 'focus' in client) {
                        client.navigate(data.url || '/');
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (clients.openWindow) {
                    return clients.openWindow(data.url || '/');
                }
            })
        );
    }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[Service Worker] Notification closed:', event);
});

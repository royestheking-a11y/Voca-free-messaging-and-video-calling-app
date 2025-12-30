import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

// Precache resources
precacheAndRoute(self.__WB_MANIFEST);

// Handle Push Notifications
self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {};

    // Don't show notification if app is open and focused (optional, but better UX for active chats)
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            const isFocused = clientList.some(client => client.focused);
            // You might want to still show it for CALLS even if focused, so user sees it? 
            // Actually, if focused, the in-app UI handles it.
            // But for now, let's show it to be safe for the "locked" requirement.

            const title = data.title || 'Voca - New Message';
            const options = {
                body: data.body || 'You have a new message',
                icon: data.icon || '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                data: data.data || {},
                vibrate: data.tag === 'call' ? [200, 100, 200, 100, 200, 100, 400] : [100, 50, 100],
                tag: data.tag || 'message',
                renotify: data.renotify || false,
                actions: data.actions || [
                    { action: 'open', title: 'Open Chat' }
                ]
            };

            return self.registration.showNotification(title, options);
        })
    );
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'decline') {
        // Just close notification (done above)
        return;
    }

    // Default or 'answer' or 'open'
    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                // Approximate match
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
                // Fallback: focus any Voca window and navigate? 
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(urlToOpen);
                    }
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

/**
 * PWA Push Notification Utilities
 * Handles notification permission, subscription, and management
 */

const PUBLIC_VAPID_KEY = 'BHgNtaH95BRApkIjFwoE1YuKCrFIYPlwHohRYjr8Q-xdhwpcrTH_NTT4TcHISgB7EGjKkI54ZyPogiuiRrnuhTc';

/**
 * Request notification permission from the user
 * @returns true if permission granted, false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission === 'denied') {
        console.warn('Notification permission denied');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Subscribe the user to push notifications
 * @param userId - The current user's ID
 * @param token - Authentication token
 * @returns The push subscription object or null if failed
 */
export async function subscribeToPushNotifications(userId: string, token: string): Promise<PushSubscription | null> {
    try {
        // Check if service worker is supported
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Workers not supported');
            return null;
        }

        // Request permission first
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            console.warn('Notification permission not granted');
            return null;
        }

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // CRITICAL FIX FOR 410: Always force a fresh subscription
        // Unsubscribe any existing subscription (might be expired)
        let subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            console.log('⚠️ Unsubscribing old push subscription...');
            await subscription.unsubscribe();
        }

        // Create brand new subscription
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY) as BufferSource
        });
        console.log('✅ Fresh push subscription created');

        // Send subscription to backend
        const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_URL}/notifications/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(subscription)
        });

        if (!response.ok) {
            throw new Error('Failed to save subscription to server');
        }

        console.log('✅ Subscription saved to server');
        return subscription;

    } catch (error) {
        console.error('Error subscribing to push notifications:', error);
        return null;
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
    try {
        if (!('serviceWorker' in navigator)) {
            return false;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
            console.log('✅ Unsubscribed from push notifications');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
        return false;
    }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isPushNotificationSubscribed(): Promise<boolean> {
    try {
        if (!('serviceWorker' in navigator)) {
            return false;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        return subscription !== null;
    } catch (error) {
        console.error('Error checking push subscription:', error);
        return false;
    }
}

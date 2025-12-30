import React, { useState, useEffect } from 'react';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../../lib/pushNotifications';
import { useVoca } from './VocaContext'; // Adjust path if needed
import { Bell, BellOff, Send, RefreshCw, X } from 'lucide-react';

export const PushDebug = () => {
    const { currentUser } = useVoca();
    const [status, setStatus] = useState<string>('Checking...');
    const [isOpen, setIsOpen] = useState(false);

    const checkStatus = async () => {
        if (!('serviceWorker' in navigator)) {
            setStatus('No Service Worker support');
            return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            setStatus('Subscribed ✅');
        } else {
            setStatus('Not Subscribed ❌');
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const handleSubscribe = async () => {
        setStatus('Subscribing...');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setStatus('Error: No auth token found');
                return;
            }
            // Pass currentUser.id and token as required
            const sub = await subscribeToPushNotifications(currentUser?.id || '', token);
            if (sub) setStatus('Subscribed ✅');
            else setStatus('Failed to subscribe');
        } catch (err: any) {
            setStatus('Error: ' + err.message);
        }
    };

    const handleUnsubscribe = async () => {
        setStatus('Unsubscribing...');
        await unsubscribeFromPushNotifications();
        setStatus('Not Subscribed ❌');
    };

    const handleTestPush = async () => {
        // We can't easily trigger a real server push from here without a backend endpoint
        // But we can test the service worker locally
        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('Test Notification', {
                body: 'This is a local test from debug panel',
                icon: '/pwa-192x192.png'
            });
        }
    };

    if (!currentUser) return null;

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-[9999] bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors"
                title="Push Notification Debug"
            >
                <Bell size={24} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-[#1a2c38] border border-gray-700 p-4 rounded-lg shadow-xl w-80 text-white">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2">
                    <Bell size={18} /> Push Debug
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                    <X size={18} />
                </button>
            </div>

            <div className="space-y-3">
                <div className="text-sm">
                    Status: <span className="font-mono bg-black/30 px-2 py-0.5 rounded">{status}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={handleSubscribe}
                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 py-2 rounded text-sm font-medium"
                    >
                        <RefreshCw size={14} /> Subscribe
                    </button>
                    <button
                        onClick={handleUnsubscribe}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 py-2 rounded text-sm font-medium"
                    >
                        <BellOff size={14} /> Unsubscribe
                    </button>
                </div>

                <button
                    onClick={handleTestPush}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-2 rounded text-sm font-medium"
                >
                    <Send size={14} /> Test Local Notification
                </button>

                <p className="text-xs text-gray-400 mt-2">
                    Use "Unsubscribe" then "Subscribe" to refresh keys. Check console for details.
                </p>
            </div>
        </div>
    );
};


import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = "1020729373464-k2r75s12004avif8jj3u0g5l4nq5qo4a.apps.googleusercontent.com";

// Register custom service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // First: Unregister ALL old service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const url = registration.active?.scriptURL || '';
        if (!url.includes('sw-v2.js')) {
          console.log('🗑️ Unregistering old SW:', url);
          await registration.unregister();
        }
      }

      // Now register the new one
      const registration = await navigator.serviceWorker.register('/sw-v2.js');
      console.log('✅ Service Worker v2 registered:', registration.scope);
      await registration.update();
    } catch (error) {
      console.warn('⚠️ Service Worker registration failed:', error);
    }
  });
}

import { HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </GoogleOAuthProvider>
);

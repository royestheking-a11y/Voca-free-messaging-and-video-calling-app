
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = "1020729373464-c8jmvuvervetgb2qt2238vikukrb001c.apps.googleusercontent.com";

// Register custom service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use new filename to bypass CDN cache
    navigator.serviceWorker.register('/sw-v2.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
        // Force check for updates
        registration.update();
      })
      .catch((error) => {
        console.warn('⚠️ Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);

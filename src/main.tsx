
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = "1020729373464-c8jmvuvervetgb2qt2238vikukrb001c.apps.googleusercontent.com";

// Register custom service worker for push notifications
// Version timestamp forces browser to check for updates
const SW_VERSION = 'v2-' + Date.now();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=${SW_VERSION}`)
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

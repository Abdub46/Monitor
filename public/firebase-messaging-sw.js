// Firebase Messaging service worker — handles push notifications
// received while the app is in the background or closed.
//
// IMPORTANT: these config values are the same NEXT_PUBLIC_FIREBASE_*
// values from your .env.local. They are public/client-safe by design
// (Firebase's security model relies on server-side rules, not on
// hiding this config) but a service worker can't read environment
// variables at runtime, so they must be duplicated here manually.
// Keep this file in sync with your .env.local if those values change.

importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "REPLACE_WITH_NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  messagingSenderId: "REPLACE_WITH_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_NEXT_PUBLIC_FIREBASE_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Monitoring alert", {
    body: body || "An application needs attention.",
    icon: "/icon.png",
  });
});

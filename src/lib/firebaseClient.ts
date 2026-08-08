import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

/**
 * Requests browser notification permission, registers the service
 * worker, and returns an FCM token — or null if push isn't
 * configured/supported/permitted. Callers should treat null as
 * "push unavailable" rather than an error.
 */
export async function requestPushToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!isFirebaseConfigured()) return null;
  if (!(await isSupported())) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  return token || null;
}

export { isFirebaseConfigured };

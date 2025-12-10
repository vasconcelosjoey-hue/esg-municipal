import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";

// Access environment variables using Vite's import.meta.env
// The types are handled by src/vite-env.d.ts but we cast to any to be safe against missing definitions
const env = (import.meta as any).env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings optimized for mobile networks/stability
// experimentalForceLongPolling helps avoid websocket issues on some 4G/5G networks
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

export { db, app };
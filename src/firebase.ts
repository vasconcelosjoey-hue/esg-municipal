import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";

// Configuration provided explicitly for the test environment
export const firebaseConfig = {
  apiKey: "AIzaSyBkae_xIIVml6KqZ7eZyF3zC7HcjRac4Fc",
  authDomain: "esg-municipal.firebaseapp.com",
  projectId: "esg-municipal",
  storageBucket: "esg-municipal.firebasestorage.app",
  messagingSenderId: "873938470656",
  appId: "1:873938470656:web:8af3c94608afd87e5755e5"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings optimized for mobile networks/stability
// experimentalForceLongPolling helps avoid websocket issues on some 4G/5G networks
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

export { db, app };
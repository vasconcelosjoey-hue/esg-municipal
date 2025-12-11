import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// --- DEBUG DE VARIÁVEIS DE AMBIENTE (VERCEL) ---
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error("❌ ERRO CRÍTICO: Variáveis de ambiente do Firebase ausentes ou indefinidas:", missingKeys);
  console.error("Certifique-se de que as variáveis iniciadas com 'VITE_' foram adicionadas nas configurações do projeto na Vercel.");
} else {
  console.log("✅ Configuração do Firebase carregada com sucesso.");
  console.log("🔹 Project ID:", firebaseConfig.projectId);
  console.log("🔹 Ambiente:", import.meta.env.MODE);
  // Não logamos a API Key completa por segurança, apenas confirmamos que ela existe
  console.log("🔹 API Key presente:", !!firebaseConfig.apiKey);
}
// -----------------------------------------------

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
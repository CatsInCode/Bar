import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

/**
 * Можно вынести в .env, но оставил значения по умолчанию, чтобы проект запускался сразу.
 * Vite env: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, ...
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCD-zBRdJ-eJGLZG3AetntP81dQIbgzpxw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "barmendatabase.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "barmendatabase",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ??
    "https://barmendatabase-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "barmendatabase.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "513054970746",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:513054970746:web:2874c7cfc667b7d8167cc3",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

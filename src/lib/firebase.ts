import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const fallbackConfig = {
  apiKey: "AIzaSyDTi7zDMs6Y_3QjuynwaL2ZQIXnnMx_6P8",
  authDomain: "political-compass-2bd97.firebaseapp.com",
  projectId: "political-compass-2bd97",
  storageBucket: "political-compass-2bd97.firebasestorage.app",
  messagingSenderId: "550442958785",
  appId: "1:550442958785:web:1d959bae5fde83f52d3940",
};

const envConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const hasCompleteEnvConfig =
  !!envConfig.apiKey &&
  !!envConfig.authDomain &&
  !!envConfig.projectId &&
  !!envConfig.appId;

const firebaseConfig = hasCompleteEnvConfig ? envConfig : fallbackConfig;

const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export function getFirebaseApp(): FirebaseApp {
  return app;
}

export default app;
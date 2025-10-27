// src/lib/firebase.ts
// Lightweight, optional Firebase init. If env vars are missing, we no-op.
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  // Require the standard NEXT_PUBLIC_ envs; if not present, skip Firebase entirely.
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) return null;

  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(cfg);
  }
  return app;
}

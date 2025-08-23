// lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: 'AIzaSyDTi7zDMs6Y_3QjuynwaL2ZQIXnnMx_6P8',
  authDomain: 'political-compass-2bd97.firebaseapp.com',
  projectId: 'political-compass-2bd97',
  storageBucket: 'political-compass-2bd97.firebasestorage.app',
  messagingSenderId: '550442958785',
  appId: '1:550442958785:web:1d959bae5fde83f52d3940',
};

// Avoid re-initializing during HMR
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Convenience helpers (optional, but useful in pages)
export const firestore = {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
};

export default app;
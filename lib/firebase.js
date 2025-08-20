// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'YAIzaSyDTi7zDMs6Y_3QjuynwaL2ZQIXnnMx_6P8',
  authDomain: 'political-compass-2bd97.firebaseapp.com',
  projectId: 'political-compass-2bd97',
  storageBucket: 'political-compass-2bd97.firebasestorage.app',
  messagingSenderId: 'Y550442958785',
  appId: '1:550442958785:web:1d959bae5fde83f52d3940',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

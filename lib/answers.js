// lib/answers.js
import questions from '../data/questions';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export const ANSWERS_KEY = 'pc_answers';

// Wait for current user once (resolves to null if not signed in)
export function getCurrentUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u || null);
    });
  });
}

// Local backup (offline / logged-out)
export function loadLocal() {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
export function saveLocal(obj) {
  try {
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(obj));
  } catch {}
}

// Firestore doc ref for a user's answers
function answersDoc(uid) {
  return doc(db, 'answers', uid);
}

// Load answers: Firestore if authed, else local
export async function loadAnswers() {
  const user = await getCurrentUser();
  if (user) {
    try {
      const snap = await getDoc(answersDoc(user.uid));
      if (snap.exists()) {
        const data = snap.data() || {};
        const map = data.answers || {};
        // mirror to local for offline UX
        saveLocal(map);
        return map;
      }
    } catch (e) {
      console.warn('loadAnswers Firestore failed, falling back to local:', e);
    }
  }
  return loadLocal();
}

// Save answers: write to Firestore if authed; always mirror to local
export async function saveAnswers(map) {
  saveLocal(map);
  const user = await getCurrentUser();
  if (!user) return; // not signed-in: local only
  try {
    await setDoc(
      answersDoc(user.uid),
      { uid: user.uid, answers: map, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.warn('saveAnswers Firestore failed (kept local):', e);
  }
}

// Helpers
export function toAnswerArray(map) {
  return questions.map((q) => {
    const v = map[q.id];
    return typeof v === 'number' && v >= 1 && v <= 5 ? v : 3;
  });
}

export function groupQuestions(all = questions) {
  const hot = all.filter((q) => q.type === 'hot');
  const main = all.filter((q) => q.type !== 'hot');
  const core = main.slice(0, 20);
  const advanced = main.slice(20, 40);
  return { core, advanced, hot };
}

// lib/answers.js
import { auth, db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  collection,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

const LS_KEY = "answersById:v1";

// Read answers in this order:
//   1) Firestore /answers/{uid}
//   2) If missing, latest /results where uid==uid with answers
//   3) localStorage fallback (anon or offline)
export async function loadAnswers() {
  try {
    const u = auth.currentUser;
    if (u) {
      // 1) /answers/{uid}
      const aRef = doc(db, "answers", u.uid);
      const aSnap = await getDoc(aRef);
      if (aSnap.exists()) {
        const data = aSnap.data() || {};
        const byId = data.answers || data;
        if (byId && Object.keys(byId).length) {
          localStorage.setItem(LS_KEY, JSON.stringify(byId));
          return byId;
        }
      }

      // 2) latest results with answers (one-time seed/fallback)
      try {
        const q = query(
          collection(db, "results"),
          where("uid", "==", u.uid),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0].data() || {};
          if (d.answers && Object.keys(d.answers).length) {
            localStorage.setItem(LS_KEY, JSON.stringify(d.answers));
            return d.answers;
          }
        }
      } catch {
        // ignore; fall through to local
      }
    }

    // 3) localStorage
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
    return {};
  } catch {
    // local fallback on any error
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  }
}

// Save to Firestore (/answers/{uid}) when signed-in, always mirror to localStorage
export async function saveAnswers(byId) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(byId));
  } catch {}

  const u = auth.currentUser;
  if (!u) return; // anon—local only

  const ref = doc(db, "answers", u.uid);
  await setDoc(ref, { answers: byId, updatedAt: Date.now() }, { merge: true });
}

// Real-time subscription to /answers/{uid}; falls back to one-shot load if missing
export function subscribeAnswers(cb) {
  const u = auth.currentUser;
  if (!u) {
    // not signed in—emit local and stop
    loadAnswers().then((a) => cb(a));
    return () => {};
  }
  const ref = doc(db, "answers", u.uid);
  const unsub = onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() || {};
        const byId = data.answers || {};
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(byId));
        } catch {}
        cb(byId);
      } else {
        // If doc doesn’t exist yet, do a one-shot seed from latest result (if any)
        loadAnswers().then((a) => cb(a));
      }
    },
    () => {
      // on error, emit local
      loadAnswers().then((a) => cb(a));
    }
  );
  return unsub;
}

// Split helper stays the same
export function groupQuestions(questions) {
  const core = [];
  const advanced = [];
  const hot = [];
  for (const q of questions) {
    if (q.type === "hot") hot.push(q);
    else if (q.index < 20) core.push(q);
    else advanced.push(q);
  }
  return { core, advanced, hot };
}

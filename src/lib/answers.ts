// src/lib/answers.ts
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getFirebaseApp } from "./firebase";

// Optional imports (wrapped in try/catch for projects without Firebase installed)
let _auth: any, _getAuth: any, _onAuthStateChanged: any;
let _firestore: any,
  _getFirestore: any,
  _doc: any,
  _getDoc: any,
  _setDoc: any,
  _updateDoc: any,
  _serverTimestamp: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const authMod = require("firebase/auth");
  _getAuth = authMod.getAuth;
  _onAuthStateChanged = authMod.onAuthStateChanged;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fsMod = require("firebase/firestore");
  _getFirestore = fsMod.getFirestore;
  _doc = fsMod.doc;
  _getDoc = fsMod.getDoc;
  _setDoc = fsMod.setDoc;
  _updateDoc = fsMod.updateDoc;
  _serverTimestamp = fsMod.serverTimestamp;
} catch {
  // Firebase not installed / configured — localStorage only.
}

type AnswersMap = Record<string, any>;

export type AnswersContextType = {
  answers: AnswersMap;
  setAnswer: (key: string, value: any) => void;
  replaceAll: (data: AnswersMap) => void;
  isCloudBacked: boolean;
};

const AnswersContext = createContext<AnswersContextType | null>(null);

const LS_KEY = "pc_answers_v1";

function loadFromLocal(): AnswersMap {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToLocal(data: AnswersMap) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

export function AnswersProvider({ children }: { children: React.ReactNode }) {
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [isCloudBacked, setCloud] = useState(false);
  const first = useRef(true);

  // Load local on mount
  useEffect(() => {
    setAnswers(loadFromLocal());
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    saveToLocal(answers);
  }, [answers]);

  // Optional Firestore sync (if Firebase + Auth configured)
  useEffect(() => {
    const app = getFirebaseApp();
    if (!app || !_getAuth || !_getFirestore) return;

    const auth = _getAuth(app);
    const db = _getFirestore(app);

    const unsub = _onAuthStateChanged(auth, async (user: any) => {
      if (!user) {
        setCloud(false);
        return;
      }
      try {
        const ref = _doc(db, "answers", user.uid);
        const snap = await _getDoc(ref);
        if (snap.exists()) {
          const remote = snap.data()?.data ?? {};
          setAnswers((prev) => ({ ...prev, ...remote }));
        } else {
          await _setDoc(ref, { data: answers, updatedAt: _serverTimestamp() });
        }
        setCloud(true);
      } catch {
        setCloud(false);
      }
    });

    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced remote save
  const remoteSave = useMemo(() => {
    let t: any;
    return (payload: AnswersMap) => {
      const app = getFirebaseApp();
      if (!app || !_getAuth || !_getFirestore) return;
      const auth = _getAuth(app);
      const user = auth.currentUser;
      if (!user) return;

      const db = _getFirestore(app);
      const ref = _doc(db, "answers", user.uid);
      clearTimeout(t);
      t = setTimeout(async () => {
        try {
          await _updateDoc(ref, { data: payload, updatedAt: _serverTimestamp() });
        } catch {
          try {
            await _setDoc(ref, { data: payload, updatedAt: _serverTimestamp() });
          } catch {}
        }
      }, 300);
    };
  }, []);

  const api = useMemo<AnswersContextType>(
    () => ({
      answers,
      setAnswer: (key, value) => {
        setAnswers((prev) => {
          const next = { ...prev, [key]: value };
          remoteSave(next);
          return next;
        });
      },
      replaceAll: (data) => {
        setAnswers(data || {});
        remoteSave(data || {});
      },
      isCloudBacked,
    }),
    [answers, isCloudBacked, remoteSave]
  );

  return React.createElement(AnswersContext.Provider, { value: api }, children);
}

export function useAnswers(): AnswersContextType {
  const ctx = useContext(AnswersContext);
  if (!ctx) throw new Error("useAnswers must be used within AnswersProvider");
  return ctx;
}

// src/lib/answers.ts
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type AnswersMap = Record<string, number>;
type AnswersContextShape = {
  answers: AnswersMap;
  setAnswer: (qid: string, value: number) => void;
  bulkLoad: (a: AnswersMap) => void;
  reset: () => void;
  ready: boolean; // true once we’ve hydrated from storage
};

const STORAGE_KEYS = [
  "pc_answers_v1",      // current
  "answers",            // older possible
  "pc-answers",         // older possible
];

const AnswersContext = createContext<AnswersContextShape | undefined>(undefined);

function readFromStorage(): AnswersMap {
  if (typeof window === "undefined") return {};
  for (const key of STORAGE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed as AnswersMap;
      }
    } catch {}
  }
  return {};
}

function writeToStorage(answers: AnswersMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("pc_answers_v1", JSON.stringify(answers));
  } catch {}
}

export function AnswersProvider({ children }: { children: React.ReactNode }) {
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [ready, setReady] = useState(false);

  // Hydrate on mount
  useEffect(() => {
    const initial = readFromStorage();
    setAnswers(initial);
    setReady(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (!ready) return;
    writeToStorage(answers);
  }, [answers, ready]);

  const setAnswer = (qid: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const bulkLoad = (a: AnswersMap) => {
    setAnswers(a || {});
  };

  const reset = () => setAnswers({});

  const value = useMemo<AnswersContextShape>(
    () => ({ answers, setAnswer, bulkLoad, reset, ready }),
    [answers, ready]
  );

  return <AnswersContext.Provider value={value}>{children}</AnswersContext.Provider>;
}

export function useAnswers() {
  const ctx = useContext(AnswersContext);
  if (!ctx) {
    throw new Error("useAnswers must be used within AnswersProvider");
  }
  return ctx;
}

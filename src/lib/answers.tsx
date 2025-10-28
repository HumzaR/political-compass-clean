"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/** We’ll accept answers from any of these keys (old experiments, quiz page, etc.) */
const CANDIDATE_KEYS = [
  "pc_answers",
  "answers",
  "political_compass_answers",
  "quiz_answers",
];

const CANONICAL_KEY = "pc_answers";

export type AnswersMap = Record<string, number>;

type AnswersApi = {
  answers: AnswersMap;
  setAnswer: (id: string, value: number) => void;
  setAnswers: (all: AnswersMap) => void;
  clearAnswers: () => void;
};

const AnswersContext = createContext<AnswersApi | null>(null);

function readFromLocalStorage(): AnswersMap {
  if (typeof window === "undefined") return {};
  for (const key of CANDIDATE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as AnswersMap;
      }
    } catch {
      /* ignore malformed */
    }
  }
  return {};
}

function writeToLocalStorage(data: AnswersMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CANONICAL_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export function AnswersProvider({ children }: { children: React.ReactNode }) {
  // Start empty on the server, hydrate on the client.
  const [answers, setAnswersState] = useState<AnswersMap>({});

  // Hydrate once on mount from any known key.
  useEffect(() => {
    const initial = readFromLocalStorage();
    if (Object.keys(initial).length > 0) {
      setAnswersState(initial);
    }
  }, []);

  // Keep canonical key up to date.
  useEffect(() => {
    writeToLocalStorage(answers);
  }, [answers]);

  const api = useMemo<AnswersApi>(() => {
    return {
      answers,
      setAnswer: (id: string, value: number) => {
        setAnswersState((prev) => {
          const next = { ...prev, [id]: value };
          return next;
        });
      },
      setAnswers: (all: AnswersMap) => {
        setAnswersState({ ...all });
      },
      clearAnswers: () => {
        setAnswersState({});
        if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem(CANONICAL_KEY);
          } catch {}
        }
      },
    };
  }, [answers]);

  return <AnswersContext.Provider value={api}>{children}</AnswersContext.Provider>;
}

export function useAnswers(): AnswersApi {
  const ctx = useContext(AnswersContext);
  if (!ctx) throw new Error("useAnswers must be used within AnswersProvider");
  return ctx;
}

// pages/quiz.js
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import questions from "../data/questions";

import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

function QuizInner() {
  const router = useRouter();
  const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in
  const [answers, setAnswers] = useState({}); // { [id]: 1..5 }
  const [current, setCurrent] = useState(0);

  // Hooks must always run in the same order — keep useEffects here (above any early returns)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  // Data guards (no early return yet)
  const total = Array.isArray(questions) ? questions.length : 0;
  const hasQuestions = total > 0;
  const safeIndex =
    Number.isFinite(current) && current >= 0 && current < total ? current : 0;
  const q = hasQuestions ? questions[safeIndex] : null;

  // These hooks must be called on every render (before any return branches)
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progressPercent = Math.round(total > 0 ? (answeredCount / total) * 100 : 0);

  // After all hooks above, it's safe to return based on state
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Checking your session…</p>
      </div>
    );
  }
  if (user === null) {
    return null; // brief flash before redirect
  }
  if (!hasQuestions || !q || !q.id || !q.text) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Quiz unavailable</h1>
          <p className="text-gray-600">
            No questions found. Please ensure <code>/data/questions.js</code> exports a non-empty array.
          </p>
        </div>
      </div>
    );
  }

  const selectAnswer = (value) => {
    const v = Number(value);
    if (v >= 1 && v <= 5) {
      setAnswers((prev) => ({ ...prev, [q.id]: v }));
    }
  };

  const goNext = () => {
    if (safeIndex < total - 1) {
      setCurrent((c) => c + 1);
    } else {
      const answerArray = questions.map((qq) => {
        const v = answers[qq.id];
        return Number.isFinite(v) ? v : 3; // neutral default
      });
      router.push(`/results?answers=${answerArray.join(",")}`);
    }
  };

  const goBack = () => {
    if (safeIndex > 0) setCurrent((c) => c - 1);
  };

  const hasAnswer = Number.isFinite(answers[q.id]);

  const ScaleButtons = () => {
    const labels = {
      1: "Strongly Disagree",
      2: "Disagree",
      3: "Neutral",
      4: "Agree",
      5: "Strongly Agree",
    };
    return (
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 w-full">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = answers[q.id] === n;
          return (
            <button
              key={n}
              onClick={() => selectAnswer(n)}
              className={[
                "p-3 rounded-lg border transition text-sm sm:text-base",
                selected
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-800 border-gray-300 hover:border-indigo-400",
              ].join(" ")}
            >
              <div className="font-semibold">{n}</div>
              <div className="text-xs sm:text-[0.8rem] opacity-80">
                {labels[n]}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const YesNoButtons = () => {
    const opts = [
      { label: "Yes", value: 5 },
      { label: "No", value: 1 },
    ];
    return (
      <div className="flex gap-3 w-full justify-center">
        {opts.map(({ label, value }) => {
          const selected = answers[q.id] === value;
          return (
            <button
              key={label}
              onClick={() => selectAnswer(value)}
              className={[
                "px-6 py-3 rounded-lg border transition font-semibold",
                selected
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-800 border-gray-300 hover:border-indigo-400",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Top bar */}
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-800">
          Political Compass Quiz
        </h1>
        <p className="text-gray-600 mt-1">
          Question {safeIndex + 1} of {total}
        </p>

        {/* Progress bar */}
        <div className="mt-4 h-3 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-3 bg-indigo-600 transition-all"
            style={{ width: `${progressPercent}%` }}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          />
        </div>
        <p className="text-sm text-gray-600 mt-1">{progressPercent}% complete</p>
      </div>

      {/* Card */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8">
          <p className="text-lg sm:text-xl font-medium text-gray-900 text-center">
            {q.text}
          </p>

          <div className="mt-6">
            {q.type === "scale" ? <ScaleButtons /> : <YesNoButtons />}
          </div>

          {/* Nav buttons */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={safeIndex === 0}
              className={[
                "px-5 py-3 rounded-lg border font-semibold transition",
                safeIndex === 0
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "text-gray-700 border-gray-300 hover:border-gray-400",
              ].join(" ")}
            >
              ← Back
            </button>

            <button
              onClick={goNext}
              disabled={!hasAnswer}
              className={[
                "px-6 py-3 rounded-lg font-semibold transition",
                hasAnswer
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed",
              ].join(" ")}
            >
              {safeIndex < total - 1 ? "Next →" : "Submit Results"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client-only page to avoid hydration issues with auth/router
export default dynamic(() => Promise.resolve(QuizInner), { ssr: false });

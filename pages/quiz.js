// pages/quiz.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import questions from "../data/questions";
import { loadAnswers, saveAnswers, groupQuestions } from "../lib/answers";

const LABELS = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

export default function QuizPage() {
  const router = useRouter();
  const startMode = (router.query.start || "").toString().toLowerCase(); // "" | "advanced"

  // Split questions once
  const { core, advanced } = useMemo(() => groupQuestions(questions), []);

  // If start=advanced, limit to advanced 20; else full 40
  const quizList = useMemo(() => {
    if (startMode === "advanced") return advanced;
    return [...core, ...advanced];
  }, [core, advanced, startMode]);

  // All answers (we load and then only update keys we ask about)
  const [answers, setAnswers] = useState({});
  const [ready, setReady] = useState(false);

  // Position is within the *current* quizList (not the global 40)
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const loaded = await loadAnswers(); // from Firestore (if authed) with local fallback
      setAnswers(loaded || {});
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    // Reset index if user navigates between modes
    setIdx(0);
  }, [startMode]);

  if (!ready) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p>Loading quiz…</p>
      </div>
    );
  }

  const total = quizList.length; // 20 in advanced-only, 40 otherwise
  const q = quizList[idx];

  const setChoice = async (choice) => {
    // Merge only this question id, never wipe others
    const next = { ...answers, [q.id]: choice };
    setAnswers(next);
    // Persist merged answers (server + local)
    saveAnswers(next);
  };

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => setIdx((i) => Math.min(total - 1, i + 1));

  const onSubmit = async () => {
    // Nothing special to do; answers already saved incrementally.
    // Just send the user to profile.
    router.push("/profile");
  };

  const currentAnswer = answers[q.id];
  const progressPct = Math.round(((idx + 1) / total) * 100);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {startMode === "advanced" ? "Quiz — Advanced (20)" : "Quiz — Full (40)"}
        </h1>
        {startMode !== "advanced" ? (
          <a
            href="/quiz?start=advanced"
            className="text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
            title="Jump straight to the advanced 20"
          >
            Advanced only
          </a>
        ) : (
          <a
            href="/quiz"
            className="text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
            title="Go back to the full quiz"
          >
            Full quiz
          </a>
        )}
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
          <span>
            Question {idx + 1} / {total}
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded">
          <div
            className="h-2 bg-black rounded"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded border bg-white p-5 shadow-sm">
        {q.axis && (
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {q.axis}
          </div>
        )}
        <div className="text-lg font-medium mb-4">{q.text}</div>

        <div className="grid gap-2">
          {[1, 2, 3, 4, 5].map((v) => {
            const active = Number(currentAnswer) === v;
            return (
              <button
                key={v}
                onClick={() => setChoice(v)}
                className={`w-full text-left px-3 py-2 rounded border transition ${
                  active
                    ? "bg-black text-white border-black"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                {LABELS[v]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={idx === 0}
          className={`px-4 py-2 rounded border ${
            idx === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
          }`}
        >
          Back
        </button>

        {idx < total - 1 ? (
          <button
            onClick={goNext}
            className="px-4 py-2 rounded bg-black text-white hover:bg-gray-900"
          >
            Next
          </button>
        ) : (
          <button
            onClick={onSubmit}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            See Results
          </button>
        )}
      </div>

      {/* Help text */}
      <p className="mt-4 text-sm text-gray-600">
        Your selections save automatically. In{" "}
        <span className="font-medium">
          {startMode === "advanced" ? "Advanced mode" : "Full mode"}
        </span>
        , we only update answers for the questions you see here; existing answers
        for other sections are preserved.
      </p>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import questions from "../data/questions";

export default function Quiz() {
  const router = useRouter();
  const [answers, setAnswers] = useState({}); // { [id]: 1..5 }
  const [current, setCurrent] = useState(0);

  const q = questions[current];
  const total = questions.length;

  // Count how many answers are filled to drive the progress bar
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progressPercent = Math.round((answeredCount / total) * 100);

  const selectAnswer = (value) => {
    // value must be 1..5 to match the results scoring
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  };

  const goNext = () => {
    if (current < total - 1) {
      setCurrent((c) => c + 1);
    } else {
      // Submit
      const answerArray = questions.map((qq) => answers[qq.id] ?? 3); // default neutral
      router.push(`/results?answers=${answerArray.join(",")}`);
    }
  };

  const goBack = () => {
    if (current > 0) setCurrent((c) => c - 1);
  };

  const hasAnswer = answers[q.id] !== undefined;

  // Render 1–5 scale buttons
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
                  : "bg-white text-gray-800 border-gray-300 hover:border-indigo-400"
              ].join(" ")}
            >
              <div className="font-semibold">{n}</div>
              <div className="text-xs sm:text-[0.8rem] opacity-80">{labels[n]}</div>
            </button>
          );
        })}
      </div>
    );
  };

  // Render Yes/No mapped to 5/1 so results.js can treat on the same 1–5 scale
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
                  : "bg-white text-gray-800 border-gray-300 hover:border-indigo-400"
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
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-800">Political Compass Quiz</h1>
        <p className="text-gray-600 mt-1">
          Question {current + 1} of {total}
        </p>

        {/* Progress bar that automatically reflects number of questions */}
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
          <p className="text-lg sm:text-xl font-medium text-gray-900 text-center">{q.text}</p>

          <div className="mt-6">
            {q.type === "scale" ? <ScaleButtons /> : <YesNoButtons />}
          </div>

          {/* Nav buttons */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={current === 0}
              className={[
                "px-5 py-3 rounded-lg border font-semibold transition",
                current === 0
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "text-gray-700 border-gray-300 hover:border-gray-400"
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
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              ].join(" ")}
            >
              {current < total - 1 ? "Next →" : "Submit Results"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

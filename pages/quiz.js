// pages/quiz.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import questions from "../data/questions";

export default function Quiz() {
  const router = useRouter();

  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState("core"); // 'core' | 'prompt-advanced' | 'advanced'

  const totalCore = 20;
  const totalAdvanced = questions.length - totalCore; // 20
  const totalThisRun = phase === "advanced" ? questions.length : totalCore;

  // NEW: allow jumping straight to advanced via query
  useEffect(() => {
    if (!router.isReady) return;
    const jump = String(router.query.start || "").toLowerCase() === "advanced";
    if (jump) {
      setPhase("advanced");
      setCurrent(totalCore); // start at Q21
    }
  }, [router.isReady, router.query, totalCore]);

  const q = questions[current];
  const hasAnswer = q && answers[q.id] !== undefined;

  const answeredCount = useMemo(() => {
    const ids = (phase === "advanced" ? questions : questions.slice(0, totalCore)).map((qq) => qq.id);
    return ids.filter((id) => answers[id] !== undefined).length;
  }, [answers, phase]);

  const progressPercent = Math.round((answeredCount / totalThisRun) * 100);

  const selectAnswer = (value) => {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  };

  const goNext = () => {
    if (!q) return;
    const lastIndexThisPhase = (phase === "advanced" ? questions.length : totalCore) - 1;

    if (current < lastIndexThisPhase) {
      setCurrent((c) => c + 1);
    } else {
      if (phase === "core") {
        setPhase("prompt-advanced");
      } else {
        const answerArray = questions.map((qq) => answers[qq.id] ?? 3);
        router.push(`/results?answers=${answerArray.join(",")}`);
      }
    }
  };

  const goBack = () => {
    if (phase === "prompt-advanced") {
      setPhase("core");
      setCurrent(totalCore - 1);
      return;
    }
    if (current > 0) setCurrent((c) => c - 1);
  };

  const ScaleButtons = () => {
    const labels = { 1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree" };
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
                selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-800 border-gray-300 hover:border-indigo-400",
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

  const YesNoButtons = () => {
    const opts = [{ label: "Yes", value: 5 }, { label: "No", value: 1 }];
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
                selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-800 border-gray-300 hover:border-indigo-400",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  if (phase === "prompt-advanced") {
    const coreAnswered = questions.slice(0, totalCore).map((qq) => answers[qq.id] ?? 3);
    const onFinishCore = () => router.push(`/results?answers=${coreAnswered.join(",")}`);
    const onStartAdvanced = () => { setPhase("advanced"); setCurrent(totalCore); };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center">
        <div className="max-w-2xl mx-auto px-4 py-10 bg-white shadow-lg rounded-xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-indigo-800">Go deeper?</h1>
          <p className="mt-2 text-gray-700">
            You’ve completed the <strong>20 core questions</strong>. Continue with the next <strong>20 advanced</strong> for two extra axes.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button onClick={onStartAdvanced} className="px-6 py-3 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
              Yes, continue (20 more)
            </button>
            <button onClick={onFinishCore} className="px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-900 hover:bg-gray-300">
              No thanks — see results
            </button>
          </div>
          <button onClick={goBack} className="mt-6 text-sm text-gray-600 underline">← Back</button>
        </div>
      </div>
    );
  }

  const total = totalThisRun;
  const indexWithinPhase = current < totalCore ? current : current - totalCore;
  const whichSet = phase === "advanced" ? `Advanced (${indexWithinPhase + 1} of ${totalAdvanced})` : `Core (${current + 1} of ${totalCore})`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-800">Political Spectrum Quiz</h1>
        <p className="text-gray-600 mt-1">{whichSet}</p>

        <div className="mt-4 h-3 w-full bg-gray-200 rounded-full overflow-hidden">
          <div className="h-3 bg-indigo-600 transition-all" style={{ width: `${progressPercent}%` }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} />
        </div>
        <p className="text-sm text-gray-600 mt-1">{progressPercent}% complete</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8">
          <p className="text-lg sm:text-xl font-medium text-gray-900 text-center">{q?.text}</p>
          <div className="mt-6">{q?.type === "yesno" ? <YesNoButtons /> : <ScaleButtons />}</div>

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={phase !== "advanced" ? current === 0 : current === totalCore}
              className={[
                "px-5 py-3 rounded-lg border font-semibold transition",
                (phase !== "advanced" ? current === 0 : current === totalCore)
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
                hasAnswer ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-300 text-gray-600 cursor-not-allowed",
              ].join(" ")}
            >
              {phase === "advanced"
                ? (current < questions.length - 1 ? "Next →" : "See Results")
                : (current < totalCore - 1 ? "Next →" : "Continue")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

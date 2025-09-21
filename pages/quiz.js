// pages/quiz.js
import { useState, useEffect } from "react";
import questions from "../data/questions";
import { useRouter } from "next/router";
import { loadAnswers, saveAnswers } from "../lib/answers";

export default function Quiz() {
  const router = useRouter();
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    // Load existing answers (Firestore if authed, else local)
    (async () => {
      const loaded = await loadAnswers();
      setAnswers(loaded);
    })();
  }, []);

  const question = questions[current];

  const handleAnswer = async (value) => {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    // Persist immediately (Firestore if authed; always mirror local)
    await saveAnswers(next);

    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      // Navigate to results (no need to encode answers in URL anymore, but harmless if you want)
      router.push(`/results`);
    }
  };

  const renderOptions = () => {
    if (question.type === "scale") {
      return [1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => handleAnswer(n)} className="m-2 p-2 border">
          {n}
        </button>
      ));
    } else {
      return (
        <>
          <button onClick={() => handleAnswer(1)} className="m-2 p-2 border">Yes</button>
          <button onClick={() => handleAnswer(0)} className="m-2 p-2 border">No</button>
        </>
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-xl font-bold mb-4">Question {current + 1} of {questions.length}</h1>
      <p className="text-center mb-6">{question.text}</p>
      <div>{renderOptions()}</div>
    </div>
  );
}

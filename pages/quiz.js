// pages/quiz.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import questions from '../data/questions';

export default function Quiz() {
  const router = useRouter();
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const total = questions.length;

  const question = questions[current];

  useEffect(() => {
    // Load any saved answers (optional)
    try {
      const saved = localStorage.getItem('pc_answers');
      if (saved) setAnswers(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    // Persist answers for results page
    try {
      localStorage.setItem('pc_answers', JSON.stringify(answers));
    } catch {}
  }, [answers]);

  const handleAnswer = (value) => {
    const updated = { ...answers, [question.id]: value };
    setAnswers(updated);

    if (current < total - 1) {
      setCurrent((c) => c + 1);
    } else {
      // Navigate to results
      router.push('/results');
    }
  };

  const progress = Math.round(((current + 1) / total) * 100);

  return (
    <div className="min-h-screen px-5 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Quiz</h1>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>Question {current + 1} of {total}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 h-2 rounded">
          <div className="h-2 bg-blue-600 rounded" style={{ width: progress + '%' }} />
        </div>
      </div>

      {/* Question */}
      <div className="border rounded p-5 bg-white">
        <p className="text-lg mb-5">{question.text}</p>

        {/* 5-point Likert (1..5). Adjust labels to your preference */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              onClick={() => handleAnswer(v)}
              className={`px-3 py-2 rounded border hover:bg-gray-50 ${
                answers[question.id] === v ? 'bg-black text-white' : 'bg-white'
              }`}
            >
              {v === 1 ? 'Strongly Disagree' :
               v === 2 ? 'Disagree' :
               v === 3 ? 'Neutral' :
               v === 4 ? 'Agree' : 'Strongly Agree'}
            </button>
          ))}
        </div>
      </div>

      {/* Optional: Back button */}
      <div className="mt-4">
        <button
          className="text-sm underline"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
        >
          Back
        </button>
      </div>
    </div>
  );
}

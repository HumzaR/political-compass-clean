// pages/my-answers.js
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import questions from '../data/questions';
import { loadAnswers, saveAnswers, groupQuestions } from '../lib/answers';

const LABELS = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Neutral',
  4: 'Agree',
  5: 'Strongly Agree',
};

function AnswerBadge({ value }) {
  return (
    <span className="text-xs px-2 py-1 rounded-full border">
      {value ? LABELS[value] : '—'}
    </span>
  );
}

function QuestionRow({ q, value, onChange }) {
  return (
    <div className="relative group border rounded p-3 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          {q.axis && (
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              {q.axis}
            </div>
          )}
          <div className="font-medium">{q.text}</div>
        </div>
        <AnswerBadge value={value} />
      </div>

      {/* Hover / focus menu */}
      <div
        className="pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 transition
                   absolute right-3 top-3 z-20 bg-white border rounded shadow"
      >
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            className={`block text-left px-3 py-1 text-sm w-56 hover:bg-gray-50 ${
              value === v ? 'bg-black text-white hover:bg-black' : ''
            }`}
            onClick={() => onChange(q.id, v)}
          >
            {LABELS[v]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MyAnswersPage() {
  const [answers, setAnswers] = useState({});
  const { core, advanced, hot } = useMemo(() => groupQuestions(questions), []);

  useEffect(() => {
    (async () => {
      const loaded = await loadAnswers();
      setAnswers(loaded);
    })();
  }, []);

  const handleChange = async (qid, choice) => {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: choice };
      // Optimistic: update immediately
      saveAnswers(next); // Firestore (if authed) + local mirror
      return next;
    });
  };

  const renderSection = (title, list) => {
    const answeredQs = list.filter((q) => answers[q.id] != null);
    if (!answeredQs.length) return null;
    return (
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <div className="grid gap-3">
          {answeredQs.map((q) => (
            <QuestionRow
              key={q.id}
              q={q}
              value={answers[q.id]}
              onChange={handleChange}
            />
          ))}
        </div>
      </section>
    );
  };

  const totalAnswered = Object.keys(answers).length;

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">My Answers</h1>
        <a href="/results" className="text-sm px-3 py-2 rounded border hover:bg-gray-50">
          View Results
        </a>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Hover any question to change your answer. Changes save immediately and will be reflected in your scores.
      </p>

      <div className="mb-6 border rounded p-4 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-700">
            Answered: <span className="font-medium">{totalAnswered}</span> / {questions.length}
          </div>

          {/* Button to jump to the advanced 20; shows until all 40 are done */}
          {totalAnswered < 40 && (
            <Link
              href="/quiz?start=advanced"
              className="inline-flex items-center rounded-md border border-indigo-600 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Complete advanced 20
            </Link>
          )}
        </div>
      </div>

      {renderSection('Core (first 20)', core)}
      {renderSection('Advanced (second 20)', advanced)}
      {renderSection('Hot Topics', hot)}

      {totalAnswered === 0 && (
        <div className="text-sm text-gray-600">
          You haven’t answered anything yet. Go to the{' '}
          <a className="underline" href="/quiz">
            Quiz
          </a>
          .
        </div>
      )}
    </div>
  );
}

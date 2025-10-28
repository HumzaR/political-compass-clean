// pages/my-answers.js
import { useEffect, useMemo, useState } from 'react';
import questions from '../data/questions';
import { computeContributions, aggregateAxes } from '../lib/scoring';

const LABELS = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Neutral',
  4: 'Agree',
  5: 'Strongly Agree',
};

function loadAnswers() {
  try {
    const raw = localStorage.getItem('pc_answers');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveAnswers(a) {
  try {
    localStorage.setItem('pc_answers', JSON.stringify(a));
  } catch {}
}

function groupQuestions(allQs) {
  const hot = allQs.filter((q) => q.type === 'hot');
  const nonHot = allQs.filter((q) => q.type !== 'hot');
  const core = nonHot.slice(0, 20);
  const advanced = nonHot.slice(20, 40);
  return { core, advanced, hot };
}

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
          <div className="text-xs text-gray-500 uppercase tracking-wide">{q.axis}</div>
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

  // Live scores
  const { normalized, answeredCount } = useMemo(() => {
    const contribs = computeContributions(answers, questions);
    const agg = aggregateAxes(contribs, questions);
    return {
      normalized: agg.normalized,
      answeredCount: Object.keys(answers).length,
    };
  }, [answers]);

  useEffect(() => {
    setAnswers(loadAnswers());
  }, []);

  const handleChange = (qid, choice) => {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: choice };
      saveAnswers(next);
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
            <QuestionRow key={q.id} q={q} value={answers[q.id]} onChange={handleChange} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <h1 className="text-2xl font-semibold mb-1">My Answers</h1>
      <p className="text-sm text-gray-600 mb-6">
        Hover any question to change your answer. Updates apply immediately and reflect in your results.
      </p>

      {/* Live score preview */}
      <div className="mb-6 grid sm:grid-cols-2 gap-4">
        <div className="border rounded p-4 bg-white">
          <h3 className="font-semibold mb-2">Live Axis Scores</h3>
          <ul className="text-sm space-y-1">
            {Object.entries(normalized).map(([axis, val]) =>
              typeof val === 'number' ? (
                <li key={axis} className="flex justify-between">
                  <span className="capitalize">{axis}</span>
                  <span>{val.toFixed(3)}</span>
                </li>
              ) : null
            )}
          </ul>
        </div>
        <div className="border rounded p-4 bg-white">
          <h3 className="font-semibold mb-2">Progress</h3>
          <p className="text-sm text-gray-700">
            Answered: <span className="font-medium">{answeredCount}</span> / {questions.length}
          </p>
        </div>
      </div>

      {renderSection('Core (first 20)', core)}
      {renderSection('Advanced (second 20)', advanced)}
      {renderSection('Hot Topics', hot)}

      {Object.keys(answers).length === 0 && (
        <div className="text-sm text-gray-600">
          You haven’t answered anything yet. Go to the <a className="underline" href="/quiz">Quiz</a>.
        </div>
      )}
    </div>
  );
}

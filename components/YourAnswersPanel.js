// components/YourAnswersPanel.js
import { useEffect, useMemo, useState } from 'react';
import questions from '../data/questions';
import { loadAnswers } from '../lib/answers';

const LABELS = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Neutral',
  4: 'Agree',
  5: 'Strongly Agree',
};

function groupQuestions(all = questions) {
  const hot = all.filter((q) => q.type === 'hot');
  const main = all.filter((q) => q.type !== 'hot');
  const core = main.slice(0, 20);
  const advanced = main.slice(20, 40);
  return { core, advanced, hot };
}

function Row({ q, value }) {
  return (
    <div className="border rounded p-3 bg-white">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{q.axis}</div>
      <div className="font-medium">{q.text}</div>
      <div className="mt-1 text-sm">
        <span className="px-2 py-0.5 rounded-full border">
          {value ? LABELS[value] : '—'}
        </span>
      </div>
    </div>
  );
}

export default function YourAnswersPanel() {
  const [answers, setAnswers] = useState({});
  const { core, advanced, hot } = useMemo(() => groupQuestions(), []);

  useEffect(() => {
    (async () => {
      const a = await loadAnswers(); // Firestore-first, local fallback
      setAnswers(a);
    })();
  }, []);

  const answered = (list) => list.filter((q) => answers[q.id] != null);

  return (
    <div id="your-answers" className="max-w-3xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Your Answers</h2>
        <a href="/my-answers" className="text-sm px-3 py-2 rounded border hover:bg-gray-50">
          Edit answers
        </a>
      </div>

      <section className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Core (first 20)</h3>
        <div className="grid gap-3">
          {answered(core).map((q) => <Row key={q.id} q={q} value={answers[q.id]} />)}
          {answered(core).length === 0 && <div className="text-sm text-gray-500">No answers yet.</div>}
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Advanced (second 20)</h3>
        <div className="grid gap-3">
          {answered(advanced).map((q) => <Row key={q.id} q={q} value={answers[q.id]} />)}
          {answered(advanced).length === 0 && <div className="text-sm text-gray-500">No answers yet.</div>}
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Hot Topics</h3>
        <div className="grid gap-3">
          {answered(hot).map((q) => <Row key={q.id} q={q} value={answers[q.id]} />)}
          {answered(hot).length === 0 && <div className="text-sm text-gray-500">No hot topic answers yet.</div>}
        </div>
      </section>
    </div>
  );
}

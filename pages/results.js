// pages/results.js
import { useEffect, useState } from 'react';
import questions from '../data/questions';
import { computeContributions, aggregateAxes, topDrivers } from '../lib/scoring';

export default function Results() {
  const [normalized, setNormalized] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [debug, setDebug] = useState(null);

  useEffect(() => {
    let answers = {};
    try {
      const raw = localStorage.getItem('pc_answers');
      if (raw) answers = JSON.parse(raw);
    } catch {}

    const contribs = computeContributions(answers, questions);
    const agg = aggregateAxes(contribs, questions);
    setNormalized(agg.normalized);
    setDrivers(topDrivers(contribs, 5));
    setDebug({ answers, sums: agg.sums, norms: agg.norms, normalized: agg.normalized });
  }, []);

  return (
    <div className="min-h-screen px-5 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Your Results</h1>
        <a href="/my-answers" className="text-sm px-3 py-2 rounded border hover:bg-gray-50">✏️ Edit answers</a>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded p-5 bg-white">
          <h2 className="text-lg font-semibold mb-2">Axis overview</h2>
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

        <div className="border rounded p-5 bg-white">
          <h3 className="text-lg font-semibold mb-2">Top drivers</h3>
          <ul className="space-y-2 text-sm">
            {drivers.map((d) => (
              <li key={d.qid} className="p-3 border rounded bg-white">
                <div className="text-xs text-gray-600 uppercase tracking-wide">{d.axis}</div>
                <div className="font-medium">{d.text}</div>
                <div className="mt-1">Contribution: {d.contribution.toFixed(3)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="text-left mt-6 p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Debug</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{JSON.stringify(debug, null, 2)}
        </pre>
      </div>
    </div>
  );
}

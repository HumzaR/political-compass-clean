// pages/results.js
import { useEffect, useState } from 'react';
import questions from '../data/questions';
import { computeContributions, aggregateAxes, topDrivers } from '../lib/scoring';
import MiniBars from '../components/MiniBars';
import TopDrivers from '../components/TopDrivers';

export default function Results() {
  const [answers, setAnswers] = useState({});
  const [normalized, setNormalized] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [debug, setDebug] = useState(null);

  useEffect(() => {
    // Load answers saved by the quiz
    let a = {};
    try {
      const saved = localStorage.getItem('pc_answers');
      if (saved) a = JSON.parse(saved);
    } catch {}
    setAnswers(a);

    const contribs = computeContributions(a, questions);
    const agg = aggregateAxes(contribs, questions);
    const top = topDrivers(contribs, 5);

    setNormalized(agg.normalized);
    setDrivers(top);
    setDebug({
      answers: a,
      contribsSample: contribs.slice(0, 5),
      sums: agg.sums,
      norms: agg.norms,
      normalized: agg.normalized,
    });
  }, []);

  return (
    <div className="min-h-screen px-5 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Your Results</h1>

      {/* Quick orientation */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded p-5 bg-white">
          <h2 className="text-lg font-semibold mb-2">Axis overview</h2>
          <MiniBars values={normalized} />
          <p className="mt-3 text-sm text-gray-600">
            Scores are normalized to <code>[-1, 1]</code> (Left↔Right on Economic, Libertarian↔Authoritarian on Social).
          </p>
        </div>

        <div className="border rounded p-5 bg-white">
          <TopDrivers drivers={drivers} />
        </div>
      </div>

      {/* Optional: show raw debug for transparency during dev */}
      <div className="text-left mt-6 p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Debug (dev-only)</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{JSON.stringify(debug, null, 2)}
        </pre>
      </div>
    </div>
  );
}

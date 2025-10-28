// pages/results.js
import Head from "next/head";
import { useAnswers } from "@/lib/answers";
import { computeAxisScores, summarizeQuadrant, topDrivers } from "@/lib/scoring";
import { QUESTIONS } from "@/lib/questions";

export async function getServerSideProps() {
  return { props: {} };
}

function AxisBar({ label, value }) {
  const pct = Math.max(-100, Math.min(100, Number(value || 0)));
  const left = pct < 0 ? Math.abs(pct) : 0;
  const right = pct > 0 ? pct : 0;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-600">{pct > 0 ? `+${pct}` : `${pct}`}</div>
      </div>
      <div className="h-3 rounded bg-gray-200 overflow-hidden flex">
        <div className="bg-red-400" style={{ width: `${left}%` }} />
        <div className="flex-1" />
        <div className="bg-green-500" style={{ width: `${right}%` }} />
      </div>
      <div className="flex text-[11px] text-gray-500 mt-1 justify-between">
        <span>−100</span><span>0</span><span>+100</span>
      </div>
    </div>
  );
}

export default function ResultsPage() {
const { answers } = useAnswers();
// pass the QUESTIONS array to the scoring helpers
const scores = computeAxisScores(answers, QUESTIONS);
const quadrant = summarizeQuadrant(scores);
const drivers = topDrivers(answers, QUESTIONS);

  return (
    <>
      <Head>
        <title>Results</title>
      </Head>

      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold mb-2">Your Results</h1>
        <p className="text-sm text-gray-600 mb-6">
          A quick snapshot of where you sit on key axes. Numbers are normalized to a −100..+100 scale.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="text-sm text-gray-600 mb-2">Summary</div>
            <div className="text-xl font-semibold">{quadrant}</div>
            <div className="mt-3 text-sm text-gray-700">
              Economic: <span className="font-medium">{scores.economic}</span>
              <br />
              Social: <span className="font-medium">{scores.social}</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-5">
            <div className="text-sm text-gray-600 mb-3">Axis Scores</div>
            <AxisBar label="Economic (Market vs Equality)" value={scores.economic} />
            <AxisBar label="Social (Libertarian vs Authoritarian)" value={scores.social} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-5 mb-8">
          <div className="text-sm text-gray-600 mb-3">Top Drivers</div>
          {!drivers.length ? (
            <div className="text-gray-600 text-sm">We’ll highlight the answers with the largest influence once you complete more questions.</div>
          ) : (
            <ol className="list-decimal ml-5 space-y-1 text-sm">
              {drivers.map((d) => (
                <li key={d.key}>
                  <span className="font-medium">{d.key}</span> <span className="text-gray-600">(impact {Math.round(d.impact * 100) / 100})</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <details className="rounded-xl border border-gray-200 p-5">
          <summary className="cursor-pointer select-none text-sm font-medium text-gray-900">Debug</summary>
          <pre className="mt-3 text-[12px] overflow-x-auto">{JSON.stringify({ scores, answersSample: Object.fromEntries(Object.entries(answers).slice(0, 10)) }, null, 2)}</pre>
        </details>
      </div>
    </>
  );
}

// components/AIInsightsRight.js
import React from "react";
import { useAnswers } from "@/lib/answers";
import { QUESTIONS } from "@/lib/questions";
import {
  computeAxisScores,
  topDrivers,
  findContradictions,
} from "@/lib/scoring";

export default function AIInsightsRight() {
  const { answers } = useAnswers() || { answers: {} };

  const scores = computeAxisScores(answers, QUESTIONS);
  const drivers = topDrivers(answers, QUESTIONS, 5);
  const contradictions = findContradictions(answers, QUESTIONS);

  return (
    <aside className="rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold mb-2">AI Insights</h3>

      <p className="text-xs text-gray-500 mb-4">
        Based on {Object.keys(answers || {}).length} answered questions
      </p>

      <ul className="list-disc ml-5 space-y-1 text-sm mb-5">
        <li>
          Economic score:{" "}
          <span className="font-medium">{Math.round(scores.economic)}</span>
        </li>
        <li>
          Social score:{" "}
          <span className="font-medium">{Math.round(scores.social)}</span>
        </li>
      </ul>

      <div className="mb-5">
        <div className="text-sm font-medium mb-1">Top Drivers</div>
        {!drivers.length ? (
          <div className="text-sm text-gray-600">
            Keep answering to see the most influential answers.
          </div>
        ) : (
          <ol className="list-decimal ml-5 space-y-1 text-sm">
            {drivers.map((d, i) => (
              <li key={`${d.axis}-${i}`}>
                {d.key}{" "}
                <span className="text-gray-600">
                  (impact {Math.round(d.impact * 100) / 100})
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <div className="text-sm font-medium mb-1">Potential Contradictions</div>
        {!contradictions.length ? (
          <div className="text-sm text-gray-600">None detected.</div>
        ) : (
          <ul className="list-disc ml-5 space-y-1 text-sm">
            {contradictions.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

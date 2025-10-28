// components/AIInsightsRight.js
import React from "react";
import { useAnswers } from "@/lib/answers";
import { QUESTIONS } from "@/lib/questions";
import { computeAxisScores, topDrivers, findContradictions } from "@/lib/scoring";

export default function AIInsightsRight() {
  const { answers } = useAnswers() || { answers: {} };

  const axis = computeAxisScores(answers, QUESTIONS); // if your function takes questions
  const drivers = topDrivers(answers, QUESTIONS, 5);
  const cons = findContradictions(answers, QUESTIONS);

  return (
    <aside className="rounded-lg border p-4">
      <h3 className="font-semibold text-lg">AI Insights</h3>
      <p className="text-sm text-gray-600">
        Based on {Object.keys(answers).length} answered questions
      </p>

      <div className="mt-4">
        <h4 className="font-medium">Top Drivers</h4>
        {drivers.length === 0 ? (
          <p className="text-sm text-gray-600">Answer a few more to see what’s driving your score.</p>
        ) : (
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            {drivers.map((d, i) => (
              <li key={d.id}>
                {d.text}{" "}
                <span className="text-gray-500">
                  — Strong influence ({d.influence.toFixed(2)})
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-6">
        <h4 className="font-medium">Potential Contradictions</h4>
        {cons.length ? (
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {cons.map((c, idx) => <li key={idx}>{c}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">None detected.</p>
        )}
      </div>
    </aside>
  );
}

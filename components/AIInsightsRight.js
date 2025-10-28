// components/AIInsightsRight.js
import React from "react";
import { useAnswers } from "@/lib/answers";          // your context
import { computeAxisScores, topDrivers } from "@/lib/scoring"; // exported in your scoring util

/**
 * We’ll consider "has enough data" when there is at least 1 answered item.
 * If you want to be stricter, bump MIN_ANSWERS up (e.g., 10 or 20).
 */
const MIN_ANSWERS = 1;

export default function AIInsightsRight() {
  const { answers } = useAnswers() || { answers: {} };
  const answeredIds = Object.keys(answers || {});
  const answeredCount = answeredIds.length;

  if (answeredCount < MIN_ANSWERS) {
    return (
      <aside className="w-full md:w-80 lg:w-96 p-4 rounded-xl border bg-white">
        <h3 className="text-lg font-semibold mb-2">AI Insights</h3>
        <p className="text-sm text-gray-600">
          No AI insights yet. Answer a few questions to see your summary here.
        </p>
      </aside>
    );
  }

  // 1) Compute axis scores from your current scoring util
  //    computeAxisScores should return something like:
  //    { economic: number, social: number, ... } in the range your app expects
  const axis = computeAxisScores(answers);

  // 2) Identify top drivers (your helper already exists)
  const drivers = topDrivers(answers, 5); // top 5 by magnitude (adjust as you like)

  // 3) Very lightweight “AI-style” summary (no external calls)
  //    Tailor wording to your axes — this just demonstrates using the values.
  const lines = [];
  if (axis.economic !== undefined) {
    lines.push(
      axis.economic > 0
        ? "You lean pro-market on economic issues."
        : "You lean pro-welfare on economic issues."
    );
  }
  if (axis.social !== undefined) {
    lines.push(
      axis.social > 0
        ? "You lean more libertarian on social policy."
        : "You lean more socially conservative on policy."
    );
  }
  // Add more axes here if your scoring returns them (e.g., authority, globalism, etc.)

  // Simple contradictions pass: look for pairs of answers with opposite intents.
  // This is just a heuristic placeholder so something useful shows up.
  const contradictions = [];
  if (answers["free_market"] === 1 && answers["tax_rise_high_earners"] === 1) {
    contradictions.push(
      "Supports free markets but also favors higher taxes on top earners — consider clarifying your trade-offs."
    );
  }
  if (answers["strong_border_controls"] === 1 && answers["open_migration"] === 1) {
    contradictions.push(
      "Wants strong border controls and open migration — try specifying when each principle should win."
    );
  }

  return (
    <aside className="w-full md:w-80 lg:w-96 p-4 rounded-xl border bg-white">
      <h3 className="text-lg font-semibold mb-3">AI Insights</h3>

      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-1">
          Based on {answeredCount} answered question{answeredCount === 1 ? "" : "s"}
        </div>
        <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <h4 className="font-medium mb-2">Top Drivers</h4>
        {drivers.length === 0 ? (
          <p className="text-sm text-gray-600">No clear drivers identified yet.</p>
        ) : (
          <ol className="list-decimal list-inside text-sm text-gray-800 space-y-1">
            {drivers.map((d, i) => (
              <li key={i}>
                <span className="font-medium">{d.label || d.id}:</span>{" "}
                <span className="text-gray-700">
                  {d.reason || `Strong influence (${Math.round((d.weight || d.score) * 100) / 100})`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <h4 className="font-medium mb-2">Potential Contradictions</h4>
        {contradictions.length === 0 ? (
          <p className="text-sm text-gray-600">None detected.</p>
        ) : (
          <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
            {contradictions.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

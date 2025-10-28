// components/AIInsightsRight.js
import React from "react";
import { useAnswers } from "@/lib/answers";           // your context
import { computeScores, topDrivers } from "@/lib/scoring"; // your scoring utils

export default function AIInsightsRight() {
  const { answers } = useAnswers() || { answers: {} };
  const answeredCount = answers ? Object.keys(answers).length : 0;

  // If no answers at all, keep the CTA
  if (!answeredCount) {
    return (
      <aside className="p-4 rounded-2xl border border-gray-200 bg-white">
        <h3 className="font-semibold mb-2">AI Insights</h3>
        <p className="text-sm text-gray-600">
          No AI insights yet. Answer a few questions to see your summary here.
        </p>
      </aside>
    );
  }

  // Fallback: compute from local answers
  const scores = computeScores(answers); // whatever your function returns
  const drivers = topDrivers ? topDrivers(answers) : [];

  const lines = [];
  if (scores?.economic != null) {
    lines.push(
      scores.economic > 0
        ? "You lean economically liberal."
        : scores.economic < 0
        ? "You lean economically conservative."
        : "You’re balanced on economic questions."
    );
  }
  if (scores?.social != null) {
    lines.push(
      scores.social > 0
        ? "You lean socially progressive."
        : scores.social < 0
        ? "You lean socially traditional."
        : "You’re balanced on social questions."
    );
  }

  const driverLine =
    drivers && drivers.length
      ? `Top drivers: ${drivers.slice(0, 3).map(d => d.label || d.key).join(", ")}.`
      : "";

  const summary = [lines.join(" "), driverLine].filter(Boolean).join(" ");

  return (
    <aside className="p-4 rounded-2xl border border-gray-200 bg-white">
      <h3 className="font-semibold mb-2">AI Insights</h3>
      <p className="text-sm text-gray-800">
        {summary || "We’ve analyzed your current answers — keep going for a richer summary."}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        (This is a local summary. A richer, AI-generated write-up will appear when server insights are enabled.)
      </p>
    </aside>
  );
}

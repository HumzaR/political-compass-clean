// components/AIInsightsRight.js
import React from "react";
import { useAnswers } from "@/lib/answers";
import { computeAxisScores, topDrivers } from "@/lib/scoring";

export default function AIInsightsRight() {
  const { answers, ready } = useAnswers();
  const answeredCount = answers ? Object.keys(answers).length : 0;

  if (!ready) {
    return (
      <aside className="p-4 rounded-2xl border border-gray-200 bg-white">
        <h3 className="font-semibold mb-2">AI Insights</h3>
        <p className="text-sm text-gray-600">Loading your insights…</p>
      </aside>
    );
  }

  if (answeredCount === 0) {
    return (
      <aside className="p-4 rounded-2xl border border-gray-200 bg-white">
        <h3 className="font-semibold mb-2">AI Insights</h3>
        <p className="text-sm text-gray-600">
          No AI insights yet. Answer a few questions to see your summary here.
        </p>
      </aside>
    );
  }

  const axis = computeAxisScores(answers);
  const drivers = typeof topDrivers === "function" ? topDrivers(answers) : [];

  const lines = [];
  if (axis?.economic != null) {
    lines.push(
      axis.economic > 0
        ? "You lean economically liberal."
        : axis.economic < 0
        ? "You lean economically conservative."
        : "You’re balanced on economic questions."
    );
  }
  if (axis?.social != null) {
    lines.push(
      axis.social > 0
        ? "You lean socially progressive."
        : axis.social < 0
        ? "You lean socially traditional."
        : "You’re balanced on social questions."
    );
  }

  const driverLine =
    drivers && drivers.length
      ? `Top drivers: ${drivers.slice(0, 3).map((d) => d.label || d.key).join(", ")}.`
      : "";

  const summary = [lines.join(" "), driverLine].filter(Boolean).join(" ");

  return (
    <aside className="p-4 rounded-2xl border border-gray-200 bg-white">
      <h3 className="font-semibold mb-2">AI Insights</h3>
      <p className="text-sm text-gray-800">
        {summary || "We’ve analyzed your current answers — keep going for a richer summary."}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        (A fuller AI summary & contradictions will reappear when server insights are re-enabled.)
      </p>
    </aside>
  );
}

// src/lib/scoring.ts
export type AxisScores = { economic: number; social: number };

// Clamp to [-100, 100]
const clamp = (n: number) => Math.max(-100, Math.min(100, n));

/**
 * Best-effort scoring:
 * - If answers already contain 'economic'/'social', use those (assumed -100..100).
 * - Otherwise, compute a rough score by averaging any numeric answers tagged with axis-like keys.
 *   This lets the page render even if your old question mapping isn’t wired yet.
 */
export function computeAxisScores(answers: Record<string, any>): AxisScores {
  if (!answers || typeof answers !== "object") return { economic: 0, social: 0 };

  // 1) Direct values present?
  const directE = Number.isFinite(+answers.economic) ? clamp(+answers.economic) : null;
  const directS = Number.isFinite(+answers.social) ? clamp(+answers.social) : null;
  if (directE !== null && directS !== null) return { economic: directE, social: directS };

  // 2) Heuristic: average numeric answers whose key contains axis hints
  let econVals: number[] = [];
  let socVals: number[] = [];

  Object.entries(answers).forEach(([k, v]) => {
    const val = typeof v === "string" ? parseFloat(v) : v;
    if (!Number.isFinite(val)) return;

    const key = k.toLowerCase();
    if (key.includes("econ") || key.includes("tax") || key.includes("market")) {
      econVals.push(val);
    }
    if (key.includes("soc") || key.includes("civil") || key.includes("freedom") || key.includes("authority")) {
      socVals.push(val);
    }
  });

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  // Scale assumed -1..+1 inputs to -100..+100
  const toPct = (x: number) => clamp(Math.round(x * 100));

  return {
    economic: directE ?? toPct(avg(econVals)),
    social: directS ?? toPct(avg(socVals)),
  };
}

export function summarizeQuadrant(scores: AxisScores): string {
  const { economic, social } = scores;
  const econLabel = economic >= 0 ? "Market" : "Equality";
  const socLabel = social >= 0 ? "Libertarian" : "Authoritarian";
  return `${socLabel} • ${econLabel}`;
}

export function topDrivers(answers: Record<string, any>): Array<{ key: string; impact: number }> {
  if (!answers) return [];
  // Pick the top 5 numeric answers by absolute magnitude (heuristic).
  const rows = Object.entries(answers)
    .filter(([, v]) => Number.isFinite(typeof v === "string" ? parseFloat(v) : v))
    .map(([k, v]) => {
      const n = typeof v === "string" ? parseFloat(v) : (v as number);
      return { key: k, impact: Math.abs(n) };
    })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);
  return rows;
}

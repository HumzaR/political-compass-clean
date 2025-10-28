// src/lib/scoring.ts

// -----------------------------
// Types
// -----------------------------
export type Axis = "economic" | "social";

export type AnswerMap = Record<string, number>;

export type Question = {
  id: string;
  axis: Axis;               // "economic" | "social"
  direction: -1 | 1;        // how the positive answer maps to axis (+1 or -1)
  title?: string;           // preferred label (shown in "Top Drivers")
  text?: string;            // fallback label
  prompt?: string;          // fallback label
};

// -----------------------------
// Helpers
// -----------------------------

/**
 * Clamp a number to a range.
 */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Pick a display label for a question.
 */
function questionLabel(q: Question) {
  return q.title || q.text || q.prompt || q.id;
}

/**
 * Returns the subset of QUESTIONS for a given axis.
 */
function byAxis(QUESTIONS: Question[], axis: Axis) {
  return QUESTIONS.filter((q) => q.axis === axis);
}

/**
 * Converts an average in the range [-1, 1] to [-100, 100], rounded to integer.
 */
function toPct01(avg: number) {
  return Math.round(clamp(avg, -1, 1) * 100);
}

// -----------------------------
// Core scoring
// -----------------------------

/**
 * Compute axis scores on a −100..+100 scale.
 *
 * Logic:
 * - Answers are expected to be in a bounded range (e.g., −2..+2).
 * - For each axis, we sum (answer * direction) across questions of that axis.
 * - We normalize by (maxAbsPerQuestion * countAxis) to get a value in [−1, 1],
 *   then multiply by 100.
 *
 * Assumptions:
 * - If you use a different answer range, adjust `MAX_ABS_ANSWER` accordingly.
 */
export function computeAxisScores(
  answers: AnswerMap = {},
  QUESTIONS: Question[] = []
): { economic: number; social: number } {
  const MAX_ABS_ANSWER = 2; // typical 5-point Likert: −2..−1..0..+1..+2

  const axes: Axis[] = ["economic", "social"];
  const out: Record<Axis, number> = {
    economic: 0,
    social: 0,
  };

  for (const axis of axes) {
    const qs = byAxis(QUESTIONS, axis);
    if (qs.length === 0) {
      out[axis] = 0;
      continue;
    }

    // Sum signed pulls for this axis
    let sum = 0;
    let answeredCount = 0;
    for (const q of qs) {
      const raw = answers[q.id];
      if (raw === undefined || raw === null) continue;

      const val = clamp(Number(raw) || 0, -MAX_ABS_ANSWER, MAX_ABS_ANSWER);
      const pull = val * q.direction; // signed contribution
      sum += pull;
      answeredCount += 1;
    }

    if (answeredCount === 0) {
      out[axis] = 0;
      continue;
    }

    // Normalize by max possible absolute sum for the answered questions
    const maxPossible = MAX_ABS_ANSWER * answeredCount; // => maps to 1.0 when fully aligned
    const avg01 = clamp(sum / maxPossible, -1, 1);      // in [-1, 1]
    out[axis] = toPct01(avg01);                         // to [-100, 100]
  }

  return { economic: out.economic, social: out.social };
}

/**
 * Human-friendly quadrant summary from axis scores.
 */
export function summarizeQuadrant(scores: { economic: number; social: number }): string {
  const econ = scores.economic || 0;
  const soc = scores.social || 0;

  const econLabel = econ > 10 ? "Market-leaning" : econ < -10 ? "Equality-leaning" : "Centrally economic";
  const socLabel = soc > 10 ? "Authoritarian-leaning" : soc < -10 ? "Libertarian-leaning" : "Centrally social";

  // Combine to a concise summary
  if (Math.abs(econ) <= 10 && Math.abs(soc) <= 10) return "Centrist";
  return `${econLabel}, ${socLabel}`;
}

// -----------------------------
// Insights (Top Drivers & Contradictions)
// -----------------------------

/**
 * Rank questions by absolute contribution to an axis from the user's answers.
 * Returns top N drivers in the format your UI expects: { key, impact, axis }.
 *
 * 'impact' is the absolute strength of (answer * direction). It is NOT normalized to percent
 * to keep a useful spread; the UI can round/format as desired.
 */
export function topDrivers(
  answers: AnswerMap = {},
  QUESTIONS: Question[] = [],
  limit = 5
): Array<{ key: string; impact: number; axis: Axis }> {
  const items = QUESTIONS
    .filter((q) => answers[q.id] !== undefined)
    .map((q) => {
      const ans = Number(answers[q.id] ?? 0); // e.g., −2..+2
      const pull = ans * q.direction;         // signed contribution
      const impact = Math.abs(pull);          // strength magnitude
      return { id: q.id, key: questionLabel(q), axis: q.axis, pull, impact };
    })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, limit);

  return items.map(({ key, impact, axis }) => ({ key, impact, axis }));
}

/**
 * Heuristic contradictions: detect strong pushes in both directions of the same axis.
 *
 * We aggregate positive and negative pulls per axis. If both sides exceed a threshold,
 * we flag a contradiction note for that axis.
 */
export function findContradictions(
  answers: AnswerMap = {},
  QUESTIONS: Question[] = []
): string[] {
  const pulls = {
    economic: { pos: 0, neg: 0 },
    social: { pos: 0, neg: 0 },
  } as Record<Axis, { pos: number; neg: number }>;

  for (const q of QUESTIONS) {
    const raw = answers[q.id];
    if (raw === undefined || raw === null) continue;

    const val = Number(raw) || 0;
    if (!val) continue;

    const signed = val * q.direction; // + => market/auth, − => equality/lib
    if (signed > 0) pulls[q.axis].pos += signed;
    if (signed < 0) pulls[q.axis].neg += Math.abs(signed);
  }

  const notes: string[] = [];
  // Sensitivity: tune THRESHOLD up (fewer contradictions) or down (more).
  const THRESHOLD = 3;

  if (pulls.economic.pos >= THRESHOLD && pulls.economic.neg >= THRESHOLD) {
    notes.push(
      "Economic: strong support for both market-oriented and equality-oriented positions."
    );
  }
  if (pulls.social.pos >= THRESHOLD && pulls.social.neg >= THRESHOLD) {
    notes.push(
      "Social: strong support for both authoritarian and libertarian positions."
    );
  }

  return notes;
}

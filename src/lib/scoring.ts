// src/lib/scoring.ts
import type { Question } from "./questions";
import type { AnswersMap } from "./answers";

// Keep your existing computeAxisScores here…

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const normAnswer = (v: number) => clamp(v ?? 0, -2, 2);

function influenceFor(q: Question, answer: number): number {
  const w = Number.isFinite(q.weight!) ? (q.weight as number) : 1;
  const dir = Number.isFinite(q.direction!) ? (q.direction as number) : 1;
  const val = normAnswer(answer) * dir;
  const impact = Math.abs(val * w);
  return Number.isFinite(impact) ? impact : 0;
}

export function topDrivers(
  answers: AnswersMap,
  questions: Question[],
  limit = 5
) {
  const rows = questions
    .filter((q) => answers[q.id] !== undefined)
    .map((q) => ({
      id: q.id,
      text: q.text,
      axis: q.axis,
      influence: influenceFor(q, Number(answers[q.id])),
    }))
    .sort((a, b) => b.influence - a.influence)
    .slice(0, limit);

  return rows;
}

// Optional: very simple contradictions heuristic (works if your questions have tags)
// Improve/replace with your previous rule-set when ready.
export function findContradictions(
  answers: AnswersMap,
  questions: Question[]
): string[] {
  // Example heuristic: if the same tag appears on questions answered with strong opposite signs
  // you might be inconsistent on that theme.
  const BY_TAG: Record<string, number[]> = {};
  for (const q of questions) {
    const v = answers[q.id];
    if (v === undefined || !q.tags?.length) continue;
    for (const t of q.tags) {
      (BY_TAG[t] ??= []).push(Number(v));
    }
  }
  const msgs: string[] = [];
  for (const [tag, vals] of Object.entries(BY_TAG)) {
    if (vals.length < 2) continue;
    const hasPos = vals.some((v) => v >= 1.5);
    const hasNeg = vals.some((v) => v <= -1.5);
    if (hasPos && hasNeg) msgs.push(`Possible tension on “${tag}”.`);
  }
  return msgs;
}

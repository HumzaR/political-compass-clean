// src/lib/scoring.ts
import type { Question } from "./questions";
import type { AnswersMap } from "./answers";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const normAnswer = (v: number) => clamp(v ?? 0, -2, 2);

/** Returns { economic, social } on a -100..+100 scale. */
export function computeAxisScores(
  answers: AnswersMap,
  questions: Question[]
): { economic: number; social: number } {
  const axes = {
    economic: { num: 0, den: 0 },
    social: { num: 0, den: 0 },
  } as const;

  let econNum = 0, econDen = 0;
  let socNum = 0, socDen = 0;

  for (const q of questions) {
    const a = answers[q.id];
    if (a === undefined) continue;

    const weight = Number.isFinite(q.weight!) ? (q.weight as number) : 1;
    const dir = Number.isFinite(q.direction!) ? (q.direction as number) : 1;
    const v = normAnswer(Number(a)) * dir;

    if (q.axis === "social") {
      socNum += v * weight;
      socDen += Math.abs(weight) * 2; // max magnitude per answer is 2
    } else {
      econNum += v * weight;
      econDen += Math.abs(weight) * 2;
    }
  }

  const econ = econDen ? (econNum / econDen) * 100 : 0;
  const soc = socDen ? (socNum / socDen) * 100 : 0;

  return {
    economic: clamp(econ, -100, 100),
    social: clamp(soc, -100, 100),
  };
}

/** Simple quadrant blurb based on axis scores. Customize as you like. */
export function summarizeQuadrant(scores: { economic: number; social: number }): string {
  const { economic: e, social: s } = scores;
  const econSide = e >= 0 ? "market-leaning" : "equality-leaning";
  const socSide = s >= 0 ? "more authoritarian on social policy" : "more libertarian on social policy";
  return `You are ${econSide} economically and ${socSide}.`;
}

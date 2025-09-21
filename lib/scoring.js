// lib/scoring.js
// Deterministic, transparent scoring from answers (1..5) + question metadata.
import questions from '../data/questions';

// Contribution per question = (answer - 3) * (weight * direction)
export function computeContributions(answersById, allQs = questions) {
  const out = [];
  for (const q of allQs) {
    const raw = answersById?.[q.id];
    const v = Number(raw);
    if (!Number.isFinite(v)) continue; // skip unanswered
    const weight = Number(q.weight ?? 1);
    const direction = Number(q.direction ?? 1);
    const contrib = (v - 3) * weight * direction;
    out.push({
      id: q.id,
      axis: q.axis,        // "economic" | "social" | "global" | "progress"
      type: q.type,        // "core"/"advanced"/"hot" (or however you label)
      value: v,            // 1..5
      contrib,             // signed contribution
      weight,
      direction,
      text: q.text,
    });
  }
  return out;
}

// Sum contributions by axis and normalize to a compact range for charts.
// We normalize by average |weight| so axes are comparable even if #questions differs.
export function aggregateAxes(contribs, allQs = questions) {
  const axes = ['economic', 'social', 'global', 'progress'];
  const sums = { economic: 0, social: 0, global: 0, progress: 0 };
  const weightSums = { economic: 0, social: 0, global: 0, progress: 0 };

  // Precompute total absolute weights per axis from the configured questions
  const axisAbsWeightTotals = { economic: 0, social: 0, global: 0, progress: 0 };
  for (const q of allQs) {
    const w = Math.abs(Number(q.weight ?? 1));
    if (axes.includes(q.axis)) axisAbsWeightTotals[q.axis] += w;
  }

  for (const c of contribs) {
    if (!axes.includes(c.axis)) continue;
    sums[c.axis] += c.contrib;
    weightSums[c.axis] += Math.abs(c.weight);
  }

  // Normalization:
  // rawAxis = sum(contrib)
  // denom   = max(1, totalAbsWeightForAxis) to avoid division by 0
  // normalized ≈ clamp( rawAxis / denom * SCALE )
  // Choose SCALE so typical values sit in ~[-5, +5]. Adjust if your UI expects a different scale.
  const SCALE = 5;

  const normalized = {};
  for (const ax of axes) {
    const denom = Math.max(1, axisAbsWeightTotals[ax]);
    const raw = sums[ax] / denom * SCALE;
    // clamp to [-5, 5] to keep the visual range sane
    const clamped = Math.max(-5, Math.min(5, raw));
    normalized[ax] = clamped;
  }

  return { sums, weightSums, normalized };
}

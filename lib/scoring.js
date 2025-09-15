// lib/scoring.js
// Transparent scoring utilities for Core/Advanced/Hot questions.

/**
 * Map a 5-point Likert choice (1..5) to a strength in [-2,-1,0,+1,+2].
 * Adjust here if you prefer a different mapping.
 */
export function choiceToStrength(choice) {
  const map = { 1: -2, 2: -1, 3: 0, 4: 1, 5: 2 };
  return map[choice] ?? 0;
}

/**
 * Compute per-question contributions based on answers and question metadata.
 * @param {Object} answers - { [qid]: choice(1..5) }
 * @param {Array} questions - [{id, axis, direction, weight, type, startAt?, endAt?}, ...]
 * @param {Object} opts - { now?: Date, hotHalfLifeDays?: number }
 */
export function computeContributions(answers, questions, opts = {}) {
  const now = opts.now || new Date();
  const halfLife = opts.hotHalfLifeDays ?? 45;
  const lambda = Math.log(2) / halfLife;

  const contribs = [];
  for (const q of questions) {
    const choice = answers[q.id];
    if (choice == null) continue;

    const strength = choiceToStrength(choice);
    let base = (q.direction || 0) * (q.weight || 1) * strength;

    // Optional exponential decay for Hot Topics
    let decay = 1;
    if (q.type === 'hot' && (q.startAt || q.endAt)) {
      const startMs = q.startAt ? new Date(q.startAt).getTime() : now.getTime();
      const ageDays = Math.max(0, (now.getTime() - startMs) / (1000 * 60 * 60 * 24));
      decay = Math.exp(-lambda * ageDays);
    }

    const c = base * decay;
    contribs.push({
      qid: q.id,
      axis: q.axis,
      type: q.type || 'core',
      text: q.text,
      strength,
      weight: q.weight || 1,
      direction: q.direction || 0,
      decay,
      contribution: c,
      abs: Math.abs(c),
    });
  }
  return contribs;
}

/**
 * Aggregate contributions by axis and normalize to [-1, 1].
 * @param {Array} contribs - output of computeContributions
 * @param {Array} questions - to compute per-axis normalization
 */
export function aggregateAxes(contribs, questions) {
  const axes = ['economic', 'social', 'global', 'progress'];
  const sums = Object.fromEntries(axes.map((a) => [a, 0]));
  const norms = Object.fromEntries(axes.map((a) => [a, 0]));

  const byAxisQs = Object.fromEntries(axes.map((a) => [a, questions.filter((q) => q.axis === a)]));

  for (const a of axes) {
    const maxStrength = 2; // from choiceToStrength mapping
    norms[a] = byAxisQs[a].reduce((acc, q) => acc + (q.weight || 1) * maxStrength, 0) || 1;
  }

  for (const c of contribs) {
    if (!sums.hasOwnProperty(c.axis)) sums[c.axis] = 0;
    sums[c.axis] += c.contribution;
  }

  const normalized = {};
  for (const a of Object.keys(sums)) {
    const raw = sums[a] / (norms[a] || 1);
    normalized[a] = Math.max(-1, Math.min(1, raw));
  }
  return { sums, norms, normalized };
}

/**
 * Top N drivers by absolute contribution.
 */
export function topDrivers(contribs, n = 5) {
  const sorted = [...contribs].sort((a, b) => b.abs - a.abs);
  return sorted.slice(0, n);
}

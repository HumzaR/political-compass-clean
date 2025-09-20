// lib/scoring.js

// Map 1..5 (Likert) -> -2..+2
export function choiceToStrength(choice) {
  const map = { 1: -2, 2: -1, 3: 0, 4: 1, 5: 2 };
  return map[choice] ?? 0;
}

// Compute per-question contributions (supports hot topics with decay)
export function computeContributions(answers, questions, opts = {}) {
  const now = opts.now || new Date();
  const halfLife = opts.hotHalfLifeDays ?? 45;
  const lambda = Math.log(2) / halfLife;

  const out = [];
  for (const q of questions) {
    const choice = answers[q.id];
    if (choice == null) continue;

    const strength = choiceToStrength(choice);
    const base = (q.direction || 0) * (q.weight || 1) * strength;

    let decay = 1;
    if (q.type === 'hot' && (q.startAt || q.endAt)) {
      const startMs = q.startAt ? new Date(q.startAt).getTime() : now.getTime();
      const ageDays = Math.max(0, (now.getTime() - startMs) / (1000 * 60 * 60 * 24));
      decay = Math.exp(-lambda * ageDays);
    }

    const contribution = base * decay;

    out.push({
      qid: q.id,
      axis: q.axis,
      type: q.type || 'core',
      text: q.text,
      strength,
      weight: q.weight || 1,
      direction: q.direction || 0,
      decay,
      contribution,
      abs: Math.abs(contribution),
    });
  }
  return out;
}

// Aggregate by axis and normalize to [-1, 1]
export function aggregateAxes(contribs, questions) {
  const axes = ['economic', 'social', 'global', 'progress'];
  const sums = Object.fromEntries(axes.map((a) => [a, 0]));
  const norms = Object.fromEntries(axes.map((a) => [a, 0]));

  const maxStrength = 2;
  for (const a of axes) {
    const qs = questions.filter((q) => q.axis === a);
    norms[a] = qs.reduce((acc, q) => acc + (q.weight || 1) * maxStrength, 0) || 1;
  }

  for (const c of contribs) {
    if (!(c.axis in sums)) sums[c.axis] = 0;
    sums[c.axis] += c.contribution;
  }

  const normalized = {};
  for (const a of Object.keys(sums)) {
    const raw = sums[a] / (norms[a] || 1);
    normalized[a] = Math.max(-1, Math.min(1, raw));
  }
  return { sums, norms, normalized };
}

// Top N drivers by absolute contribution
export function topDrivers(contribs, n = 5) {
  return [...contribs].sort((a, b) => b.abs - a.abs).slice(0, n);
}

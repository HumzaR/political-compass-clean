export function normalizeLimit(input, { min = 1, max = 100, fallback = 50 } = {}) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

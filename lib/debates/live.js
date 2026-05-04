export function buildDailyRoomUrl(dailyDomain, debateId) {
  const normalizedDomain = dailyDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${normalizedDomain}/debate-${debateId}`;
}

export function getConfiguredDailyDomain(env = process.env) {
  const raw = env.DAILY_DOMAIN || env.NEXT_PUBLIC_DAILY_DOMAIN || "";
  const normalized = raw.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return normalized || null;
}

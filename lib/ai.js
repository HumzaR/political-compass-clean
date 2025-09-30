// lib/ai.js
export async function fetchAIInsights({ answersById, finalScores }) {
  try {
    const r = await fetch("/api/ai-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answersById, finalScores }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${r.status}`);
    }
    return await r.json();
  } catch (e) {
    return { ok: false, error: e.message || "Failed to fetch AI insights" };
  }
}

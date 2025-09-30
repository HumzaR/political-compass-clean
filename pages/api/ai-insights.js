// pages/api/ai-insights.js
export const config = { api: { bodyParser: true } };

import questions from "../../data/questions";

// Map 1..5 to labels (keep in sync with UI)
const LABELS = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

function compactAnswers(answersById) {
  const items = [];
  for (const q of questions) {
    const v = Number(answersById?.[q.id]);
    if (!Number.isFinite(v)) continue;
    items.push({
      id: q.id,
      axis: q.axis,
      text: q.text,
      value: v,
      label: LABELS[v] || String(v),
    });
  }
  return items;
}

async function openaiJSON({ system, user, model = "gpt-4o-mini" }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { ok: false, error: "Missing OPENAI_API_KEY" };
  }
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    return { ok: false, error: `OpenAI ${r.status}: ${msg}` };
  }
  const json = await r.json();
  const content = json.choices?.[0]?.message?.content;
  try {
    return { ok: true, data: JSON.parse(content) };
  } catch {
    return { ok: true, data: { raw: content } };
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

    const { answersById, finalScores } = req.body || {};
    if (!answersById || typeof answersById !== "object") {
      return res.status(400).json({ error: "Provide answersById object" });
    }

    const list = compactAnswers(answersById);

    // (1) Contradictions
    const contradictionSystem = `
You are a careful political logic checker. Input is a list of question+answer items (axis, text, chosen label).
Return JSON: { contradictions: [{ qidA, qidB, reason, severity: "low"|"medium"|"high", suggestion }] }
Rules:
- Prefer clear logical tension; avoid mere ideological disagreement.
- Keep "reason" short, specific, neutral.
- Suggest one clarifying thought or angle when helpful.
- If none, contradictions = [].
`;
    const contradictionsResp = await openaiJSON({
      system: contradictionSystem,
      user: JSON.stringify({ items: list }),
    });

    // (2) Summary
    const summarySystem = `
You are a neutral analyst. Summarize the user's results and key drivers.
Return JSON: { summary: string (<=100 words), topDrivers: [{ qid, axis, driver }] (<=5) }.
Tone: non-judgmental, plain English. Avoid loaded language.
If scores missing, infer cautiously from the answer distribution.
`;
    const summaryResp = await openaiJSON({
      system: summarySystem,
      user: JSON.stringify({
        scores: finalScores || null,
        items: list.map(({ id, axis, label }) => ({ id, axis, label })),
      }),
    });

    res.status(200).json({
      ok: true,
      contradictions: contradictionsResp.ok ? (contradictionsResp.data?.contradictions || []) : [],
      summary: summaryResp.ok ? (summaryResp.data?.summary || "") : "",
      topDrivers: summaryResp.ok ? (summaryResp.data?.topDrivers || []) : [],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate insights." });
  }
}

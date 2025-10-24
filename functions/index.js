/* functions/index.js */
const { onDocumentWritten, onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const crypto = require("crypto");
const QUESTIONS = require("./questions.json");

// Run your functions in London
setGlobalOptions({ region: "europe-west2" });

if (admin.apps.length === 0) {
  admin.initializeApp();
}

/** Bump this if you change prompts/format and want to force fresh AI output */
const AI_VERSION = "v1";

/** Optional: set this as a runtime env var or Secret in your project */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/** ---- Utilities ---- **/
function stableStringify(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",")}}`;
}

function hashAnswers(answers) {
  const h = crypto.createHash("sha256");
  h.update(stableStringify(answers || {}));
  return h.digest("hex");
}

// Scores mirror your app logic: (-5..5) per axis, normalized by abs(weights)
function computeScores(answersById) {
  const axes = ["economic", "social", "global", "progress"];
  const sums = { economic: 0, social: 0, global: 0, progress: 0 };
  const absTotals = { economic: 0, social: 0, global: 0, progress: 0 };
  const SCALE = 5;

  for (const q of QUESTIONS) {
    const w = Number(q.weight ?? 1);
    const wAbs = Math.abs(w);
    if (axes.includes(q.axis)) absTotals[q.axis] += wAbs;

    const raw = answersById?.[q.id];
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;

    const contrib = (v - 3) * w * Number(q.direction ?? 1);
    if (axes.includes(q.axis)) sums[q.axis] += contrib;
  }

  const out = {};
  for (const ax of axes) {
    const denom = Math.max(1, absTotals[ax]);
    const raw = (sums[ax] / denom) * SCALE;
    out[ax] = Math.max(-5, Math.min(5, raw));
  }
  return out;
}

/** Cheap local contradictions (deterministic, no API) */
function detectSimpleContradictions(answersById) {
  const get = (id) => Number(answersById?.[id]);
  const issues = [];

  // Adjust IDs to match your questions.json
  const PAIRS = [
    {
      a: "core.free_speech_should_include_right_to_offend",
      b: "advanced.hate_speech_should_be_criminal_offense",
      rule: (va, vb) => va >= 4 && vb >= 4,
      note:
        "You support broad free speech while also favoring criminal penalties for ‘hate speech’. Clarify where you draw the line.",
    },
    {
      a: "core.people_free_private_matters",
      b: "core.governments_monitor_digital_comms",
      rule: (va, vb) => va >= 4 && vb >= 4,
      note:
        "You value privacy but also endorse broad government monitoring of digital communications.",
    },
    {
      a: "advanced.preserve_traditional_family_structures",
      b: "core.same_sex_marriage_recognized",
      rule: (va, vb) => va >= 4 && vb >= 4,
      note:
        "You favor preserving traditional family structures while also supporting recognition of same-sex marriage.",
    },
  ];

  for (const p of PAIRS) {
    const va = get(p.a);
    const vb = get(p.b);
    if (Number.isFinite(va) && Number.isFinite(vb) && p.rule(va, vb)) {
      issues.push(p.note);
    }
  }
  return issues;
}

/** AI prompts */
function buildSummaryPrompt(scores, answeredCount, totalCount) {
  return [
    {
      role: "system",
      content:
        "You are a concise political profile writer. Use plain English, 3–5 bullets max. Avoid hedging.",
    },
    {
      role: "user",
      content: `Summarize the user's political profile in under 120 words using these normalized axis scores (-5..5):
- Economic: ${scores.economic}
- Social: ${scores.social}
- Global: ${scores.global}
- Progress: ${scores.progress}
Answered ${answeredCount} of ${totalCount} questions.
Output:
- 3–5 bullets
- 1 short sentence at the end describing likely overall quadrant (e.g., 'socially conservative, economically left-leaning').`,
    },
  ];
}

function buildContradictionsPrompt(answersById) {
  return [
    {
      role: "system",
      content:
        "You analyze questionnaire answers (1=Strongly Disagree .. 5=Strongly Agree). Find at most 3 tensions/contradictions. Be specific and actionable.",
    },
    {
      role: "user",
      content:
        `Answers (JSON, id->1..5):\n` + JSON.stringify(answersById, null, 2) +
        `\nReturn a JSON object: { "contradictions": [ "<plain sentence>", ... ] } with at most 3 items.`,
    },
  ];
}

/** Call OpenAI (Node 18/20 has global fetch) */
async function callOpenAI(messages) {
  if (!OPENAI_API_KEY) return null; // If not set, skip AI
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 300,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OpenAI error: ${resp.status} ${t}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

function safeParseJSON(maybe) {
  try {
    return JSON.parse(maybe);
  } catch {
    return null;
  }
}

/** ---------- NEW: admin <-> custom-claim sync helpers & triggers ---------- **/
async function setAdminClaim(uid, value) {
  const auth = admin.auth();
  const user = await auth.getUser(uid);
  const existing = user.customClaims || {};
  const next = { ...existing };
  if (value) next.admin = true;
  else delete next.admin;

  // Only write if changed
  const noChange = (!!existing.admin) === (!!next.admin);
  if (!noChange) {
    await auth.setCustomUserClaims(uid, next);
    console.log(`Custom claims updated for ${uid}:`, next);
  } else {
    console.log(`No claim change needed for ${uid}`);
  }
}

// When an /admins/{uid} doc is created, grant admin:true
exports.adminOnCreate = onDocumentCreated("admins/{uid}", async (event) => {
  const uid = event.params.uid;
  await setAdminClaim(uid, true);
});

// When an /admins/{uid} doc is deleted, remove admin
exports.adminOnDelete = onDocumentDeleted("admins/{uid}", async (event) => {
  const uid = event.params.uid;
  await setAdminClaim(uid, false);
});

/** ---- Trigger: recompute results when answers change ---- */
exports.onAnswersWrite = onDocumentWritten(
  { document: "answers/{uid}", region: "europe-west2" },
  async (event) => {
    const uid = event.params.uid;

    const after = event.data?.after?.data() || null;
    if (!after) return; // deleted

    const answersById = after.answers || after; // legacy support
    const currentHash = hashAnswers(answersById);

    const db = admin.firestore();
    const profRef = db.collection("profiles").doc(uid);
    const profSnap = await profRef.get();
    const profile = profSnap.exists ? profSnap.data() : {};

    // Determine which results doc to update
    let resultRef = null;
    if (profile?.lastResultId) {
      resultRef = db.collection("results").doc(profile.lastResultId);
    } else {
      const q = await db.collection("results").where("uid", "==", uid).limit(1).get();
      if (!q.empty) {
        resultRef = db.collection("results").doc(q.docs[0].id);
        await profRef.set({ lastResultId: q.docs[0].id }, { merge: true });
      }
    }
    if (!resultRef) {
      resultRef = db.collection("results").doc();
      await profRef.set({ lastResultId: resultRef.id }, { merge: true });
    }

    const resSnap = await resultRef.get();
    const prev = resSnap.exists ? resSnap.data() : {};
    const prevHash = prev.answersHash;
    const prevVersion = prev.aiVersion;

    const hashChanged = currentHash !== prevHash;
    const versionBumped = AI_VERSION !== prevVersion;

    // Recompute scores if changed (cheap)
    const scores =
      prev && !hashChanged
        ? {
            economic: prev.economicScore,
            social: prev.socialScore,
            global: prev.globalScore,
            progress: prev.progressScore,
          }
        : computeScores(answersById);

    const basePayload = {
      uid,
      answers: answersById,
      answersHash: currentHash,
      economicScore: scores.economic,
      socialScore: scores.social,
      globalScore: scores.global,
      progressScore: scores.progress,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      aiVersion: prev.aiVersion || AI_VERSION,
      aiSummary: prev.aiSummary || null,
      aiContradictions: prev.aiContradictions || [],
      aiGeneratedAt: prev.aiGeneratedAt || null,
    };

    // If nothing changed, just ensure scores stay consistent and exit.
    if (!hashChanged && !versionBumped) {
      await resultRef.set(basePayload, { merge: true });
      return;
    }

    // Answers changed OR we bumped AI version → run AI once
    const totalCount = QUESTIONS.length;
    const answeredCount = Object.keys(answersById || {}).length;

    const localIssues = detectSimpleContradictions(answersById);
    let aiSummary = prev.aiSummary || null;
    let aiContradictions = prev.aiContradictions || [];

    try {
      const summaryMsgs = buildSummaryPrompt(scores, answeredCount, totalCount);
      const summaryText = await callOpenAI(summaryMsgs);
      if (summaryText) aiSummary = summaryText;

      const contraMsgs = buildContradictionsPrompt(answersById);
      const contraText = await callOpenAI(contraMsgs);
      const parsed = contraText ? safeParseJSON(contraText) : null;
      if (parsed?.contradictions && Array.isArray(parsed.contradictions)) {
        aiContradictions = [...new Set([...(parsed.contradictions || []), ...localIssues])].slice(0, 5);
      } else {
        aiContradictions = localIssues;
      }
    } catch (err) {
      console.error("AI generation failed:", err.message || err);
      aiContradictions = localIssues; // fallback
    }

    await resultRef.set(
      {
        ...basePayload,
        aiVersion: AI_VERSION,
        aiSummary,
        aiContradictions,
        aiGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
);

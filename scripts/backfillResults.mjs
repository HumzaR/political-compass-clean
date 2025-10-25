import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import admin from "firebase-admin";

// ---- Config ----
const PROFILES_COLLECTION = "profiles";
const RESULTS_COLLECTION  = "results";
const ANSWERS_COLLECTION  = "answers";
const SCALE = 5; // must match lib/scoring normalization

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = { dry: false, limit: null, only: null };
  for (const a of args) {
    if (a === "--dry") flags.dry = true;
    else if (a.startsWith("--limit=")) flags.limit = Number(a.split("=")[1]);
    else if (a.startsWith("--only=")) flags.only = a.split("=")[1].split(",").map(s => s.trim()).filter(Boolean);
  }
  return flags;
}

// scoring (mirror lib/scoring.js)
function computeFromAnswers(answersById, questions) {
  const axes = ["economic", "social", "global", "progress"];
  const sums = { economic: 0, social: 0, global: 0, progress: 0 };
  const axisAbsWeightTotals = { economic: 0, social: 0, global: 0, progress: 0 };

  for (const q of questions) {
    const wAbs = Math.abs(Number(q.weight ?? 1));
    if (axes.includes(q.axis)) axisAbsWeightTotals[q.axis] += wAbs;

    const raw = answersById?.[q.id];
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;

    const contrib = (v - 3) * Number(q.weight ?? 1) * Number(q.direction ?? 1);
    if (axes.includes(q.axis)) sums[q.axis] += contrib;
  }

  const normalized = {};
  for (const ax of axes) {
    const denom = Math.max(1, axisAbsWeightTotals[ax]);
    const raw = (sums[ax] / denom) * SCALE;
    normalized[ax] = Math.max(-5, Math.min(5, raw));
  }
  return normalized;
}

// robust loader for data/questions.js (Windows-safe)
async function loadQuestions() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname  = path.dirname(__filename);
  const abs = path.resolve(__dirname, "../data/questions.js");
  if (!fs.existsSync(abs)) {
    throw new Error(`questions.js not found at ${abs}`);
  }
  const mod = await import(pathToFileURL(abs).href);
  const maybe = mod.default ?? mod.questions ?? mod;
  return maybe.default ?? maybe;
}

// try to load user answers from multiple places
async function loadUserAnswers(db, uid, profile) {
  // 1) /answers/{uid}
  const ansDoc = await db.collection(ANSWERS_COLLECTION).doc(uid).get();
  if (ansDoc.exists) {
    const data = ansDoc.data() || {};
    const byId = data.answers || data;
    if (byId && Object.keys(byId).length) {
      return { byId, source: `/answers/${uid}` };
    }
  }

  // 2) /results/{profile.lastResultId}
  const lastId = profile?.lastResultId;
  if (lastId) {
    const resSnap = await db.collection(RESULTS_COLLECTION).doc(lastId).get();
    if (resSnap.exists) {
      const r = resSnap.data() || {};
      if (r.answers && Object.keys(r.answers).length) {
        return { byId: r.answers, source: `/results/${lastId}` };
      }
    }
  }

  // 3) latest /results where uid==uid (with index); fallback to unordered if missing
  try {
    const q = db.collection(RESULTS_COLLECTION)
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(1);
    const snap = await q.get();
    if (!snap.empty) {
      const d = snap.docs[0].data() || {};
      if (d.answers && Object.keys(d.answers).length) {
        return { byId: d.answers, source: `/results?uid=${uid}&latest` };
      }
    }
  } catch (e) {
    if (String(e.message || e).includes("FAILED_PRECONDITION")) {
      console.warn("Missing composite index; falling back to unordered query for", uid);
      const q2 = db.collection(RESULTS_COLLECTION).where("uid", "==", uid).limit(1);
      const snap2 = await q2.get();
      if (!snap2.empty) {
        const d = snap2.docs[0].data() || {};
        if (d.answers && Object.keys(d.answers).length) {
          return { byId: d.answers, source: `/results?uid=${uid}&any` };
        }
      }
    } else {
      throw e;
    }
  }

  return { byId: null, source: null };
}

(async function main() {
  const { dry, limit, only } = parseArgs();

  // Admin init
  const saPath = process.env.SA_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (saPath) {
    const cred = JSON.parse(fs.readFileSync(path.resolve(saPath), "utf8"));
    admin.initializeApp({ credential: admin.credential.cert(cred), projectId: cred.project_id });
    console.log("Using service account project_id:", cred.project_id);
  } else {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log("Using ADC credentials");
  }

  const db = admin.firestore();
  console.log("Firestore projectId resolved to:", (db._settings?.projectId) || (admin.app().options.projectId));

  const questions = await loadQuestions();
  console.log(`Loaded ${questions.length} questions`);
  console.log(`Backfill starting${dry ? " (dry-run)" : ""}…`);

  // target uids
  let targets = [];
  if (only && only.length) {
    targets = only;
    console.log("Only processing UIDs:", targets.join(", "));
  } else {
    const profSnap = await db.collection(PROFILES_COLLECTION).get();
    targets = profSnap.docs.map(d => d.id);
    if (limit && Number.isFinite(limit)) targets = targets.slice(0, limit);
    console.log(`Scanning profiles: ${targets.length} UIDs`);
  }

  let updated = 0, created = 0, skipped = 0, errored = 0;

  for (const uid of targets) {
    try {
      const profRef = db.collection(PROFILES_COLLECTION).doc(uid);
      const profSnap = await profRef.get();
      if (!profSnap.exists) {
        console.log(`- ${uid}: skip (no profile)`);
        skipped++; continue;
      }
      const profile = profSnap.data() || {};

      const { byId, source } = await loadUserAnswers(db, uid, profile);
      if (!byId || !Object.keys(byId).length) {
        console.log(`- ${uid}: skip (no answers in /answers, lastResult, or latest results)`);
        skipped++; continue;
      }

      const norm = computeFromAnswers(byId, questions);
      const payload = {
        uid,
        economicScore: Number(norm.economic),
        socialScore: Number(norm.social),
        globalScore: Number(norm.global),
        progressScore: Number(norm.progress),
        recomputedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: `backfill:${source || "unknown"}`,
      };

      const existingResultId = profile.lastResultId;
      if (existingResultId) {
        const resRef = db.collection(RESULTS_COLLECTION).doc(existingResultId);
        if (!dry) await resRef.set(payload, { merge: true });
        console.log(`- ${uid}: updated result ${existingResultId} from ${source}`);
        updated++;
      } else {
        const resRef = db.collection(RESULTS_COLLECTION).doc();
        const newResult = {
          ...payload,
          answers: byId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (!dry) {
          await resRef.set(newResult);
          await profRef.set({ lastResultId: resRef.id }, { merge: true });
        }
        console.log(`- ${uid}: created result ${resRef.id} (linked), answers from ${source}`);
        created++;
      }
    } catch (e) {
      console.error(`! ${uid}:`, e.message || e);
      errored++;
    }
  }

  console.log(`\nBackfill complete${dry ? " (dry-run)" : ""}. updated=${updated} created=${created} skipped=${skipped} errored=${errored}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

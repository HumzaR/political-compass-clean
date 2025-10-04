const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const questions = require("./questions.json");

const SCALE = 5;
function computeFromAnswers(answersById) {
  const axes = ["economic", "social", "global", "progress"];
  const sums = { economic: 0, social: 0, global: 0, progress: 0 };
  const totals = { economic: 0, social: 0, global: 0, progress: 0 };

  for (const q of questions) {
    const axis = q.axis;
    if (!axes.includes(axis)) continue;
    const weight = Number(q.weight ?? 1);
    const dir = Number(q.direction ?? 1);

    totals[axis] += Math.abs(weight);

    const raw = answersById?.[q.id];
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;

    const contrib = (v - 3) * weight * dir;
    sums[axis] += contrib;
  }

  const normalized = {};
  for (const ax of axes) {
    const denom = Math.max(1, totals[ax]);
    const raw = (sums[ax] / denom) * SCALE;
    normalized[ax] = Math.max(-5, Math.min(5, raw));
  }
  return normalized;
}

exports.onAnswersWrite = functions.firestore
  .document("answers/{uid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid;

    const after = change.after.exists ? change.after.data() : null;
    const answersById = after?.answers || after || null;
    if (!answersById || Object.keys(answersById).length === 0) {
      console.log(`[answers/${uid}] empty or deleted; skipping recompute.`);
      return null;
    }

    const norm = computeFromAnswers(answersById);
    const payload = {
      uid,
      economicScore: Number(norm.economic),
      socialScore: Number(norm.social),
      globalScore: Number(norm.global),
      progressScore: Number(norm.progress),
      answers: answersById,
      recomputedAt: FieldValue.serverTimestamp(),
      source: "fn:onAnswersWrite"
    };

    const profRef = db.collection("profiles").doc(uid);
    const profSnap = await profRef.get();
    const existingResultId = profSnap.exists ? profSnap.data()?.lastResultId : null;

    if (existingResultId) {
      const resRef = db.collection("results").doc(existingResultId);
      await resRef.set(payload, { merge: true });
      console.log(`[answers/${uid}] Updated results/${existingResultId}`);
      return null;
    }

    const resRef = db.collection("results").doc();
    const newResult = { ...payload, createdAt: FieldValue.serverTimestamp() };
    await resRef.set(newResult);
    await profRef.set({ lastResultId: resRef.id }, { merge: true });
    console.log(`[answers/${uid}] Created results/${resRef.id} and linked in profiles.lastResultId`);
    return null;
  });

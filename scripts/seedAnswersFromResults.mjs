import fs from "fs";
import path from "path";
import admin from "firebase-admin";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/seedAnswersFromResults.mjs <UID>");
  process.exit(1);
}

const saPath = process.env.SA_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!saPath) {
  console.error("Set SA_PATH or GOOGLE_APPLICATION_CREDENTIALS to your service account JSON.");
  process.exit(1);
}
const cred = JSON.parse(fs.readFileSync(path.resolve(saPath), "utf8"));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(cred), projectId: cred.project_id });
const db = admin.firestore();

async function findLatestResultWithAnswers(uid) {
  // try indexed first
  try {
    const q = db.collection("results").where("uid", "==", uid).orderBy("createdAt", "desc").limit(5);
    const snap = await q.get();
    for (const d of snap.docs) {
      const data = d.data() || {};
      if (data.answers && Object.keys(data.answers).length) return { id: d.id, data };
    }
  } catch (e) {
    // fall back unordered
    const q2 = db.collection("results").where("uid", "==", uid).limit(5);
    const snap2 = await q2.get();
    for (const d of snap2.docs) {
      const data = d.data() || {};
      if (data.answers && Object.keys(data.answers).length) return { id: d.id, data };
    }
  }
  return null;
}

(async () => {
  console.log("Project:", cred.project_id, "UID:", uid);

  const profileRef = db.collection("profiles").doc(uid);
  const ansRef     = db.collection("answers").doc(uid);

  const existingAns = await ansRef.get();
  if (existingAns.exists) {
    console.log("answers/{uid} already exists. Nothing to seed.");
    process.exit(0);
  }

  const latest = await findLatestResultWithAnswers(uid);
  if (!latest) {
    console.warn("No results doc with 'answers' found. Creating empty answers/{uid} so the client can start writing there.");
    await ansRef.set({ answers: {}, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    process.exit(0);
  }

  // Seed /answers/{uid} from the result
  const byId = latest.data.answers;
  await ansRef.set({ answers: byId, fromResultId: latest.id, seededAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  console.log("Seeded answers/{uid} from results/", latest.id);

  // Ensure profiles.lastResultId points to that result (optional)
  const profSnap = await profileRef.get();
  if (!profSnap.exists || !profSnap.data()?.lastResultId) {
    await profileRef.set({ lastResultId: latest.id }, { merge: true });
    console.log("Set profiles.lastResultId to", latest.id);
  }

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });

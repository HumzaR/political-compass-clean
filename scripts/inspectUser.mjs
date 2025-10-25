import fs from "fs";
import path from "path";
import admin from "firebase-admin";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/inspectUser.mjs <UID>");
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

(async () => {
  console.log("Project:", cred.project_id, "UID:", uid);

  const profRef = db.collection("profiles").doc(uid);
  const profSnap = await profRef.get();
  console.log("\nprofiles/{uid} exists:", profSnap.exists);
  if (profSnap.exists) console.log("profile data:", profSnap.data());

  const ansRef = db.collection("answers").doc(uid);
  const ansSnap = await ansRef.get();
  console.log("\nanswers/{uid} exists:", ansSnap.exists);
  if (ansSnap.exists) console.log("answers keys:", Object.keys(ansSnap.data()?.answers || ansSnap.data() || {}));

  console.log("\nresults where uid==uid (up to 5):");
  try {
    const q = db.collection("results").where("uid", "==", uid).orderBy("createdAt", "desc").limit(5);
    const snap = await q.get();
    if (snap.empty) {
      console.log("  (none)");
    } else {
      for (const d of snap.docs) {
        const data = d.data() || {};
        console.log(`  ${d.id}: createdAt=${data.createdAt?.toDate?.() || data.createdAt} hasAnswers=${!!data.answers} econ=${data.economicScore} soc=${data.socialScore}`);
      }
    }
  } catch (e) {
    console.warn("  Indexed query failed; trying unordered…", e.message);
    const q2 = db.collection("results").where("uid", "==", uid).limit(5);
    const snap2 = await q2.get();
    if (snap2.empty) console.log("  (none)");
    else {
      for (const d of snap2.docs) {
        const data = d.data() || {};
        console.log(`  ${d.id}: hasAnswers=${!!data.answers} econ=${data.economicScore} soc=${data.socialScore}`);
      }
    }
  }

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });

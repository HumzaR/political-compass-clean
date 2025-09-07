// pages/results.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import questions from "../data/questions";
import CompassCanvas from "../components/CompassCanvas";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";

export default function Results() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  const [scores, setScores] = useState(null); // { econ, soc, glob, prog, answers, answeredCount, totalAsked }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    const answersStr = String(router.query.answers || "");
    const answerArray = answersStr ? answersStr.split(",").map(Number) : [];

    // Build answers map ONLY for indices that exist in answerArray
    // i.e., if user did only the first 20, we save only those 20 (no undefineds).
    const userAnswers = {};
    questions.forEach((q, i) => {
      const v = answerArray[i];
      if (Number.isFinite(v)) userAnswers[q.id] = v;
      // else: skip (do not set undefined/null)
    });

    // Compute per-axis scores from provided answers only
    let econ = 0, soc = 0, glob = 0, prog = 0;
    questions.forEach((q) => {
      const response = userAnswers[q.id];
      if (!Number.isFinite(response)) return;
      const weight = q.weight ?? 1;
      const direction = q.direction ?? 1;
      const scaled = (response - 3) * weight * direction;

      if (q.axis === "economic") econ += scaled;
      else if (q.axis === "social") soc += scaled;
      else if (q.axis === "global") glob += scaled;
      else if (q.axis === "progress") prog += scaled;
    });

    setScores({
      econ,
      soc,
      glob,
      prog,
      answers: userAnswers,
      answeredCount: Object.keys(userAnswers).length,
      totalAsked: answerArray.length, // how many the quiz passed in this run
    });
  }, [router.isReady, router.query]);

  // Save to Firestore (answers map has no undefineds)
  useEffect(() => {
    const maybeSave = async () => {
      if (!scores || !user) return;

      try {
        setSaving(true);
        setSaveError("");

        const resRef = await addDoc(collection(db, "results"), {
          uid: user.uid,
          createdAt: serverTimestamp(),
          answers: scores.answers, // safe: only finite values present
          economicScore: scores.econ,
          socialScore: scores.soc,
          globalScore: scores.glob,
          progressScore: scores.prog,
          meta: {
            answeredCount: scores.answeredCount,
            totalAsked: scores.totalAsked,
            version: "v2-four-axis",
          },
        });

        await setDoc(
          doc(db, "profiles", user.uid),
          { lastResultId: resRef.id },
          { merge: true }
        );
      } catch (e) {
        console.error(e);
        setSaveError(e?.message || "Failed to save your result.");
      } finally {
        setSaving(false);
      }
    };

    maybeSave();
  }, [scores, user]);

  if (!scores) {
    return (
      <div className="text-center mt-10">
        <h1 className="text-2xl font-bold mb-4">Your Political Spectrum</h1>
        <p>Calculating your results…</p>
      </div>
    );
  }

  const { econ, soc, glob, prog } = scores;
  const fmt2 = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "0.00");

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Your Political Spectrum</h1>
      <p className="text-gray-600 mb-6">
        You answered {scores.answeredCount} of {scores.totalAsked} questions.
      </p>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-3">Compass (Economic vs Social)</h2>
        <CompassCanvas econ={econ} soc={soc} />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">Economic</div>
            <div className="text-lg font-semibold">{fmt2(econ)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Social</div>
            <div className="text-lg font-semibold">{fmt2(soc)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow mt-6">
        <h2 className="text-lg font-semibold mb-3">Additional Axes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border rounded p-4">
            <div className="text-sm text-gray-500">Global vs National</div>
            <div className="text-lg font-semibold">{fmt2(glob)}</div>
            <p className="text-xs text-gray-500 mt-1">(−) globalist / (+) nationalist</p>
          </div>
          <div className="border rounded p-4">
            <div className="text-sm text-gray-500">Progressive vs Conservative</div>
            <div className="text-lg font-semibold">{fmt2(prog)}</div>
            <p className="text-xs text-gray-500 mt-1">(−) progressive / (+) conservative</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="px-5 py-3 rounded bg-gray-200 hover:bg-gray-300 font-semibold"
        >
          Back to Home
        </button>
        <button
          onClick={() => router.push("/profile")}
          className="px-5 py-3 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
        >
          View My Profile
        </button>
      </div>

      <div className="mt-4">
        {saving && <p className="text-sm text-gray-600">Saving your result…</p>}
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      </div>
    </div>
  );
}

// pages/results.js
import { useEffect, useRef, useState } from "react";
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

  const [scores, setScores] = useState(null); // { econ, soc, glob, prog, answers }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!router.isReady) return;
    const answersStr = String(router.query.answers || "");
    const answerArray = answersStr ? answersStr.split(",").map(Number) : [];

    const userAnswers = {};
    questions.forEach((q, i) => {
      userAnswers[q.id] = answerArray[i];
    });

    // Compute per-axis scores
    let econ = 0, soc = 0, glob = 0, prog = 0;
    questions.forEach((q) => {
      const response = userAnswers[q.id];
      if (response === undefined || Number.isNaN(response)) return;
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
      answeredCount: answerArray.filter((x) => Number.isFinite(x)).length,
      totalQuestions: answerArray.length,
    });
  }, [router.isReady, router.query]);

  // Optional save to Firestore (if you had this flow before, this will continue to work)
  useEffect(() => {
    const maybeSave = async () => {
      if (!scores || !user) return;

      try {
        setSaving(true);
        setSaveError("");

        // Save a results document
        const resRef = await addDoc(collection(db, "results"), {
          uid: user.uid,
          createdAt: serverTimestamp(),
          answers: scores.answers,
          economicScore: scores.econ,
          socialScore: scores.soc,
          globalScore: scores.glob,
          progressScore: scores.prog,
        });

        // Update profile with lastResultId (if you use this elsewhere)
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
  const fmt2 = (n) => {
    const x = Number(n);
    return Number.isFinite(x) ? x.toFixed(2) : "0.00";
  };

  // Main 2D plot still uses economic (x) & social (y)
  const econAdj = econ; // hot topic deltas are added on profile pages
  const socAdj = soc;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Your Political Spectrum</h1>
      <p className="text-gray-600 mb-6">
        You answered {scores.answeredCount} of {scores.totalQuestions} questions.
      </p>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-3">Compass (Economic vs Social)</h2>
        <CompassCanvas econ={econAdj} soc={socAdj} />
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
            <p className="text-xs text-gray-500 mt-1">
              (−) globalist / (+) nationalist
            </p>
          </div>
          <div className="border rounded p-4">
            <div className="text-sm text-gray-500">Progressive vs Conservative</div>
            <div className="text-lg font-semibold">{fmt2(prog)}</div>
            <p className="text-xs text-gray-500 mt-1">
              (−) progressive / (+) conservative
            </p>
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
        {saveError && (
          <p className="text-sm text-red-600">
            {saveError}
          </p>
        )}
      </div>
    </div>
  );
}

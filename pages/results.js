// pages/results.js
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import questions from "../data/questions";

import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, addDoc, setDoc, serverTimestamp, collection } from "firebase/firestore";

function ResultsInner() {
  const router = useRouter();
  const canvasRef = useRef(null);

  // ---- Auth state (client only) ----
  const [user, setUser] = useState(undefined); // undefined=loading, null=not logged in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // ---- Parse answers & compute scores (robust) ----
  const answersStr = typeof router.query.answers === "string" ? router.query.answers : "";
  const answerArray = useMemo(() => {
    if (!answersStr) return [];
    return answersStr.split(",").map((v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 3;
    });
  }, [answersStr]);

  const { userAnswers, economicScore, socialScore } = useMemo(() => {
    const ua = {};
    let econ = 0;
    let soc = 0;

    (Array.isArray(questions) ? questions : []).forEach((q, i) => {
      const val = answerArray[i];
      const ans = Number.isFinite(val) ? val : 3;
      ua[q.id] = ans;

      const scaled = (ans - 3) * (q.weight ?? 1) * (q.direction ?? 1);
      if (q.axis === "economic") econ += scaled;
      else if (q.axis === "social") soc += scaled;
    });

    return { userAnswers: ua, economicScore: econ, socialScore: soc };
  }, [answerArray]);

  // ---- Save state & helpers ----
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lastStep, setLastStep] = useState(""); // for debugging (e.g., "addDoc", "setDoc profile")
  const attemptedRef = useRef(false);

  // utility: promise with timeout so we never hang forever
  const withTimeout = (p, ms, label) =>
    Promise.race([
      p,
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`Timeout after ${ms}ms during ${label}`)), ms)
      ),
    ]);

  // ---- Auto-save once we know auth ----
  useEffect(() => {
    if (user === undefined) return; // still checking session
    if (user === null) return; // not logged in → show login prompt instead of saving
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const save = async () => {
      try {
        setSaving(true);
        setSaveError("");
        setLastStep("start");

        if (!db) throw new Error("Firestore not initialized — check Firebase config/env vars.");

        // 1) Save the result
        setLastStep("addDoc(results)");
        const resultRef = await withTimeout(
          addDoc(collection(db, "results"), {
            uid: user.uid,
            economicScore,
            socialScore,
            answers: userAnswers,
            createdAt: serverTimestamp(),
          }),
          12000,
          "addDoc(results)"
        );

        // 2) Update profile with lastResultId
        setLastStep("setDoc(profiles)");
        await withTimeout(
          setDoc(
            doc(db, "profiles", user.uid),
            {
              uid: user.uid,
              lastResultId: resultRef.id,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ),
          12000,
          "setDoc(profiles)"
        );

        setSaved(true);
        setLastStep("done");

        // 3) Auto-redirect shortly so user sees the chart
        setTimeout(() => router.replace("/profile"), 1000);
      } catch (e) {
        console.error("Save error:", e, "at step:", lastStep);
        const code = e?.code ? `(${e.code}) ` : "";
        const message = e?.message || "Failed to save results.";
        setSaveError(`${code}${message}`);
      } finally {
        setSaving(false);
      }
    };

    save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, economicScore, socialScore, userAnswers]);

  // ---- Draw the compass ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, 400, 400);
    ctx.strokeStyle = "#ccc";
    ctx.beginPath();
    ctx.moveTo(200, 0);
    ctx.lineTo(200, 400);
    ctx.moveTo(0, 200);
    ctx.lineTo(400, 200);
    ctx.stroke();

    ctx.font = "12px Arial";
    ctx.fillStyle = "#666";
    ctx.fillText("Left", 20, 210);
    ctx.fillText("Right", 360, 210);
    ctx.fillText("Auth", 205, 20);
    ctx.fillText("Lib", 205, 390);

    const x = 200 + economicScore * 20;
    const y = 200 - socialScore * 20;

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();
  }, [economicScore, socialScore]);

  // ---- UI ----
  const total = Array.isArray(questions) ? questions.length : 0;
  if (!total) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Results unavailable</h1>
          <p className="text-gray-600">No questions loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4 text-center">Your Political Compass</h1>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <canvas ref={canvasRef} width="400" height="400" className="border mx-auto" />

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">Economic Score</div>
            <div className="text-lg font-semibold">{economicScore.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Social Score</div>
            <div className="text-lg font-semibold">{socialScore.toFixed(2)}</div>
          </div>
        </div>

        {/* Save status */}
        {user === undefined && (
          <p className="mt-4 text-gray-600 text-center">Checking your session…</p>
        )}

        {user === null && (
          <div className="mt-4 text-center">
            <p className="text-gray-700 mb-2">
              You’re not logged in. Log in to save your result to your profile.
            </p>
            <button
              onClick={() => router.replace("/login")}
              className="px-5 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Go to login
            </button>
          </div>
        )}

        {user && saving && !saveError && (
          <p className="mt-4 text-gray-600 text-center">Saving your result…</p>
        )}

        {saveError && (
          <div className="mt-4 text-center">
            <p className="text-red-600 mb-2">Error while saving: {saveError}</p>
            {lastStep && (
              <p className="text-gray-600 mb-4">
                Last step: <code>{lastStep}</code>
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => router.replace("/quiz")}
                className="px-4 py-2 rounded border"
              >
                Back to Quiz
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded bg-indigo-600 text-white"
              >
                Retry Save
              </button>
            </div>
          </div>
        )}

        {user && !saving && !saveError && saved && (
          <div className="mt-4 text-center">
            <button
              onClick={() => router.replace("/profile")}
              className="px-5 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Go to Profile now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Client-only to avoid hydration mismatches
export default dynamic(() => Promise.resolve(ResultsInner), { ssr: false });

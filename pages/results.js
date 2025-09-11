// pages/results.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import questions from "../data/questions";
import CompassCanvas from "../components/CompassCanvas";
import AxisCard from "../components/AxisCard";
import QuadRadar from "../components/QuadRadar";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";

export default function Results() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  const [scores, setScores] = useState(null); // { econ,soc,glob,prog, answers, hasAdvanced, askedCount }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [mode, setMode] = useState("split"); // 'split' | 'spider'

  // Parse + score + contributions
  const [contribs, setContribs] = useState({ economic: [], social: [], global: [], progress: [] });

  useEffect(() => {
    if (!router.isReady) return;

    const answersStr = String(router.query.answers || "");
    const arr = answersStr ? answersStr.split(",").map(Number) : [];

    const ans = {};
    questions.forEach((q, i) => {
      const v = arr[i];
      if (Number.isFinite(v)) ans[q.id] = v;
    });

    let econ=0, soc=0, glob=0, prog=0;
    const c = { economic: [], social: [], global: [], progress: [] };

    questions.forEach((q, i) => {
      const v = ans[q.id];
      if (!Number.isFinite(v)) return;
      const w = q.weight ?? 1;
      const d = q.direction ?? 1;
      const scaled = (v - 3) * w * d;

      if (q.axis === "economic") { econ += scaled; c.economic.push({ qId:q.id, qText:q.text, type:q.type, answer:v, contrib:scaled }); }
      else if (q.axis === "social") { soc += scaled; c.social.push({ qId:q.id, qText:q.text, type:q.type, answer:v, contrib:scaled }); }
      else if (q.axis === "global") { glob += scaled; c.global.push({ qId:q.id, qText:q.text, type:q.type, answer:v, contrib:scaled }); }
      else if (q.axis === "progress") { prog += scaled; c.progress.push({ qId:q.id, qText:q.text, type:q.type, answer:v, contrib:scaled }); }
    });

    const hasAdvanced = c.global.length > 0 || c.progress.length > 0;

    setScores({
      econ, soc, glob, prog,
      answers: ans,
      askedCount: arr.length,
      hasAdvanced,
    });
    setContribs(c);
  }, [router.isReady, router.query]);

  // Save result
  useEffect(() => {
    const run = async () => {
      if (!scores || !user) return;
      try {
        setSaving(true); setSaveError("");
        const resRef = await addDoc(collection(db, "results"), {
          uid: user.uid,
          createdAt: serverTimestamp(),
          answers: scores.answers,
          economicScore: scores.econ,
          socialScore: scores.soc,
          globalScore: scores.glob,
          progressScore: scores.prog,
          meta: { askedCount: scores.askedCount, hasAdvanced: scores.hasAdvanced, version: "v3-explainable" },
        });
        await setDoc(doc(db, "profiles", user.uid), { lastResultId: resRef.id }, { merge: true });
      } catch (e) {
        console.error(e);
        setSaveError(e?.message || "Failed to save your result.");
      } finally {
        setSaving(false);
      }
    };
    run();
  }, [scores, user]);

  if (!scores) {
    return (
      <div className="text-center mt-10">
        <h1 className="text-2xl font-bold mb-4">Your Political Spectrum</h1>
        <p>Calculating your results…</p>
      </div>
    );
  }

  const { econ, soc, glob, prog, hasAdvanced } = scores;
  const fmt2 = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "0.00");

  // Pastel palette per axis
  const palette = {
    economic: { bg: "#DBEAFE", bar: "#BFDBFE", dot: "#3B82F6" }, // blue
    social:   { bg: "#EDE9FE", bar: "#DDD6FE", dot: "#8B5CF6" }, // violet
    global:   { bg: "#DCFCE7", bar: "#BBF7D0", dot: "#22C55E" }, // green
    progress: { bg: "#FFEDD5", bar: "#FED7AA", dot: "#F97316" }, // orange
  };

  // Header + toggle
  const Header = () => (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
      <h2 className="text-xl font-semibold">Results</h2>
      <div className="flex gap-2">
        <button
          onClick={() => setMode("split")}
          className={`px-3 py-1.5 rounded border ${mode==="split"?"bg-indigo-600 text-white border-indigo-600":"bg-white hover:bg-gray-50"}`}
        >
          Split (4 graphs)
        </button>
        <button
          onClick={() => setMode("spider")}
          className={`px-3 py-1.5 rounded border ${mode==="spider"?"bg-indigo-600 text-white border-indigo-600":"bg-white hover:bg-gray-50"}`}
        >
          Combined (spider)
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Your Political Spectrum</h1>
      <p className="text-gray-600 mb-6">
        You answered {Object.keys(scores.answers).length} of {scores.askedCount} questions.
      </p>

      {/* Always show the classic 2D compass for quick orientation */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">Compass (Economic vs Social)</h2>
        <CompassCanvas econ={econ} soc={soc} />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
          <div><div className="text-sm text-gray-500">Economic</div><div className="text-lg font-semibold">{fmt2(econ)}</div></div>
          <div><div className="text-sm text-gray-500">Social</div><div className="text-lg font-semibold">{fmt2(soc)}</div></div>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <Header />

        {mode === "spider" ? (
          <div className="py-2">
            <QuadRadar
              econ={econ} soc={soc} glob={glob} prog={prog}
              fill="rgba(16,185,129,0.12)"  // teal-ish pastel
              stroke="#14b8a6"
            />
            {!hasAdvanced && (
              <p className="mt-3 text-sm text-gray-600 text-center">
                Global/National and Progressive/Conservative are available after the{" "}
                <button onClick={()=>router.push("/quiz?start=advanced")} className="text-indigo-600 underline">advanced 20 questions</button>.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AxisCard
                title="Economic"
                negLabel="Left"
                posLabel="Right"
                value={econ}
                contributions={contribs.economic}
                color={palette.economic}
              />
              <AxisCard
                title="Social"
                negLabel="Libertarian"
                posLabel="Authoritarian"
                value={soc}
                contributions={contribs.social}
                color={palette.social}
              />
              <AxisCard
                title="Global vs National"
                negLabel="Globalist"
                posLabel="Nationalist"
                value={hasAdvanced ? glob : 0}
                contributions={contribs.global}
                color={palette.global}
              />
              <AxisCard
                title="Progressive vs Conservative"
                negLabel="Progressive"
                posLabel="Conservative"
                value={hasAdvanced ? prog : 0}
                contributions={contribs.progress}
                color={palette.progress}
              />
            </div>

            {!hasAdvanced && (
              <div className="mt-4 rounded border border-dashed p-4 bg-gray-50">
                <p className="text-gray-700">
                  To unlock <strong>Global vs National</strong> and <strong>Progressive vs Conservative</strong> with full explanations,
                  continue with the <strong>advanced 20 questions</strong>.
                </p>
                <button
                  onClick={() => router.push("/quiz?start=advanced")}
                  className="mt-3 px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  Continue with the last 20 questions
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={()=>router.push("/")} className="px-5 py-3 rounded bg-gray-200 hover:bg-gray-300 font-semibold">Back to Home</button>
        <button onClick={()=>router.push("/profile")} className="px-5 py-3 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">View My Profile</button>
      </div>

      <div className="mt-4">
        {saving && <p className="text-sm text-gray-600">Saving your result…</p>}
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      </div>
    </div>
  );
}

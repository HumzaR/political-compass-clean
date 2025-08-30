// pages/profile.js
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import questions from "../data/questions";

function ProfileInner() {
  const router = useRouter();

  // State
  const [user, setUser] = useState(undefined); // undefined=loading, null=not logged in
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'answers'

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [pageError, setPageError] = useState("");

  const [profile, setProfile] = useState(null); // includes deltas, username, etc.
  const [result, setResult] = useState(null);   // latest quiz result (with answers)

  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answersError, setAnswersError] = useState("");
  const [hotResponses, setHotResponses] = useState([]);

  const canvasRef = useRef(null);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  // Load profile + latest result
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoadingProfile(true);
      setPageError("");
      try {
        const profRef = doc(db, "profiles", user.uid);
        const profSnap = await getDoc(profRef);
        if (!profSnap.exists()) {
          // force quiz first
          router.replace("/quiz");
          return;
        }
        const prof = { id: profSnap.id, ...profSnap.data() };
        setProfile(prof);

        if (!prof.lastResultId) {
          router.replace("/quiz");
          return;
        }
        const resSnap = await getDoc(doc(db, "results", prof.lastResultId));
        setResult(resSnap.exists() ? resSnap.data() : null);
      } catch (e) {
        console.error(e);
        setPageError(e?.code ? `Error: ${e.code}` : "Failed to load profile.");
      } finally {
        setLoadingProfile(false);
      }
    };
    if (user) load();
  }, [user, router]);

  // Draw compass whenever overview tab visible & data ready
  useEffect(() => {
    if (activeTab !== "overview") return;
    if (!profile || !result) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const raf = requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const baseE = Number(result.economicScore) || 0;
      const baseS = Number(result.socialScore) || 0;
      const dE = Number(profile.hotEconDelta || 0);
      const dS = Number(profile.hotSocDelta || 0);
      const econ = baseE + dE;
      const soc = baseS + dS;

      ctx.clearRect(0, 0, 400, 400);
      ctx.strokeStyle = "#ccc";
      ctx.beginPath();
      ctx.moveTo(200, 0); ctx.lineTo(200, 400);
      ctx.moveTo(0, 200); ctx.lineTo(400, 200);
      ctx.stroke();

      ctx.font = "12px Arial";
      ctx.fillStyle = "#666";
      ctx.fillText("Left", 20, 210);
      ctx.fillText("Right", 360, 210);
      ctx.fillText("Auth", 205, 20);
      ctx.fillText("Lib", 205, 390);

      const x = 200 + econ * 20;
      const y = 200 - soc * 20;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
    });

    return () => cancelAnimationFrame(raf);
  }, [activeTab, profile, result]);

  // Load hot topic responses when Answers tab opens
  useEffect(() => {
    const loadAnswers = async () => {
      if (activeTab !== "answers" || !user) return;
      setLoadingAnswers(true);
      setAnswersError("");
      try {
        const respQ = query(
          collection(db, "hotTopicResponses"),
          where("uid", "==", user.uid)
        );
        const respSnap = await getDocs(respQ);
        const responses = respSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Enrich with topic
        const enriched = [];
        for (const r of responses) {
          let topicData = undefined;
          if (r.topicId) {
            try {
              const tSnap = await getDoc(doc(db, "hotTopics", r.topicId));
              if (tSnap.exists()) topicData = tSnap.data();
            } catch {}
          }
          enriched.push({ ...r, topic: topicData });
        }
        enriched.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setHotResponses(enriched);
      } catch (e) {
        console.error(e);
        setAnswersError(e?.code ? `Error: ${e.code}` : "Failed to load answers.");
      } finally {
        setLoadingAnswers(false);
      }
    };
    loadAnswers();
  }, [activeTab, user]);

  // Helpers
  const fmt2 = (n) => {
    const x = Number(n);
    return Number.isFinite(x) ? x.toFixed(2) : "0.00";
  };
  const firstName =
    (profile?.displayName || profile?.username || "Your").split(" ")[0];
  const likertLabel = (n) =>
    ({ 1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree" }[Number(n)] ||
      String(n ?? ""));
  const yesNoFromValue = (n) => (Number(n) >= 3 ? "Yes" : "No");

  // Derived
  const baseE = Number(result?.economicScore || 0);
  const baseS = Number(result?.socialScore || 0);
  const dE = Number(profile?.hotEconDelta || 0);
  const dS = Number(profile?.hotSocDelta || 0);
  const adjE = baseE + dE;
  const adjS = baseS + dS;

  const compassAnswers = (() => {
    const ans = (result && result.answers) || {};
    const list = Array.isArray(questions) ? questions : [];
    return list.map((q) => {
      const v = Number.isFinite(Number(ans[q.id])) ? Number(ans[q.id]) : 3;
      const label = q.type === "yesno" ? yesNoFromValue(v) : likertLabel(v);
      return { id: `compass-${q.id}`, text: q.text, axis: q.axis, value: v, label };
    });
  })();

  if (user === undefined || loadingProfile) {
    return <p className="text-center mt-10">Loading your profile…</p>;
  }
  if (user === null) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">My Profile</h1>
      {pageError && (
        <div className="mb-4 p-3 rounded border bg-red-50 text-red-700 text-sm">{pageError}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={[
            "px-4 py-2 rounded",
            activeTab === "overview" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800",
          ].join(" ")}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("answers")}
          className={[
            "px-4 py-2 rounded",
            activeTab === "answers" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800",
          ].join(" ")}
        >
          {firstName}&apos;s answers
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Your Compass</h2>
          {!result ? (
            <p className="text-gray-600">No quiz result yet. Please take the quiz.</p>
          ) : (
            <>
              <canvas ref={canvasRef} width="400" height="400" className="border mx-auto" />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-500">Economic (base → adjusted)</div>
                  <div className="text-lg font-semibold">
                    {fmt2(baseE)} → {fmt2(adjE)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Social (base → adjusted)</div>
                  <div className="text-lg font-semibold">
                    {fmt2(baseS)} → {fmt2(adjS)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">{firstName}&apos;s answers</h2>

          {answersError && (
            <div className="mb-4 p-3 rounded border bg-red-50 text-red-700 text-sm">{answersError}</div>
          )}

          {/* Compass */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Political Compass</h3>
            {!result ? (
              <p className="text-gray-600">No compass answers yet.</p>
            ) : (
              <div className="space-y-3">
                {compassAnswers.map((a) => (
                  <div key={a.id} className="border rounded p-3">
                    <div className="text-sm text-gray-500 mb-1">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-800 mr-2">
                        Political Compass
                      </span>
                      Axis: {a.axis}
                    </div>
                    <div className="font-medium">{a.text}</div>
                    <div className="mt-1 text-sm">
                      Answer: <span className="font-semibold">{a.label}</span>{" "}
                      <span className="text-gray-500">({a.value})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hot Topics */}
          <div>
            <h3 className="font-semibold mb-2">Hot Topics</h3>
            {loadingAnswers ? (
              <p>Loading answers…</p>
            ) : hotResponses.length === 0 ? (
              <p className="text-gray-600">No hot topic answers yet.</p>
            ) : (
              <div className="space-y-3">
                {hotResponses.map((r) => {
                  const t = r.topic || {};
                  const v = Number.isFinite(Number(r.value)) ? Number(r.value) : 3;
                  const label = (t.type || "scale") === "yesno"
                    ? (v >= 3 ? "Yes" : "No")
                    : likertLabel(v);
                  return (
                    <div key={r.id} className="border rounded p-3">
                      <div className="text-sm text-gray-500 mb-1">
                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-pink-100 text-pink-800 mr-2">
                          Hot Topic
                        </span>
                        {t.axis && <>Axis: {t.axis}</>}
                        {r.createdAt?.toDate && (
                          <span className="ml-2 text-xs">
                            · {r.createdAt.toDate().toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="font-medium">{t.text || "(deleted topic)"}</div>
                      <div className="mt-1 text-sm">
                        Answer: <span className="font-semibold">{label}</span>{" "}
                        <span className="text-gray-500">({v})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(ProfileInner), { ssr: false });

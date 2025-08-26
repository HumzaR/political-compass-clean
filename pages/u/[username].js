// pages/u/[username].js
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import questions from "../../data/questions";

function PublicProfileInner() {
  const router = useRouter();
  const { username } = router.query;

  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'answers'
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);

  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answersError, setAnswersError] = useState("");
  const [hotResponses, setHotResponses] = useState([]);

  const canvasRef = useRef(null);

  // Load profile + latest result
  useEffect(() => {
    const load = async () => {
      if (!username) return;
      setLoading(true);
      setNotFound(false);
      setError("");

      try {
        const qProf = query(collection(db, "profiles"), where("username", "==", String(username)));
        const profSnap = await getDocs(qProf);
        if (profSnap.empty) {
          setNotFound(true);
          return;
        }
        const profDoc = profSnap.docs[0];
        const profData = { id: profDoc.id, ...profDoc.data() };
        setProfile(profData);

        if (profData.lastResultId) {
          const resSnap = await getDoc(doc(db, "results", profData.lastResultId));
          setResult(resSnap.exists() ? resSnap.data() : null);
        } else {
          setResult(null);
        }
      } catch (e) {
        console.error("Public profile load error:", e);
        setError(e?.code ? `Error loading profile: ${e.code}` : "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [username]);

  // Draw compass (runs when tab changes back to "profile" too)
  useEffect(() => {
    if (activeTab !== "profile") return;
    if (!profile || !result) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // ensure DOM is painted before drawing
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
      // axes
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

  // Load answers when Answers tab opens
  useEffect(() => {
    const loadAnswers = async () => {
      if (activeTab !== "answers") return;
      if (!profile) return;

      setLoadingAnswers(true);
      setAnswersError("");
      try {
        const respQ = query(collection(db, "hotTopicResponses"), where("uid", "==", profile.id));
        const respSnap = await getDocs(respQ);
        const responses = respSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const enriched = [];
        for (const r of responses) {
          let topicData = undefined;
          if (r.topicId) {
            try {
              const tSnap = await getDoc(doc(db, "hotTopics", r.topicId));
              if (tSnap.exists()) topicData = tSnap.data();
            } catch { /* ignore */ }
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
        console.error("Public answers load error:", e);
        setAnswersError(e?.code ? `Error loading answers: ${e.code}` : "Failed to load answers.");
      } finally {
        setLoadingAnswers(false);
      }
    };

    loadAnswers();
  }, [activeTab, profile]);

  // Helpers
  const fmt2 = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? num.toFixed(2) : "0.00";
  };
  const firstName =
    (profile?.displayName || profile?.username || "").trim().split(" ")[0] ||
    (profile ? "User" : "");
  const likertLabel = (n) => {
    const map = { 1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree" };
    return map[Number(n)] || String(n ?? "");
  };
  const yesNoFromValue = (n) => (Number(n) >= 3 ? "Yes" : "No");

  // Build Compass answers list from latest result
  const compassAnswers = (() => {
    const ans = (result && result.answers) || {};
    const list = Array.isArray(questions) ? questions : [];
    return list.map((q) => {
      const valueRaw = ans[q.id];
      const value = Number.isFinite(Number(valueRaw)) ? Number(valueRaw) : 3;
      const label = q.type === "yesno" ? yesNoFromValue(value) : likertLabel(value);
      return {
        id: `compass-${q.id}`,
        source: "Political Compass",
        text: q.text,
        type: q.type,
        axis: q.axis,
        value,
        label,
      };
    });
  })();

  const hotAnswers = hotResponses.map((r) => {
    const t = r.topic || {};
    const value = Number.isFinite(Number(r.value)) ? Number(r.value) : 3;
    const label = (t.type || "scale") === "yesno" ? yesNoFromValue(value) : likertLabel(value);
    return {
      id: `hot-${r.id}`,
      source: "Hot Topic",
      text: t.text || "(deleted topic)",
      type: t.type || "scale",
      axis: t.axis || "",
      value,
      label,
      createdAt: r.createdAt,
    };
  });

  // Render guards
  if (loading) return <p className="text-center mt-10">Loading profile…</p>;
  if (notFound || !profile) return <p className="text-center mt-10">Profile not found.</p>;

  const baseE = Number(result?.economicScore || 0);
  const baseS = Number(result?.socialScore || 0);
  const dE = Number(profile.hotEconDelta || 0);
  const dS = Number(profile.hotSocDelta || 0);
  const adjE = baseE + dE;
  const adjS = baseS + dS;

  const {
    displayName = "",
    country = "",
    city = "",
    age = "",
    ethnicity = "",
    gender = "",
  } = profile;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2 text-center">@{profile.username}</h1>
      {displayName && <p className="text-center text-gray-700 mb-6">{displayName}</p>}

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab("profile")}
          className={["px-4 py-2 rounded", activeTab === "profile" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"].join(" ")}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("answers")}
          className={["px-4 py-2 rounded", activeTab === "answers" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"].join(" ")}
        >
          {firstName}&apos;s answers
        </button>
      </div>

      {activeTab === "profile" ? (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {country && (<div><div className="text-sm text-gray-500">Country</div><div className="font-medium">{country}</div></div>)}
            {city && (<div><div className="text-sm text-gray-500">City</div><div className="font-medium">{city}</div></div>)}
            {age && (<div><div className="text-sm text-gray-500">Age</div><div className="font-medium">{age}</div></div>)}
            {gender && (<div><div className="text-sm text-gray-500">Gender</div><div className="font-medium">{gender}</div></div>)}
            {ethnicity && (<div><div className="text-sm text-gray-500">Ethnicity</div><div className="font-medium">{ethnicity}</div></div>)}
          </div>

          {/* Chart + scores (adjusted) */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-3">Latest Result</h2>
            {!result ? (
              <p className="text-gray-600">No quiz result yet.</p>
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

          {error && <p className="mt-4 text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-3">{firstName}&apos;s answers</h2>

          {answersError && (
            <div className="mb-4 p-3 rounded border bg-red-50 text-red-700 text-sm">{answersError}</div>
          )}

          {/* Compass Answers */}
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
                        {a.source}
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

          {/* Hot Topic Answers */}
          <div>
            <h3 className="font-semibold mb-2">Hot Topics</h3>
            {loadingAnswers ? (
              <p>Loading answers…</p>
            ) : hotAnswers.length === 0 ? (
              <p className="text-gray-600">No hot topic answers yet.</p>
            ) : (
              <div className="space-y-3">
                {hotAnswers.map((a) => (
                  <div key={a.id} className="border rounded p-3">
                    <div className="text-sm text-gray-500 mb-1">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-pink-100 text-pink-800 mr-2">
                        {a.source}
                      </span>
                      {a.axis && <>Axis: {a.axis}</>}
                      {a.createdAt?.toDate && (
                        <span className="ml-2 text-xs">· {a.createdAt.toDate().toLocaleString()}</span>
                      )}
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
        </div>
      )}
    </div>
  );
}

// Client-only
export default dynamic(() => Promise.resolve(PublicProfileInner), { ssr: false });

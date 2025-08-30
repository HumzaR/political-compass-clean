// pages/profile.js
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import questions from "../data/questions";
import Modal from "../components/Modal";

function ProfileInner() {
  const router = useRouter();

  // Auth
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);
  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  // State
  const [activeTab, setActiveTab] = useState("overview");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [pageError, setPageError] = useState("");
  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);

  // Follows
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);

  // Answers
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answersError, setAnswersError] = useState("");
  const [hotResponses, setHotResponses] = useState([]);

  const canvasRef = useRef(null);

  // Load profile + latest result + counts
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoadingProfile(true);
      setPageError("");
      try {
        const profSnap = await getDoc(doc(db, "profiles", user.uid));
        if (!profSnap.exists()) {
          router.replace("/quiz");
          return;
        }
        const prof = { id: profSnap.id, ...profSnap.data() };
        setProfile(prof);

        if (prof.lastResultId) {
          const resSnap = await getDoc(doc(db, "results", prof.lastResultId));
          setResult(resSnap.exists() ? resSnap.data() : null);
        } else {
          setResult(null);
        }

        const followersQ = query(collection(db, "follows"), where("followeeUid", "==", user.uid));
        const followersSnap = await getDocs(followersQ);
        setFollowersCount(followersSnap.size);

        const followingQ = query(collection(db, "follows"), where("followerUid", "==", user.uid));
        const followingSnap = await getDocs(followingQ);
        setFollowingCount(followingSnap.size);
      } catch (e) {
        console.error(e);
        setPageError(e?.code ? `Error: ${e.code}` : "Failed to load profile.");
      } finally {
        setLoadingProfile(false);
      }
    };
    if (user) load();
  }, [user, router]);

  // Hi-DPI draw helper — ALWAYS draws axes/grid; draws point if scores provided
  const drawCompass = (canvas, econ, soc) => {
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
    const W = 400, H = 400;

    // Backing store size
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    // CSS size
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Light grid
    ctx.strokeStyle = "#e5e7eb"; // tailwind gray-200
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= W; gx += 40) {
      ctx.moveTo(gx, 0); ctx.lineTo(gx, H);
    }
    for (let gy = 0; gy <= H; gy += 40) {
      ctx.moveTo(0, gy); ctx.lineTo(W, gy);
    }
    ctx.stroke();

    // Axes (darker)
    ctx.strokeStyle = "#374151"; // gray-700
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#374151";
    ctx.font = "12px Arial";
    ctx.fillText("Left", 10, H / 2 - 8);
    ctx.fillText("Right", W - 40, H / 2 - 8);
    ctx.fillText("Auth", W / 2 + 8, 14);
    ctx.fillText("Lib", W / 2 + 8, H - 8);

    // Point
    if (typeof econ === "number" && typeof soc === "number" && !Number.isNaN(econ) && !Number.isNaN(soc)) {
      const x = W / 2 + econ * 20;
      const y = H / 2 - soc * 20; // up = authoritarian
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444"; // red-500
      ctx.fill();
    }

    // Breadcrumb in console
    // eslint-disable-next-line no-console
    console.log("[Compass] drawn", { econ, soc });
  };

  // Draw as soon as the canvas is laid out + whenever data/tab change.
  useLayoutEffect(() => {
    if (activeTab !== "overview") return;
    const canvas = canvasRef.current;

    const baseE = Number(result?.economicScore);
    const baseS = Number(result?.socialScore);
    const dE = Number(profile?.hotEconDelta || 0);
    const dS = Number(profile?.hotSocDelta || 0);

    const hasResult = result && Number.isFinite(baseE) && Number.isFinite(baseS);
    const econ = hasResult ? baseE + dE : undefined;
    const soc = hasResult ? baseS + dS : undefined;

    drawCompass(canvas, econ, soc);

    // Also draw again on next paint in case of CSS/layout changes
    const raf = requestAnimationFrame(() => drawCompass(canvas, econ, soc));
    return () => cancelAnimationFrame(raf);
  }, [activeTab, profile, result]);

  // Answers loader
  useEffect(() => {
    const loadAnswers = async () => {
      if (activeTab !== "answers" || !user) return;
      setLoadingAnswers(true);
      setAnswersError("");
      try {
        const respQ = query(collection(db, "hotTopicResponses"), where("uid", "==", user.uid));
        const respSnap = await getDocs(respQ);
        const responses = respSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

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
        enriched.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)).reverse();
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
  const firstName = (profile?.displayName || profile?.username || "Your").split(" ")[0];
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

  // Followers modal loaders
  const openFollowers = async () => {
    if (!user) return;
    setFollowersOpen(true);
    try {
      const followersQ = query(collection(db, "follows"), where("followeeUid", "==", user.uid));
      const snap = await getDocs(followersQ);
      const uids = snap.docs.map((d) => d.data()?.followerUid).filter(Boolean);
      const profs = [];
      for (const uid of uids) {
        const ps = await getDoc(doc(db, "profiles", uid));
        if (ps.exists()) profs.push({ id: ps.id, ...ps.data() });
      }
      profs.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
      setFollowersList(profs);
    } catch (e) { console.error(e); }
  };
  const openFollowing = async () => {
    if (!user) return;
    setFollowingOpen(true);
    try {
      const followingQ = query(collection(db, "follows"), where("followerUid", "==", user.uid));
      const snap = await getDocs(followingQ);
      const uids = snap.docs.map((d) => d.data()?.followeeUid).filter(Boolean);
      const profs = [];
      for (const uid of uids) {
        const ps = await getDoc(doc(db, "profiles", uid));
        if (ps.exists()) profs.push({ id: ps.id, ...ps.data() });
      }
      profs.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
      setFollowingList(profs);
    } catch (e) { console.error(e); }
  };

  if (user === undefined || loadingProfile) {
    return <p className="text-center mt-10">Loading your profile…</p>;
  }
  if (user === null) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <div className="flex gap-3">
          <button onClick={openFollowers} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">
            <span className="font-semibold">{followersCount}</span> Followers
          </button>
          <button onClick={openFollowing} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">
            <span className="font-semibold">{followingCount}</span> Following
          </button>
        </div>
      </div>

      {pageError && (
        <div className="mt-3 p-3 rounded border bg-red-50 text-red-700 text-sm">{pageError}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mt-6 mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={["px-4 py-2 rounded", activeTab === "overview" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"].join(" ")}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("answers")}
          className={["px-4 py-2 rounded", activeTab === "answers" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"].join(" ")}
        >
          {firstName}&apos;s answers
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Your Compass</h2>
          {/* Canvas always shows axes; point when result exists */}
          <canvas ref={canvasRef} width="400" height="400" className="border mx-auto" />
          {result ? (
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
          ) : (
            <p className="mt-3 text-center text-gray-600">No quiz result yet. Please take the quiz.</p>
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
                    : ({1:"Strongly Disagree",2:"Disagree",3:"Neutral",4:"Agree",5:"Strongly Agree"}[v] || String(v));
                  return (
                    <div key={r.id} className="border rounded p-3">
                      <div className="text-sm text-gray-500 mb-1">
                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-pink-100 text-pink-800 mr-2">
                          Hot Topic
                        </span>
                        {t.axis && <>Axis: {t.axis}</>}
                        {r.createdAt?.toDate && (
                          <span className="ml-2 text-xs">· {r.createdAt.toDate().toLocaleString()}</span>
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

      {/* Followers Modal */}
      <Modal title="Followers" isOpen={followersOpen} onClose={() => setFollowersOpen(false)}>
        {followersList.length === 0 ? (
          <p className="text-gray-600">No followers yet.</p>
        ) : (
          <ul className="divide-y">
            {followersList.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.displayName || p.username || "User"}</div>
                  {p.username && <div className="text-sm text-gray-500">@{p.username}</div>}
                </div>
                {p.username && (
                  <Link href={`/u/${p.username}`} className="px-3 py-1.5 rounded border hover:bg-gray-50">
                    View
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* Following Modal */}
      <Modal title="Following" isOpen={followingOpen} onClose={() => setFollowingOpen(false)}>
        {followingList.length === 0 ? (
          <p className="text-gray-600">Not following anyone yet.</p>
        ) : (
          <ul className="divide-y">
            {followingList.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.displayName || p.username || "User"}</div>
                  {p.username && <div className="text-sm text-gray-500">@{p.username}</div>}
                </div>
                {p.username && (
                  <Link href={`/u/${p.username}`} className="px-3 py-1.5 rounded border hover:bg-gray-50">
                    View
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

export default dynamic(() => Promise.resolve(ProfileInner), { ssr: false });

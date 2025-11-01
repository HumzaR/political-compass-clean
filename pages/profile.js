// pages/profile.js
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import questions from "../data/questions";
import Modal from "../components/Modal";
import QuadRadar from "../components/QuadRadar";
import AxisCard from "../components/AxisCard";
import CompassCanvas from "../components/CompassCanvas";
import PartyMatch from "@/components/PartyMatch";


// ✅ NEW: single source for answers
import { loadAnswers, subscribeAnswers } from "../lib/answers";

const AIInsightsRight = dynamic(() => import("../components/AIInsightsRight"), { ssr: false });

function ProfileInner() {
  const router = useRouter();

  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);
  useEffect(() => { if (user === null) router.replace("/login"); }, [user, router]);

  const [activeTab, setActiveTab] = useState("overview"); // overview | answers
  const [mode, setMode] = useState("split"); // split | spider

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [pageError, setPageError] = useState("");
  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);

  // ✅ Answers come from /answers/{uid} (with fallback handled inside lib/answers)
  const [answersById, setAnswersById] = useState({});

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingList, setFollowingList] = useState([]);

  // Load profile + latest result meta (scores/hot deltas) and start answers subscription
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoadingProfile(true);
      setPageError("");
      try {
        const pSnap = await getDoc(doc(db, "profiles", user.uid));
        if (!pSnap.exists()) { router.replace("/quiz"); return; }
        const p = { id: pSnap.id, ...pSnap.data() };
        setProfile(p);

        if (p.lastResultId) {
          const rSnap = await getDoc(doc(db, "results", p.lastResultId));
          setResult(rSnap.exists() ? rSnap.data() : null);
        } else {
          setResult(null);
        }

        const followersQ = query(collection(db, "follows"), where("followeeUid", "==", user.uid));
        setFollowersCount((await getDocs(followersQ)).size);
        const followingQ = query(collection(db, "follows"), where("followerUid", "==", user.uid));
        setFollowingCount((await getDocs(followingQ)).size);

        // ✅ answers: single source (Firestore /answers/{uid}, with internal fallback)
        const first = await loadAnswers();
        setAnswersById(first);
        const unsub = subscribeAnswers((a) => setAnswersById(a || {}));
        return () => unsub && unsub();
      } catch (e) {
        console.error(e);
        setPageError(e?.code ? `Error: ${e.code}` : "Failed to load profile.");
      } finally {
        setLoadingProfile(false);
      }
    };
    if (user) {
      const maybeUnsub = load();
      return () => {
        if (typeof maybeUnsub === "function") maybeUnsub();
      };
    }
  }, [user, router]);

  const openFollowers = async () => {
    if (!user) return;
    setFollowersOpen(true);
    setFollowersLoading(true);
    setFollowersList([]);
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
    finally { setFollowersLoading(false); }
  };

  const openFollowing = async () => {
    if (!user) return;
    setFollowingOpen(true);
    setFollowingLoading(true);
    setFollowingList([]);
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
    finally { setFollowingLoading(false); }
  };

  const closeFollowers = () => { setFollowersOpen(false); setFollowersList([]); };
  const closeFollowing = () => { setFollowingOpen(false); setFollowingList([]); };

  // Hot topic deltas
  const dE = Number(profile?.hotEconDelta || 0);
  const dS = Number(profile?.hotSocDelta || 0);

  // Base scores from latest result (kept as-is)
  const econBase = Number(result?.economicScore);
  const socBase  = Number(result?.socialScore);
  const globBase = Number(result?.globalScore);
  const progBase = Number(result?.progressScore);

  const hasE = Number.isFinite(econBase);
  const hasS = Number.isFinite(socBase);
  const hasG = Number.isFinite(globBase);
  const hasP = Number.isFinite(progBase);

  const econ = hasE ? econBase + dE : null;
  const soc  = hasS ? socBase + dS : null;
  const glob = hasG ? globBase : null;
  const prog = hasP ? progBase : null;

  const hasAny = hasE || hasS || hasG || hasP;
  const hasAdvanced = hasG || hasP;

  // Contributions derived from single-source answers
  const contributions = useMemo(() => {
    const ans = answersById || {};
    const make = (axis) =>
      questions
        .filter((q) => q.axis === axis)
        .map((q) => {
          const v = Number(ans[q.id]);
          if (!Number.isFinite(v)) return null;
          const contrib = (v - 3) * (q.weight ?? 1) * (q.direction ?? 1);
          return { qId: q.id, qText: q.text, type: q.type, answer: v, contrib };
        })
        .filter(Boolean);
    return {
      economic: make("economic"),
      social: make("social"),
      global: make("global"),
      progress: make("progress"),
    };
  }, [answersById]);

  const fmt2 = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "—");
  const palette = {
    economic: { bg: "#DBEAFE", bar: "#BFDBFE", dot: "#3B82F6" },
    social:   { bg: "#EDE9FE", bar: "#DDD6FE", dot: "#8B5CF6" },
    global:   { bg: "#DCFCE7", bar: "#BBF7D0", dot: "#22C55E" },
    progress: { bg: "#FFEDD5", bar: "#FED7AA", dot: "#F97316" },
  };

  const compassAnswers = useMemo(() => {
    const ans = answersById || {};
    return questions.map((q) => {
      const raw = ans[q.id];
      const has = Number.isFinite(Number(raw));
      const v = has ? Number(raw) : null;
      const label = !has
        ? "Not answered"
        : (q.type === "yesno"
            ? (v >= 3 ? "Yes" : "No")
            : ({1:"Strongly Disagree",2:"Disagree",3:"Neutral",4:"Agree",5:"Strongly Agree"}[v] || String(v)));
      return { id: `compass-${q.id}`, text: q.text, axis: q.axis, value: v, label, has };
    });
  }, [answersById]);

  if (user === undefined || loadingProfile) return <p className="text-center mt-10">Loading your profile…</p>;
  if (user === null) return null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <Link href="/feed" className="text-indigo-600 hover:underline text-sm">
          ← Back to Feed
        </Link>
        <div className="flex gap-3">
          <button onClick={openFollowers} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">
            <span className="font-semibold">{followersCount}</span> Followers
          </button>
          <button onClick={openFollowing} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">
            <span className="font-semibold">{followingCount}</span> Following
          </button>
        </div>
      </div>

      {pageError && <div className="mt-3 p-3 rounded border bg-red-50 text-red-700 text-sm">{pageError}</div>}

      {/* Tabs */}
      <div className="flex gap-2 mt-6 mb-6">
        <button onClick={() => setActiveTab("overview")} className={["px-4 py-2 rounded", activeTab === "overview" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"].join(" ")}>Overview</button>
        <button onClick={() => setActiveTab("answers")} className={["px-4 py-2 rounded", activeTab === "answers" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"].join(" ")}>Your answers</button>
      </div>

      {/* Grid: left content + AI right rail (unchanged) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,20rem] gap-6 items-start">
        <div>
          {activeTab === "overview" ? (
            <div className="bg-white p-6 rounded shadow">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <h2 className="text-xl font-semibold">Your Spectrum</h2>
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

              {/* Compass */}
              <div className="mb-6">
                <div className="text-sm text-gray-700 font-medium mb-2">Compass (Economic vs Social)</div>
                {econ === null || soc === null ? (
                  <p className="text-gray-600">No quiz result yet. <Link href="/quiz" className="text-indigo-600 underline">Take the quiz</Link>.</p>
                ) : (
                  <CompassCanvas econ={econ} soc={soc} />
                )}
              </div>

              {mode === "spider" ? (
                <div className="py-2">
                  <QuadRadar
                    econ={econ ?? 0}
                    soc={soc ?? 0}
                    glob={glob ?? 0}
                    prog={prog ?? 0}
                    fill="rgba(16,185,129,0.12)"
                    stroke="#14b8a6"
                  />
                  {!hasAdvanced && (
                    <p className="mt-3 text-sm text-gray-600 text-center">
                      Global/National and Progressive/Conservative appear after the{" "}
                      <a href="/quiz?start=advanced" className="text-indigo-600 underline">advanced 20 questions</a>.
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
                      value={econ ?? 0}
                      contributions={contributions.economic}
                      color={palette.economic}
                    />
                    <AxisCard
                      title="Social"
                      negLabel="Libertarian"
                      posLabel="Authoritarian"
                      value={soc ?? 0}
                      contributions={contributions.social}
                      color={palette.social}
                    />
                    <AxisCard
                      title="Global vs National"
                      negLabel="Globalist"
                      posLabel="Nationalist"
                      value={hasAdvanced ? (glob ?? 0) : 0}
                      contributions={contributions.global}
                      color={palette.global}
                    />
                    <AxisCard
                      title="Progressive vs Conservative"
                      negLabel="Progressive"
                      posLabel="Conservative"
                      value={hasAdvanced ? (prog ?? 0) : 0}
                      contributions={contributions.progress}
                    />
                  </div>

                  {!hasAdvanced && (
                    <div className="mt-4 rounded border border-dashed p-4 bg-gray-50">
                      <p className="text-gray-700">
                        To unlock <strong>Global vs National</strong> and <strong>Progressive vs Conservative</strong> (with explanations),
                        continue with the <strong>advanced 20 questions</strong>.
                      </p>
                      <a href="/quiz?start=advanced" className="inline-block mt-3 px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
                        Continue with the last 20 questions
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded shadow">
              <h2 className="text-xl font-semibold mb-4">Your answers</h2>
              <div className="space-y-3">
                {questions.map((q) => {
                  const v = answersById?.[q.id];
                  const has = Number.isFinite(Number(v));
                  const label = !has
                    ? "Not answered"
                    : (q.type === "yesno"
                        ? (v >= 3 ? "Yes" : "No")
                        : ({1:"Strongly Disagree",2:"Disagree",3:"Neutral",4:"Agree",5:"Strongly Agree"}[v] || String(v)));
                  return (
                    <div key={q.id} className="border rounded p-3">
                      <div className="text-sm text-gray-500 mb-1">
                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-800 mr-2">Political Compass</span>
                        Axis: {q.axis}
                      </div>
                      <div className="font-medium">{q.text}</div>
                      <div className="mt-1 text-sm">
                        {has ? (
                          <>Answer: <span className="font-semibold">{label}</span> <span className="text-gray-500">({v})</span></>
                        ) : (
                          <span className="text-gray-500 italic">Not answered</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT column: AI rail */}
        <AIInsightsRight
          finalScores={{
            economic: Number.isFinite(Number(result?.economicScore)) ? Number(result?.economicScore) + Number(profile?.hotEconDelta || 0) : null,
            social:   Number.isFinite(Number(result?.socialScore)) ? Number(result?.socialScore) + Number(profile?.hotSocDelta || 0) : null,
            global:   Number.isFinite(Number(result?.globalScore)) ? Number(result?.globalScore) : null,
            progress: Number.isFinite(Number(result?.progressScore)) ? Number(result?.progressScore) : null,
          }}
        />
      </div>

      {/* Party match section */}
<div className="mt-6">
  <PartyMatch />
</div>


      {/* Followers Modal */}
      <Modal title="Followers" isOpen={followersOpen} onClose={closeFollowers}>
        {followersLoading ? <p>Loading…</p> :
          followersList.length === 0 ? <p className="text-gray-600">No followers yet.</p> : (
            <ul className="divide-y">
              {followersList.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.displayName || p.username || "User"}</div>
                    {p.username && <div className="text-sm text-gray-500">@{p.username}</div>}
                  </div>
                  {p.username && <Link href={`/u/${p.username}`} className="px-3 py-1.5 rounded border hover:bg-gray-50">View</Link>}
                </li>
              ))}
            </ul>
          )
        }
      </Modal>

      {/* Following Modal */}
      <Modal title="Following" isOpen={followingOpen} onClose={closeFollowing}>
        {followingLoading ? <p>Loading…</p> :
          followingList.length === 0 ? <p className="text-gray-600">Not following anyone yet.</p> : (
            <ul className="divide-y">
              {followingList.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.displayName || p.username || "User"}</div>
                    {p.username && <div className="text-sm text-gray-500">@{p.username}</div>}
                  </div>
                  {p.username && <Link href={`/u/${p.username}`} className="px-3 py-1.5 rounded border hover:bg-gray-50">View</Link>}
                </li>
              ))}
            </ul>
          )
        }
      </Modal>
    </div>
  );
}

export default dynamic(() => Promise.resolve(ProfileInner), { ssr: false });

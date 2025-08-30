// pages/profile.js
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import questions from "../data/questions";
import Modal from "../components/Modal";
import CompassCanvas from "../components/CompassCanvas";
import Link from "next/link";

function ProfileInner() {
  const router = useRouter();

  // Auth
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);
  useEffect(() => { if (user === null) router.replace("/login"); }, [user, router]);

  // Data
  const [activeTab, setActiveTab] = useState("overview");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [pageError, setPageError] = useState("");
  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);

  // Follows counts
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Followers modal + data
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersList, setFollowersList] = useState([]);

  // Following modal + data
  const [followingOpen, setFollowingOpen] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingList, setFollowingList] = useState([]);

  // Hot topic answers
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answersError, setAnswersError] = useState("");
  const [hotResponses, setHotResponses] = useState([]);

  // Load profile + latest result + counts
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
      } catch (e) {
        console.error(e);
        setPageError(e?.code ? `Error: ${e.code}` : "Failed to load profile.");
      } finally {
        setLoadingProfile(false);
      }
    };
    if (user) load();
  }, [user, router]);

  // Open followers modal (fetch list now)
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
    } catch (e) {
      console.error(e);
    } finally {
      setFollowersLoading(false);
    }
  };

  // Open following modal (fetch list now)
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
    } catch (e) {
      console.error(e);
    } finally {
      setFollowingLoading(false);
    }
  };

  // Close handlers (reset lists so next open refetches)
  const closeFollowers = () => { setFollowersOpen(false); setFollowersList([]); };
  const closeFollowing = () => { setFollowingOpen(false); setFollowingList([]); };

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
  const fmt2 = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "0.00");
  const firstName = (profile?.displayName || profile?.username || "Your").split(" ")[0];
  const likertLabel = (n) => ({1:"Strongly Disagree",2:"Disagree",3:"Neutral",4:"Agree",5:"Strongly Agree"}[Number(n)] || String(n ?? ""));
  const yesNoFromValue = (n) => (Number(n) >= 3 ? "Yes" : "No");

  // Scores
  const baseE = Number(result?.economicScore);
  const baseS = Number(result?.socialScore);
  const dE = Number(profile?.hotEconDelta || 0);
  const dS = Number(profile?.hotSocDelta || 0);
  const hasResult = Number.isFinite(baseE) && Number.isFinite(baseS);
  const econ = hasResult ? baseE + dE : undefined;
  const soc = hasResult ? baseS + dS : undefined;

  const compassAnswers = (() => {
    const ans = (result && result.answers) || {};
    return (Array.isArray(questions) ? questions : []).map((q) => {
      const v = Number.isFinite(Number(ans[q.id])) ? Number(ans[q.id]) : 3;
      const label = q.type === "yesno" ? yesNoFromValue(v) : likertLabel(v);
      return { id: `compass-${q.id}`, text: q.text, axis: q.axis, value: v, label };
    });
  })();

  if (user === undefined || loadingProfile) return <p className="text-center mt-10">Loading your profile…</p>;
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

      {pageError && <div className="mt-3 p-3 rounded border bg-red-50 text-red-700 text-sm">{pageError}</div>}

      {/* Tabs */}
      <div className="flex gap-2 mt-6 mb-6">
        <button onClick={() => setActiveTab("overview")} className={["px-4 py-2 rounded", activeTab === "overview" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"].join(" ")}>Overview</button>
        <button onClick={() => setActiveTab("answers")} className={["px-4 py-2 rounded", activeTab === "answers" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"].join(" ")}>{firstName}&apos;s answers</button>
      </div>

      {activeTab === "overview" ? (
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Your Compass</h2>
          <CompassCanvas econ={econ} soc={soc} />
          {!hasResult ? (
            <p className="mt-3 text-center text-gray-600">No quiz result yet. Please take the quiz.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              <div><div className="text-sm text-gray-500">Economic (base → adjusted)</div><div className="text-lg font-semibold">{fmt2(baseE)} → {fmt2(baseE + Number(profile?.hotEconDelta || 0))}</div></div>
              <div><div className="text-sm text-gray-500">Social (base → adjusted)</div><div className="text-lg font-semibold">{fmt2(baseS)} → {fmt2(baseS + Number(profile?.hotSocDelta || 0))}</div></div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">{firstName}&apos;s answers</h2>
          {answersError && <div className="mb-4 p-3 rounded border bg-red-50 text-red-700 text-sm">{answersError}</div>}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Political Compass</h3>
            {!hasResult ? <p className="text-gray-600">No compass answers yet.</p> : (
              <div className="space-y-3">
                {compassAnswers.map((a) => (
                  <div key={a.id} className="border rounded p-3">
                    <div className="text-sm text-gray-500 mb-1"><span className="inline-block px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-800 mr-2">Political Compass</span>Axis: {a.axis}</div>
                    <div className="font-medium">{a.text}</div>
                    <div className="mt-1 text-sm">Answer: <span className="font-semibold">{a.label}</span> <span className="text-gray-500">({a.value})</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold mb-2">Hot Topics</h3>
            {loadingAnswers ? <p>Loading answers…</p> : hotResponses.length === 0 ? <p className="text-gray-600">No hot topic answers yet.</p> : (
              <div className="space-y-3">
                {hotResponses.map((r) => {
                  const t = r.topic || {};
                  const v = Number.isFinite(Number(r.value)) ? Number(r.value) : 3;
                  const label = (t.type || "scale") === "yesno" ? (v >= 3 ? "Yes" : "No") : ({1:"Strongly Disagree",2:"Disagree",3:"Neutral",4:"Agree",5:"Strongly Agree"}[v] || String(v));
                  return (
                    <div key={r.id} className="border rounded p-3">
                      <div className="text-sm text-gray-500 mb-1">
                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-pink-100 text-pink-800 mr-2">Hot Topic</span>
                        {t.axis && <>Axis: {t.axis}</>}
                        {r.createdAt?.toDate && <span className="ml-2 text-xs">· {r.createdAt.toDate().toLocaleString()}</span>}
                      </div>
                      <div className="font-medium">{t.text || "(deleted topic)"}</div>
                      <div className="mt-1 text-sm">Answer: <span className="font-semibold">{label}</span> <span className="text-gray-500">({v})</span></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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

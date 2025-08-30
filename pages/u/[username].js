// pages/u/[username].js
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import questions from "../../data/questions";
import Modal from "../../components/Modal";

function PublicProfileInner() {
  const router = useRouter();
  const { username } = router.query;

  const [viewer, setViewer] = useState(undefined);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setViewer(u || null));
    return () => unsub();
  }, []);

  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);

  const canvasRef = useRef(null);

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

        const followersQ = query(collection(db, "follows"), where("followeeUid", "==", profData.id));
        const followersSnap = await getDocs(followersQ);
        setFollowersCount(followersSnap.size);

        const followingQ = query(collection(db, "follows"), where("followerUid", "==", profData.id));
        const followingSnap = await getDocs(followingQ);
        setFollowingCount(followingSnap.size);
      } catch (e) {
        console.error("Public profile load error:", e);
        setError(e?.code ? `Error loading profile: ${e.code}` : "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [username]);

  useEffect(() => {
    const check = async () => {
      if (!viewer || !profile) return;
      if (viewer.uid === profile.id) {
        setIsFollowing(false);
        return;
      }
      try {
        const followId = `${viewer.uid}__${profile.id}`;
        const snap = await getDoc(doc(db, "follows", followId));
        setIsFollowing(snap.exists());
      } catch {
        setIsFollowing(false);
      }
    };
    check();
  }, [viewer, profile]);

  const toggleFollow = async () => {
    if (!viewer) {
      router.push("/login");
      return;
    }
    if (!profile || viewer.uid === profile.id) return;

    setFollowBusy(true);
    try {
      const followId = `${viewer.uid}__${profile.id}`;
      const ref = doc(db, "follows", followId);
      if (isFollowing) {
        await deleteDoc(ref);
        setIsFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
      } else {
        await setDoc(ref, {
          followerUid: viewer.uid,
          followeeUid: profile.id,
          createdAt: serverTimestamp(),
        });
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
      }
    } catch (e) {
      alert(e?.message || "Failed to update follow.");
    } finally {
      setFollowBusy(false);
    }
  };

  // Hi-DPI draw helper
  const drawCompass = (canvas, econ, soc) => {
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
    const W = 400, H = 400;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = "#ccc";
    ctx.beginPath();
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
    ctx.stroke();

    ctx.font = "12px Arial";
    ctx.fillStyle = "#666";
    ctx.fillText("Left", 20, H / 2 + 10);
    ctx.fillText("Right", W - 40, H / 2 + 10);
    ctx.fillText("Auth", W / 2 + 5, 20);
    ctx.fillText("Lib", W / 2 + 5, H - 10);

    if (typeof econ === "number" && typeof soc === "number" && !Number.isNaN(econ) && !Number.isNaN(soc)) {
      const x = W / 2 + econ * 20;
      const y = H / 2 - soc * 20;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
    }
  };

  // Always draw axes; draw point if result exists
  useEffect(() => {
    if (activeTab !== "profile") return;
    const canvas = canvasRef.current;

    const baseE = Number(result?.economicScore);
    const baseS = Number(result?.socialScore);
    const dE = Number(profile?.hotEconDelta || 0);
    const dS = Number(profile?.hotSocDelta || 0);

    const hasResult = result && Number.isFinite(baseE) && Number.isFinite(baseS);
    const econ = hasResult ? baseE + dE : undefined;
    const soc = hasResult ? baseS + dS : undefined;

    const raf = requestAnimationFrame(() => drawCompass(canvas, econ, soc));
    return () => cancelAnimationFrame(raf);
  }, [activeTab, profile, result]);

  // helpers
  const fmt2 = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? num.toFixed(2) : "0.00";
  };
  const firstName =
    (profile?.displayName || profile?.username || "").trim().split(" ")[0] ||
    (profile ? "User" : "");
  const likertLabel = (n) =>
    ({ 1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree" }[Number(n)] ||
      String(n ?? ""));
  const yesNoFromValue = (n) => (Number(n) >= 3 ? "Yes" : "No");

  const compassAnswers = (() => {
    const ans = (result && result.answers) || {};
    const list = Array.isArray(questions) ? questions : [];
    return list.map((q) => {
      const valueRaw = ans[q.id];
      const value = Number.isFinite(Number(valueRaw)) ? Number(valueRaw) : 3;
      const label = q.type === "yesno" ? yesNoFromValue(value) : likertLabel(value);
      return { id: `compass-${q.id}`, source: "Political Compass", text: q.text, type: q.type, axis: q.axis, value, label };
    });
  })();

  // guards
  if (loading) return <p className="text-center mt-10">Loading profile…</p>;
  if (notFound || !profile) return <p className="text-center mt-10">Profile not found.</p>;

  const baseE = Number(result?.economicScore || 0);
  const baseS = Number(result?.socialScore || 0);
  const dE = Number(profile?.hotEconDelta || 0);
  const dS = Number(profile?.hotSocDelta || 0);
  const adjE = baseE + dE;
  const adjS = baseS + dS;

  const isOwner = viewer && profile && viewer.uid === profile.id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">@{profile.username}</h1>
          {profile.displayName && <p className="text-gray-700">{profile.displayName}</p>}
        </div>

        {!isOwner && (
          <button
            onClick={toggleFollow}
            disabled={followBusy}
            className={[
              "px-4 py-2 rounded font-semibold",
              isFollowing ? "bg-gray-200 text-gray-800 hover:bg-gray-300" : "bg-indigo-600 text-white hover:bg-indigo-700",
            ].join(" ")}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {/* Counts */}
      <div className="mt-3 flex gap-3">
        <button className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50" onClick={() => setFollowersOpen(true)} title="View followers">
          <span className="font-semibold">{followersCount}</span> Followers
        </button>
        <button className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50" onClick={() => setFollowingOpen(true)} title="View following">
          <span className="font-semibold">{followingCount}</span> Following
        </button>
      </div>

      {error && <div className="mt-3 p-3 rounded border bg-red-50 text-red-700 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-6 mt-6">
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
          <h2 className="text-xl font-semibold mb-3">Latest Result</h2>
          {/* Canvas always shows axes; point when result exists */}
          <canvas ref={canvasRef} width="400" height="400" className="border mx-auto" />
          {result ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-500">Economic (base → adjusted)</div>
                <div className="text-lg font-semibold">{fmt2(baseE)} → {fmt2(adjE)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Social (base → adjusted)</div>
                <div className="text-lg font-semibold">{fmt2(baseS)} → {fmt2(adjS)}</div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-center text-gray-600">No quiz result yet.</p>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-3">{firstName}&apos;s answers</h2>

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

          {/* (Optional) Add public hot-topic answers here later */}
        </div>
      )}

      {/* Followers Modal */}
      <Modal title="Followers" isOpen={followersOpen} onClose={() => setFollowersOpen(false)}>
        {/* Load list on open */}
        {followersOpen && (
          <FollowersList profileId={profile.id} setList={setFollowersList} list={followersList} />
        )}
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
                {p.username && <Link href={`/u/${p.username}`} className="px-3 py-1.5 rounded border hover:bg-gray-50">View</Link>}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* Following Modal */}
      <Modal title="Following" isOpen={followingOpen} onClose={() => setFollowingOpen(false)}>
        {followingOpen && (
          <FollowingList profileId={profile.id} setList={setFollowingList} list={followingList} />
        )}
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
                {p.username && <Link href={`/u/${p.username}`} className="px-3 py-1.5 rounded border hover:bg-gray-50">View</Link>}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

// Lazy list loaders (keep it simple; reuse rules)
function FollowersList({ profileId, setList, list }) {
  useEffect(() => {
    const run = async () => {
      const dbMod = await import("firebase/firestore");
      const { collection, query, where, getDocs, doc, getDoc } = dbMod;
      const { db } = await import("../../lib/firebase");
      const followersQ = query(collection(db, "follows"), where("followeeUid", "==", profileId));
      const snap = await getDocs(followersQ);
      const uids = snap.docs.map((d) => d.data()?.followerUid).filter(Boolean);
      const profs = [];
      for (const uid of uids) {
        const ps = await getDoc(doc(db, "profiles", uid));
        if (ps.exists()) profs.push({ id: ps.id, ...ps.data() });
      }
      profs.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
      setList(profs);
    };
    if (list.length === 0) run();
  }, [profileId, setList, list.length]);
  return null;
}

function FollowingList({ profileId, setList, list }) {
  useEffect(() => {
    const run = async () => {
      const dbMod = await import("firebase/firestore");
      const { collection, query, where, getDocs, doc, getDoc } = dbMod;
      const { db } = await import("../../lib/firebase");
      const followingQ = query(collection(db, "follows"), where("followerUid", "==", profileId));
      const snap = await getDocs(followingQ);
      const uids = snap.docs.map((d) => d.data()?.followeeUid).filter(Boolean);
      const profs = [];
      for (const uid of uids) {
        const ps = await getDoc(doc(db, "profiles", uid));
        if (ps.exists()) profs.push({ id: ps.id, ...ps.data() });
      }
      profs.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
      setList(profs);
    };
    if (list.length === 0) run();
  }, [profileId, setList, list.length]);
  return null;
}

export default dynamic(() => Promise.resolve(PublicProfileInner), { ssr: false });

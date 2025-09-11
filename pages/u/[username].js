// pages/u/[username].js
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import questions from "../../data/questions";
import Modal from "../../components/Modal";
import QuadRadar from "../../components/QuadRadar";
import AxisCard from "../../components/AxisCard";
import CompassCanvas from "../../components/CompassCanvas";

function PublicProfileInner() {
  const router = useRouter();
  const { username } = router.query;

  // viewer auth (who is looking)
  const [viewer, setViewer] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, (u) => setViewer(u || null)), []);

  // ui
  const [activeTab, setActiveTab] = useState("profile"); // profile | answers
  const [mode, setMode] = useState("split"); // split | spider

  // data
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null); // { id, username, displayName, lastResultId, hotEconDelta, hotSocDelta, ... }
  const [result, setResult] = useState(null);   // latest result doc

  // follows state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // modals
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersList, setFollowersList] = useState([]);

  const [followingOpen, setFollowingOpen] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingList, setFollowingList] = useState([]);

  // load profile by username + result + counts
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
          setProfile(null);
          setResult(null);
          return;
        }
        const profDoc = profSnap.docs[0];
        const prof = { id: profDoc.id, ...profDoc.data() };
        setProfile(prof);

        if (prof.lastResultId) {
          const rSnap = await getDoc(doc(db, "results", prof.lastResultId));
          setResult(rSnap.exists() ? rSnap.data() : null);
        } else {
          setResult(null);
        }

        // counts
        const followersQ = query(collection(db, "follows"), where("followeeUid", "==", prof.id));
        setFollowersCount((await getDocs(followersQ)).size);
        const followingQ = query(collection(db, "follows"), where("followerUid", "==", prof.id));
        setFollowingCount((await getDocs(followingQ)).size);
      } catch (e) {
        console.error("Public profile load error:", e);
        setError(e?.code ? `Error: ${e.code}` : "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  // follow state for viewer
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
        await setDoc(ref, { followerUid: viewer.uid, followeeUid: profile.id, createdAt: serverTimestamp() });
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
      }
    } catch (e) {
      alert(e?.message || "Failed to update follow.");
    } finally {
      setFollowBusy(false);
    }
  };

  // open followers modal
  const openFollowers = async () => {
    if (!profile) return;
    setFollowersOpen(true);
    setFollowersLoading(true);
    setFollowersList([]);
    try {
      const followersQ = query(collection(db, "follows"), where("followeeUid", "==", profile.id));
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
  const closeFollowers = () => { setFollowersOpen(false); setFollowersList([]); };

  // open following modal
  const openFollowing = async () => {
    if (!profile) return;
    setFollowingOpen(true);
    setFollowingLoading(true);
    setFollowingList([]);
    try {
      const followingQ = query(collection(db, "follows"), where("followerUid", "==", profile.id));
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
  const closeFollowing = () => { setFollowingOpen(false); setFollowingList([]); };

  // computed scores (include hot topic deltas for econ/soc if present)
  const dE = Number(profile?.hotEconDelta || 0);
  const dS = Number(profile?.hotSocDelta || 0);

  const baseE = Number(result?.economicScore);
  const baseS = Number(result?.socialScore);
  const baseG = Number(result?.globalScore);
  const baseP = Number(result?.progressScore);

  const hasE = Number.isFinite(baseE);
  const hasS = Number.isFinite(baseS);
  const hasG = Number.isFinite(baseG);
  const hasP = Number.isFinite(baseP);

  const econ = hasE ? baseE + dE : null;
  const soc = hasS ? baseS + dS : null;
  const glob = hasG ? baseG : null;
  const prog = hasP ? baseP : null;

  const hasAny = hasE || hasS || hasG || hasP;
  const hasAdvanced = hasG || hasP;

  // contributions per axis (for hover explanations)
  const contributions = useMemo(() => {
    const ans = (result && result.answers) || {};
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
  }, [result]);

  const fmt2 = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "—");
  const firstName = (profile?.displayName || profile?.username || "User").split(" ")[0];

  // palette per axis
  const palette = {
    economic: { bg: "#DBEAFE", bar: "#BFDBFE", dot: "#3B82F6" }, // blue
    social:   { bg: "#EDE9FE", bar: "#DDD6FE", dot: "#8B5CF6" }, // violet
    global:   { bg: "#DCFCE7", bar: "#BBF7D0", dot: "#22C55E" }, // green
    progress: { bg: "#FFEDD5", bar: "#FED7AA", dot: "#F97316" }, // orange
  };

  // answers list for Answers tab (political compass)
  const compassAnswers = useMemo(() => {
    const ans = (result && result.answers) || {};
    return questions.map((q) => {
      const v = Number.isFinite(Number(ans[q.id])) ? Number(ans[q.id]) : 3;
      const label =
        q.type === "yesno"
          ? (v >= 3 ? "Yes" : "No")
          : ({ 1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree" }[v] ||
            String(v));
      return { id: `compass-${q.id}`, source: "Political Compass", text: q.text, type: q.type, axis: q.axis, value: v, label };
    });
  }, [result]);

  if (loading) return <p className="text-center mt-10">Loading profile…</p>;
  if (notFound || !profile) return <p className="text-center mt-10">Profile not found.</p>;

  const isOwner = viewer && viewer.uid === profile.id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
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
        <button className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50" onClick={openFollowers} title="View followers">
          <span className="font-semibold">{followersCount}</span> Followers
        </button>
        <button className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50" onClick={openFollowing} title="View following">
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
          {/* Compass for orientation */}
          <div className="mb-6">
            <div className="text-sm text-gray-700 font-medium mb-2">Compass (Economic vs Social)</div>
            {econ === null || soc === null ? (
              <p className="text-gray-600">No quiz result yet.</p>
            ) : (
              <CompassCanvas econ={econ} soc={soc} />
            )}
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-lg font-semibold">Spectrum breakdown</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("split")}
                className={`px-3 py-1.5 rounded border ${mode === "split" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-gray-50"}`}
              >
                Split (4 graphs)
              </button>
              <button
                onClick={() => setMode("spider")}
                className={`px-3 py-1.5 rounded border ${mode === "spider" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-gray-50"}`}
              >
                Combined (spider)
              </button>
            </div>
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
                  Global/National and Progressive/Conservative appear only after the advanced 20 questions are completed.
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
                  color={palette.progress}
                />
              </div>

              {!hasAdvanced && (
                <p className="mt-3 text-sm text-gray-600 text-center">
                  This user hasn’t completed the advanced 20 questions yet, so the two extra axes are placeholders.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-3">{firstName}&apos;s answers</h2>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Political Compass</h3>
            {!hasAny ? (
              <p className="text-gray-600">No compass answers yet.</p>
            ) : (
              <div className="space-y-3">
                {compassAnswers.map((a) => (
                  <div key={a.id} className="border rounded p-3">
                    <div className="text-sm text-gray-500 mb-1">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-800 mr-2">{a.source}</span>
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

          {/* If you also want to show Hot Topics answers here, you can add a list below similar to the private profile page. */}
        </div>
      )}

      {/* Followers Modal */}
      <Modal title="Followers" isOpen={followersOpen} onClose={closeFollowers}>
        {followersLoading ? (
          <p>Loading…</p>
        ) : followersList.length === 0 ? (
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
      <Modal title="Following" isOpen={followingOpen} onClose={closeFollowing}>
        {followingLoading ? (
          <p>Loading…</p>
        ) : followingList.length === 0 ? (
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

export default dynamic(() => Promise.resolve(PublicProfileInner), { ssr: false });

// pages/u/[username].js
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import questions from "../../data/questions";

function PublicProfileInner() {
  const router = useRouter();
  const { username } = router.query;

  const [viewer, setViewer] = useState(undefined); // auth user (undefined loading)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setViewer(u || null));
    return () => unsub();
  }, []);

  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'answers'
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const canvasRef = useRef(null);

  // Load profile (by username) + latest result
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

  // Check follow state whenever viewer/profile ready
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

  // Follow/Unfollow actions
  const toggleFollow = async () => {
    if (!viewer) {
      router.push("/login");
      return;
    }
    if (!profile) return;
    if (viewer.uid === profile.id) return;

    setFollowBusy(true);
    try {
      const followId = `${viewer.uid}__${profile.id}`;
      const ref = doc(db, "follows", followId);
      if (isFollowing) {
        await deleteDoc(ref);
        setIsFollowing(false);
      } else {
        await setDoc(ref, {
          followerUid: viewer.uid,
          followeeUid: profile.id,
          createdAt: serverTimestamp(),
        });
        setIsFollowing(true);
      }
    } catch (e) {
      alert(e?.message || "Failed to update follow.");
    } finally {
      setFollowBusy(false);
    }
  };

  // Draw compass when visible
  useEffect(() => {
    if (activeTab !== "profile") return;
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

  // Helpers
  const fmt2 = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? num.toFixed(2) : "0.00";
  };
  const firstName =
    (profile?.displayName || profile?.username || "").trim().split(" ")[0] ||
    (profile ? "User" : "");
  const likertLabel = (n) =>
    ({ 1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree" }[Number(n)] || String(n ?? ""));
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

  // Render guards
  if (loading) return <p className="text-center mt-10">Loading profile…</p>;
  if (notFound || !profile) return <p className="text-center mt-10">Profile not found.</p>;

  const baseE = Number(result?.economicScore || 0);
  const baseS = Number(result?.socialScore || 0);
  const dE = Number(profile?.hotEconDelta || 0);
  const dS = Number(profile?.hotSocDelta || 0);
  const adjE = baseE + dE;
  const adjS = baseS + dS;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">@{profile.username}</h1>
          {profile.displayName && <p className="text-gray-700">{profile.displayName}</p>}
        </div>

        {/* Follow button (only if viewer != owner) */}
        {viewer && profile && viewer.uid !== profile.id && (
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
          {/* Chart + scores */}
          <div className="mt-2">
            <h2 className="text-xl font-semibold mb-3">Latest Result</h2>
            {!result ? (
              <p className="text-gray-600">No quiz result yet.</p>
            ) : (
              <>
                <canvas ref={canvasRef} width="400" height="400" className="border mx-auto" />
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
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-3">{firstName}&apos;s answers</h2>

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

          {/* Hot Topics — already on your page, but public reads allowed in rules */}
          {/* You can add them here later if you want public hot-topic answers too */}
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(PublicProfileInner), { ssr: false });

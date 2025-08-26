// pages/profile.js
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import questions from "../data/questions";

function ProfileInner() {
  const router = useRouter();

  // --- Auth & UI state (hooks run every render; no early returns before hooks) ---
  const [user, setUser] = useState(undefined); // undefined=loading, null=not logged in
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'answers'

  // Profile form state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); // profile form errors
  const [pageError, setPageError] = useState(""); // loader/runtime errors

  const [form, setForm] = useState({
    displayName: "",
    username: "",
    country: "",
    city: "",
    age: "",
    ethnicity: "",
    gender: "",
  });

  // Latest result & deltas
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [redirectingToQuiz, setRedirectingToQuiz] = useState(false);
  const [results, setResults] = useState(null);
  const [deltas, setDeltas] = useState({ hotEconDelta: 0, hotSocDelta: 0 });

  // Answers tab data
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [hotResponses, setHotResponses] = useState([]); // [{... , topic?}]
  const [answersError, setAnswersError] = useState("");

  // --- Auth guard ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  // --- Helpers ---
  const fmt2 = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? num.toFixed(2) : "0.00";
    };
  const firstName = (form.displayName || "").trim().split(" ")[0] || "Your";
  const likertLabel = (n) => {
    const map = {
      1: "Strongly Disagree",
      2: "Disagree",
      3: "Neutral",
      4: "Agree",
      5: "Strongly Agree",
    };
    return map[Number(n)] || String(n ?? "");
  };
  const yesNoFromValue = (n) => (Number(n) >= 3 ? "Yes" : "No");

  // --- Load profile + latest results + deltas ---
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setLoadingProfile(true);
      setPageError("");

      try {
        const profRef = doc(db, "profiles", user.uid);
        const profSnap = await getDoc(profRef);

        let lastResultId = null;
        if (profSnap.exists()) {
          const data = profSnap.data();

          setForm({
            displayName: data.displayName || "",
            username: data.username || "",
            country: data.country || "",
            city: data.city || "",
            age: data.age || "",
            ethnicity: data.ethnicity || "",
            gender: data.gender || "",
          });

          setDeltas({
            hotEconDelta: Number(data.hotEconDelta || 0),
            hotSocDelta: Number(data.hotSocDelta || 0),
          });

          lastResultId = data.lastResultId || null;
        }

        if (!lastResultId) {
          setRedirectingToQuiz(true);
          router.replace("/quiz");
          return;
        }

        const resSnap = await getDoc(doc(db, "results", lastResultId));
        if (resSnap.exists()) {
          setResults(resSnap.data()); // includes .answers map
        } else {
          setRedirectingToQuiz(true);
          router.replace("/quiz");
          return;
        }
      } catch (e) {
        console.error("Profile load error:", e);
        setPageError(
          e?.code ? `Error loading profile/results: ${e.code}` : "Failed to load profile."
        );
      } finally {
        setLoadingProfile(false);
      }
    };

    if (user && user !== null) loadProfile();
  }, [user, router]);

  // --- Load Hot Topic responses when Answers tab opened ---
  useEffect(() => {
    const loadAnswers = async () => {
      if (!user || activeTab !== "answers") return;
      setLoadingAnswers(true);
      setAnswersError("");

      try {
        const respQ = query(
          collection(db, "hotTopicResponses"),
          where("uid", "==", user.uid)
        );
        const respSnap = await getDocs(respQ);
        const responses = respSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // fetch each topic
        const enriched = [];
        for (const r of responses) {
          let topicData = undefined;
          if (r.topicId) {
            try {
              const tSnap = await getDoc(doc(db, "hotTopics", r.topicId));
              if (tSnap.exists()) topicData = tSnap.data();
            } catch (e) {
              // non-fatal: topic might be deleted
            }
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
        console.error("Answers load error:", e);
        setAnswersError(
          e?.code ? `Error loading answers: ${e.code}` : "Failed to load answers."
        );
      } finally {
        setLoadingAnswers(false);
      }
    };

    loadAnswers();
  }, [activeTab, user]);

  // --- Form handlers ---
  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");

    try {
      // unique username
      if (form.username) {
        const qRef = query(
          collection(db, "profiles"),
          where("username", "==", form.username)
        );
        const qs = await getDocs(qRef);
        const taken = qs.docs.some((d) => d.id !== user.uid);
        if (taken) throw new Error("Username already taken. Please choose another.");
      }

      await setDoc(
        doc(db, "profiles", user.uid),
        { ...form, uid: user.uid, updatedAt: serverTimestamp() },
        { merge: true }
      );

      alert("Profile saved!");
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  // --- Derived values (safe) ---
  const baseEcon = Number(results?.economicScore ?? 0);
  const baseSoc = Number(results?.socialScore ?? 0);
  const adjEcon = baseEcon + Number(deltas?.hotEconDelta ?? 0);
  const adjSoc = baseSoc + Number(deltas?.hotSocDelta ?? 0);

  // Build Compass answers list safely
  const compassAnswers = useMemo(() => {
    const ans = (results && results.answers) || {};
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
  }, [results]);

  // Hot topic answers list safely
  const hotAnswers = useMemo(
    () =>
      hotResponses.map((r) => {
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
      }),
    [hotResponses]
  );

  const publicUrl =
    form.username ? `${typeof window !== "undefined" ? window.location.origin : ""}/u/${form.username}` : "";

  // --- Conditional renders AFTER hooks are defined ---
  if (user === undefined) return <p className="text-center mt-10">Checking your session…</p>;
  if (user === null) return null;
  if (redirectingToQuiz) return <p className="text-center mt-10">Please complete the quiz first… Redirecting…</p>;
  if (loadingProfile) return <p className="text-center mt-10">Loading your profile…</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2 text-center">Your Profile</h1>

      {pageError && (
        <div className="mb-4 p-3 rounded border bg-red-50 text-red-700 text-sm">{pageError}</div>
      )}

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab("profile")}
          className={[
            "px-4 py-2 rounded",
            activeTab === "profile" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800",
          ].join(" ")}
        >
          Profile
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

      {activeTab === "profile" ? (
        <>
          {/* Profile form */}
          <form onSubmit={handleSave} className="space-y-4 bg-white p-6 rounded shadow">
            <div>
              <label className="block font-semibold mb-1">Display Name</label>
              <input
                className="w-full border p-2 rounded"
                name="displayName"
                value={form.displayName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Username (unique)</label>
              <input
                className="w-full border p-2 rounded"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Country</label>
                <input
                  className="w-full border p-2 rounded"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">City</label>
                <input
                  className="w-full border p-2 rounded"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Age</label>
              <input
                type="number"
                className="w-full border p-2 rounded"
                name="age"
                value={form.age}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Ethnicity (optional)</label>
              <input
                className="w-full border p-2 rounded"
                name="ethnicity"
                value={form.ethnicity}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Gender</label>
              <select
                className="w-full border p-2 rounded"
                name="gender"
                value={form.gender}
                onChange={handleChange}
              >
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </select>
            </div>

            {error && <p className="text-red-600">{error}</p>}

            <button
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </form>

          {/* Public link */}
          <div className="mt-6 bg-gray-50 p-4 rounded border">
            <h3 className="font-semibold mb-2">Public profile link</h3>
            {form.username ? (
              <div className="flex items-center gap-2">
                <input readOnly value={publicUrl} className="flex-1 border p-2 rounded bg-white" />
                <button
                  className="px-3 py-2 bg-indigo-600 text-white rounded"
                  onClick={() => publicUrl && navigator.clipboard?.writeText(publicUrl)}
                >
                  Copy
                </button>
              </div>
            ) : (
              <p className="text-gray-600">Set a username to get your shareable link.</p>
            )}
          </div>

          {/* Results & Adjusted */}
          {results && (
            <div className="mt-8 bg-gray-50 p-6 rounded shadow">
              <h2 className="text-xl font-semibold mb-2">Latest Quiz Result</h2>
              <p><strong>Economic Score (base):</strong> {fmt2(baseEcon)}</p>
              <p><strong>Social Score (base):</strong> {fmt2(baseSoc)}</p>
              <div className="mt-3">
                <p><strong>Adjustments from Hot Topics:</strong></p>
                <p>Economic Δ: {fmt2(deltas?.hotEconDelta)}</p>
                <p>Social Δ: {fmt2(deltas?.hotSocDelta)}</p>
              </div>
              <div className="mt-3">
                <p className="font-semibold">Adjusted Scores</p>
                <p>Economic (adjusted): {fmt2(adjEcon)}</p>
                <p>Social (adjusted): {fmt2(adjSoc)}</p>
              </div>
            </div>
          )}
        </>
      ) : (
        // --- Answers tab ---
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">{firstName}&apos;s answers</h2>

          {answersError && (
            <div className="mb-4 p-3 rounded border bg-red-50 text-red-700 text-sm">{answersError}</div>
          )}

          {loadingAnswers ? (
            <p>Loading answers…</p>
          ) : (
            <>
              {/* COMPASS ANSWERS */}
              <div>
                <h3 className="font-semibold mb-2">Political Compass</h3>
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
              </div>

              {/* HOT TOPIC ANSWERS */}
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Hot Topics</h3>
                {hotAnswers.length === 0 ? (
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
                            <span className="ml-2 text-xs">
                              · {a.createdAt.toDate().toLocaleString()}
                            </span>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Client-only to avoid hydration issues
export default dynamic(() => Promise.resolve(ProfileInner), { ssr: false });

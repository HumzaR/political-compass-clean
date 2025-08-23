// pages/profile.js
import { useEffect, useState } from "react";
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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(undefined); // undefined=loading, null=not logged in
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [redirectingToQuiz, setRedirectingToQuiz] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    displayName: "",
    username: "",
    country: "",
    city: "",
    age: "",
    ethnicity: "",
    gender: "",
  });

  const [results, setResults] = useState(null);

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  // Load profile + last results; if no results -> redirect to /quiz
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setLoadingProfile(true);

      try {
        const profRef = doc(db, "profiles", user.uid);
        const profSnap = await getDoc(profRef);

        let lastResultId = null;
        if (profSnap.exists()) {
          const data = profSnap.data();
          lastResultId = data.lastResultId || null;

          setForm({
            displayName: data.displayName || "",
            username: data.username || "",
            country: data.country || "",
            city: data.city || "",
            age: data.age || "",
            ethnicity: data.ethnicity || "",
            gender: data.gender || "",
          });
        }

        if (!lastResultId) {
          setRedirectingToQuiz(true);
          router.replace("/quiz");
          return;
        }

        const resSnap = await getDoc(doc(db, "results", lastResultId));
        if (resSnap.exists()) {
          setResults(resSnap.data());
        } else {
          setRedirectingToQuiz(true);
          router.replace("/quiz");
          return;
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    if (user && user !== null) loadProfile();
  }, [user, router]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");

    try {
      // Enforce unique username (if provided)
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
        {
          ...form,
          uid: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      alert("Profile saved!");
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  // Loading / redirect states
  if (user === undefined) {
    return <p className="text-center mt-10">Checking your session…</p>;
  }
  if (user === null) {
    return null; // brief flash before redirect to /login
  }
  if (redirectingToQuiz) {
    return <p className="text-center mt-10">Please complete the quiz first… Redirecting…</p>;
  }
  if (loadingProfile) {
    return <p className="text-center mt-10">Loading your profile…</p>;
  }

  const publicUrl =
    form.username ? `${typeof window !== "undefined" ? window.location.origin : ""}/u/${form.username}` : "";

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Your Profile</h1>

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
            <input
              readOnly
              value={publicUrl}
              className="flex-1 border p-2 rounded bg-white"
            />
            <button
              className="px-3 py-2 bg-indigo-600 text-white rounded"
              onClick={() => {
                if (publicUrl) {
                  navigator.clipboard?.writeText(publicUrl);
                }
              }}
            >
              Copy
            </button>
          </div>
        ) : (
          <p className="text-gray-600">
            Set a username to get your shareable link.
          </p>
        )}
      </div>

      {results && (
        <div className="mt-8 bg-gray-50 p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Last Quiz Result</h2>
          <p>
            <strong>Economic Score:</strong> {results.economicScore}
          </p>
          <p>
            <strong>Social Score:</strong> {results.socialScore}
          </p>
          <p>
            <strong>Date:</strong>{" "}
            {results.createdAt?.toDate
              ? results.createdAt.toDate().toLocaleString()
              : "N/A"}
          </p>
        </div>
      )}
    </div>
  );
}

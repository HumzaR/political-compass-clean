// pages/profile.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db, firestore } from "../lib/firebase";
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // Watch auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);

        // Load profile
        const ref = doc(db, "profiles", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setForm({
            displayName: data.displayName || "",
            username: data.username || "",
            country: data.country || "",
            city: data.city || "",
            age: data.age || "",
            ethnicity: data.ethnicity || "",
            gender: data.gender || "",
          });
          // load last result if stored
          if (data.lastResultId) {
            const resultSnap = await getDoc(doc(db, "results", data.lastResultId));
            if (resultSnap.exists()) {
              setResults(resultSnap.data());
            }
          }
        }
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Check if username is unique
      if (form.username) {
        const q = query(
          collection(db, "profiles"),
          where("username", "==", form.username)
        );
        const qs = await getDocs(q);
        const taken = qs.docs.some((d) => d.id !== user.uid);
        if (taken) {
          throw new Error("Username already taken. Please choose another.");
        }
      }

      await setDoc(
        doc(db, "profiles", user.uid),
        {
          ...form,
          updatedAt: serverTimestamp(),
          uid: user.uid,
        },
        { merge: true }
      );

      alert("Profile saved!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center mt-10">Loading profile…</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Your Profile</h1>

      <form
        onSubmit={handleSave}
        className="space-y-4 bg-white p-6 rounded shadow"
      >
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
            {results.createdAt?.toDate().toLocaleString() || "N/A"}
          </p>
        </div>
      )}
    </div>
  );
}

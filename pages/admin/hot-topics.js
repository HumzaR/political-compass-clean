// pages/admin/hot-topics.js
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

function AdminHotTopicsInner() {
  const router = useRouter();
  const [user, setUser] = useState(undefined); // undefined=loading, null=not logged in
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    text: "",
    type: "scale", // 'scale' | 'yesno'
    axis: "economic", // 'economic' | 'social'
    weight: 1,
    direction: 1, // -1 or 1
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // Check admin by presence in /admins/{uid}
  useEffect(() => {
    const check = async () => {
      if (user === undefined) return;
      if (user === null) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }
      try {
        const qAdmin = query(collection(db, "admins"), where("__name__", "==", user.uid));
        const qs = await getDocs(qAdmin);
        setIsAdmin(!qs.empty);
      } finally {
        setCheckingAdmin(false);
      }
    };
    check();
  }, [user]);

  // Load topics
  const loadTopics = async () => {
    setLoading(true);
    try {
      const qTopics = query(collection(db, "hotTopics"), orderBy("createdAt", "desc"));
      const qs = await getDocs(qTopics);
      setTopics(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkingAdmin) return;
    if (!isAdmin) return;
    loadTopics();
  }, [checkingAdmin, isAdmin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]:
        name === "weight" || name === "direction"
          ? Number(value)
          : value,
    }));
  };

  const createTopic = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      // Basic validation
      if (!form.text.trim()) throw new Error("Question text is required.");
      if (!["scale", "yesno"].includes(form.type)) throw new Error("Invalid type.");
      if (!["economic", "social"].includes(form.axis)) throw new Error("Invalid axis.");
      if (![1, -1].includes(Number(form.direction))) throw new Error("Direction must be +1 or -1.");

      await addDoc(collection(db, "hotTopics"), {
        text: form.text.trim(),
        type: form.type,
        axis: form.axis,
        weight: Number(form.weight) || 1,
        direction: Number(form.direction) || 1,
        active: !!form.active,
        createdAt: serverTimestamp(),
      });

      setForm({
        text: "",
        type: "scale",
        axis: "economic",
        weight: 1,
        direction: 1,
        active: true,
      });

      await loadTopics();
    } catch (e2) {
      setError(e2?.message || "Failed to create topic.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t) => {
    try {
      await updateDoc(doc(db, "hotTopics", t.id), { active: !t.active });
      await loadTopics();
    } catch (e) {
      alert(e?.message || "Failed to toggle active.");
    }
  };

  const deleteTopic = async (t) => {
    if (!confirm("Delete this hot topic? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "hotTopics", t.id));
      await loadTopics();
    } catch (e) {
      alert(e?.message || "Failed to delete.");
    }
  };

  // UI guards
  if (user === undefined || checkingAdmin) {
    return <p className="text-center mt-10">Checking admin access…</p>;
  }
  if (user === null) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <p className="mb-4">You must log in to access the admin console.</p>
        <button
          className="px-5 py-2 rounded bg-indigo-600 text-white"
          onClick={() => router.push("/login")}
        >
          Go to Login
        </button>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <h1 className="text-xl font-semibold mb-2">Access denied</h1>
        <p className="text-gray-600">Your account is not an admin.</p>
        <button
          className="mt-4 px-5 py-2 rounded border"
          onClick={() => signOut(auth)}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Hot Topics — Admin</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Signed in as {user.email || user.uid}</span>
          <button className="px-3 py-1.5 rounded border" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>

      <form onSubmit={createTopic} className="bg-white rounded-xl border p-4 sm:p-6 shadow-sm space-y-4">
        <div>
          <label className="block font-semibold mb-1">Question text</label>
          <textarea
            name="text"
            className="w-full border p-2 rounded"
            rows={3}
            value={form.text}
            onChange={handleChange}
            placeholder="e.g., Should rent caps be implemented in major cities this year?"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold mb-1">Type</label>
            <select name="type" className="w-full border p-2 rounded" value={form.type} onChange={handleChange}>
              <option value="scale">Likert (1–5)</option>
              <option value="yesno">Yes / No</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Axis</label>
            <select name="axis" className="w-full border p-2 rounded" value={form.axis} onChange={handleChange}>
              <option value="economic">Economic</option>
              <option value="social">Social</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Weight</label>
            <input
              name="weight"
              type="number"
              className="w-full border p-2 rounded"
              min={1}
              max={5}
              value={form.weight}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold mb-1">Direction</label>
            <select name="direction" className="w-full border p-2 rounded" value={form.direction} onChange={handleChange}>
              <option value={1}>+1 (Right/Authoritarian)</option>
              <option value={-1}>-1 (Left/Libertarian)</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="active"
                checked={!!form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              <span>Active</span>
            </label>
          </div>
          <div className="flex items-end justify-end">
            <button
              disabled={saving}
              className="px-5 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create Topic"}
            </button>
          </div>
        </div>

        {error && <p className="text-red-600">{error}</p>}
      </form>

      <div className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">All Topics</h2>
        {loading ? (
          <p className="text-gray-600">Loading…</p>
        ) : topics.length === 0 ? (
          <p className="text-gray-600">No topics yet.</p>
        ) : (
          topics.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{t.text}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Type: {t.type} · Axis: {t.axis} · Weight: {t.weight ?? 1} · Direction: {t.direction} ·{" "}
                    <span className={t.active ? "text-green-700" : "text-gray-600"}>
                      {t.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded border"
                    onClick={() => toggleActive(t)}
                    title="Toggle active"
                  >
                    {t.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    className="px-3 py-1.5 rounded border text-red-600"
                    onClick={() => deleteTopic(t)}
                    title="Delete topic"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(AdminHotTopicsInner), { ssr: false });

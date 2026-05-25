import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

function getDebateModeLabel(mode) {
  if (mode === "message") return "Message";
  return "Video/voice";
}

export default function DebatesIndexPage() {
  const router = useRouter();
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const [title, setTitle] = useState("");
  const [motionText, setMotionText] = useState("");
  const [debateMode, setDebateMode] = useState("video_voice");
  const [format, setFormat] = useState("short");
  const [domain, setDomain] = useState("politics");
  const [rounds, setRounds] = useState(3);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  async function loadDebates() {
    try {
      setError("");
      setLoading(true);

      const headers = await getAuthHeaders();
      const res = await fetch("/api/debates?limit=25", { headers });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body?.error || "Failed to load debates");

      setItems(Array.isArray(body?.debates) ? body.debates : []);
    } catch (e) {
      setError(e.message || "Failed to load debates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadDebates();
    else if (user === null) setLoading(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function onCreate(e) {
    e.preventDefault();

    try {
      setError("");
      setCreating(true);

      const headers = {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      };

      const res = await fetch("/api/debates", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          motionText,
          debateMode,
          format,
          domain,
          rounds: Number(rounds),
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body?.error || "Failed to create debate");

      const debateId = body?.debate?.id;

      if (!debateId) throw new Error("Debate created but missing debate id");

      router.push(`/debates/${debateId}/invite`);
    } catch (e) {
      setError(e.message || "Failed to create debate");
    } finally {
      setCreating(false);
    }
  }

  if (user === undefined) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold mb-2">Debates</h1>

        <p className="text-gray-600 mb-5">
          Please sign in to create and manage debates.
        </p>

        <Link
          href="/login"
          className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-semibold mb-1">Debates</h1>

      <p className="text-gray-600 mb-6">
        Create a debate and jump into the workspace.
      </p>

      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={onCreate} className="mb-8 rounded-xl border p-4 space-y-4">
        <h2 className="text-2xl font-medium">Create Debate</h2>

        <input
          className="w-full rounded border p-3"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          className="w-full rounded border p-3 min-h-[120px]"
          placeholder="Motion text"
          value={motionText}
          onChange={(e) => setMotionText(e.target.value)}
          required
        />

        <div className="grid md:grid-cols-4 gap-3">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-700">Format</div>
            <select
              className="w-full rounded border p-3"
              value={debateMode}
              onChange={(e) => setDebateMode(e.target.value)}
            >
              <option value="video_voice">Video/voice</option>
              <option value="message">Message</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-700">Length</div>
            <select
              className="w-full rounded border p-3"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="short">Short</option>
              <option value="long">Long</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-700">Topic</div>
            <select
              className="w-full rounded border p-3"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            >
              <option value="politics">Politics</option>
              <option value="sports">Sports</option>
              <option value="general">General</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-700">Rounds</div>
            <input
              className="w-full rounded border p-3"
              type="number"
              min={1}
              max={20}
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
            />
          </label>
        </div>

        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          {debateMode === "message"
            ? "Message debates use a live text chat instead of Daily video. The AI judge scores the written transcript."
            : "Video/voice debates use Daily video and transcription. The AI judge scores the captured transcript."}
        </div>

        <button
          disabled={creating}
          className="rounded-lg border px-5 py-3 font-medium disabled:opacity-50"
          type="submit"
        >
          {creating ? "Creating..." : "Create debate"}
        </button>
      </form>

      <div>
        <h3 className="text-2xl font-medium mb-3">Recent debates</h3>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-gray-600">No debates yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((d) => (
              <div
                key={d.id}
                className="rounded-lg border p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{d.title || "Untitled debate"}</div>

                  <div className="text-sm text-gray-600">
                    {getDebateModeLabel(d.debateMode)} · {d.format} · {d.domain} ·{" "}
                    {d.status}
                  </div>
                </div>

                <Link className="text-indigo-600 underline" href={`/debates/${d.id}`}>
                  Open workspace
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
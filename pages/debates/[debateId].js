import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export default function DebateWorkspacePage() {
  const router = useRouter();
  const { debateId } = router.query;

  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [scorecard, setScorecard] = useState(null);

  const [roundIdInput, setRoundIdInput] = useState("");
  const [speakersJson, setSpeakersJson] = useState(
    JSON.stringify(
      {
        speakerA: {
          dimensions: {
            argumentQuality: 70,
            factualAccuracy: 65,
            rebuttalEffectiveness: 60,
            rhetoricDelivery: 66,
            topicConsistency: 72,
          },
          penalties: 0,
          bonuses: 0,
        },
        speakerB: {
          dimensions: {
            argumentQuality: 68,
            factualAccuracy: 67,
            rebuttalEffectiveness: 62,
            rhetoricDelivery: 64,
            topicConsistency: 70,
          },
          penalties: 0,
          bonuses: 0,
        },
      },
      null,
      2
    )
  );

  const [speakerUserId, setSpeakerUserId] = useState("");
  const [segmentText, setSegmentText] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  const firstOpenRoundId = useMemo(() => {
    const rounds = workspace?.debate?.rounds || [];
    const openRound = rounds.find((r) => r.status !== "closed");
    return openRound?.id || "";
  }, [workspace]);

  useEffect(() => {
    if (!roundIdInput && firstOpenRoundId) setRoundIdInput(firstOpenRoundId);
  }, [firstOpenRoundId, roundIdInput]);

  async function loadWorkspace() {
    if (!debateId) return;
    try {
      setLoading(true);
      setError("");
      setNotice("");
      const res = await fetch(`/api/debates/${debateId}/workspace`, {
        headers: await getAuthHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to load workspace");
      setWorkspace(body);
      setScorecard(null);
    } catch (e) {
      setError(e.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && debateId) loadWorkspace();
    else if (user === null) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, debateId]);

  useEffect(() => {
    const status = workspace?.debate?.status;
    if (status !== "live") return;
    const id = setInterval(() => loadWorkspace(), 15000);
    return () => clearInterval(id);
  }, [workspace?.debate?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function callApi(path, method = "POST", body) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(path, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(await getAuthHeaders()),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Request failed");
      return json;
    } finally {
      setBusy(false);
    }
  }

  async function onStart() {
    try {
      await callApi(`/api/debates/${debateId}/start`, "POST");
      setNotice("Debate started.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onEnd() {
    try {
      await callApi(`/api/debates/${debateId}/end`, "POST");
      setNotice("Debate ended.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onCreateLiveSession() {
    try {
      await callApi(`/api/debates/${debateId}/live/session`, "POST");
      setNotice("Live session metadata created.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onCloseRound() {
    try {
      const speakers = JSON.parse(speakersJson);
      if (!roundIdInput) throw new Error("Round ID is required.");
      await callApi(`/api/debates/${debateId}/rounds/${roundIdInput}/close`, "POST", { speakers });
      setNotice("Round closed.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message || "Invalid speakers JSON");
    }
  }

  async function onComputeFinal() {
    try {
      await callApi(`/api/debates/${debateId}/score/final`, "POST", { confidenceFactor: 1 });
      setNotice("Final score computed.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onLoadScorecard() {
    try {
      const res = await fetch(`/api/debates/${debateId}/scorecard`, {
        headers: await getAuthHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to load scorecard");
      setScorecard(body);
    } catch (e) {
      setError(e.message);
    }
  }

  async function onAddSegment() {
    try {
      if (!segmentText.trim()) throw new Error("Transcript text is required.");
      await callApi(`/api/debates/${debateId}/transcript/segments`, "POST", {
        segments: [
          {
            speakerUserId: speakerUserId || undefined,
            startMs: Date.now(),
            endMs: Date.now() + 2000,
            text: segmentText.trim(),
            confidence: 0.95,
          },
        ],
      });
      setSegmentText("");
      setNotice("Transcript segment added.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message);
    }
  }

  if (user === undefined) return null;
  if (!user) return <div className="mx-auto max-w-4xl p-6">Please sign in to access debate workspace.</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-5">
      <h1 className="text-3xl font-semibold">Debate Workspace</h1>
      <p className="text-gray-600">Debate ID: {debateId}</p>

      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}
      {notice ? <div className="rounded border border-green-200 bg-green-50 p-3 text-green-700">{notice}</div> : null}

      {loading ? (
        <div className="text-gray-500">Loading workspace...</div>
      ) : (
        <>
          <div className="rounded-xl border p-4">
            <div className="font-medium">Status: {workspace?.debate?.status}</div>
            <div className="text-sm text-gray-600 mt-1">
              Rounds: {workspace?.roundCount ?? 0} · Closed: {workspace?.closedRoundCount ?? 0} · Live session:{" "}
              {workspace?.hasLiveSession ? "yes" : "no"}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={busy} onClick={onCreateLiveSession} className="rounded border px-3 py-2">
                Create live session
              </button>
              <button disabled={busy} onClick={onStart} className="rounded border px-3 py-2">
                Start debate
              </button>
              <button disabled={busy} onClick={onEnd} className="rounded border px-3 py-2">
                End debate
              </button>
              <button disabled={busy} onClick={onComputeFinal} className="rounded border px-3 py-2">
                Compute final score
              </button>
              <button disabled={busy} onClick={onLoadScorecard} className="rounded border px-3 py-2">
                Load scorecard
              </button>
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <h2 className="text-xl font-medium">Close Round</h2>
            <input
              className="w-full rounded border p-2"
              value={roundIdInput}
              onChange={(e) => setRoundIdInput(e.target.value)}
              placeholder="Round ID"
            />
            <textarea
              className="w-full rounded border p-2 min-h-[200px] font-mono text-sm"
              value={speakersJson}
              onChange={(e) => setSpeakersJson(e.target.value)}
            />
            <button disabled={busy} onClick={onCloseRound} className="rounded border px-3 py-2">
              Close round
            </button>
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <h2 className="text-xl font-medium">Transcript</h2>
            <input
              className="w-full rounded border p-2"
              value={speakerUserId}
              onChange={(e) => setSpeakerUserId(e.target.value)}
              placeholder="speakerUserId (optional)"
            />
            <textarea
              className="w-full rounded border p-2 min-h-[100px]"
              value={segmentText}
              onChange={(e) => setSegmentText(e.target.value)}
              placeholder="Transcript text"
            />
            <button disabled={busy} onClick={onAddSegment} className="rounded border px-3 py-2">
              Add transcript segment
            </button>

            <div className="text-sm text-gray-700 mt-3">
              Segments: {(workspace?.transcriptSegments || []).length}
            </div>
          </div>

          {scorecard ? (
            <div className="rounded-xl border p-4">
              <h2 className="text-xl font-medium mb-2">Scorecard</h2>
              <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded">
                {JSON.stringify(scorecard, null, 2)}
              </pre>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
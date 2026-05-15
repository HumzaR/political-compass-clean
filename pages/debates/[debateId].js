import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

async function getAuthHeaders() {
  const user = auth.currentUser;

  if (!user) {
    return {};
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

function formatTimer(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
    });

    return () => unsub();
  }, []);

  const debate = workspace?.debate || null;
  const participants = debate?.participants || [];
  const hasTwoParticipants = participants.length >= 2;

  const roundCount = workspace?.meta?.roundCount ?? debate?.rounds?.length ?? 0;
  const closedRoundCount = workspace?.meta?.closedRoundCount ?? 0;
  const hasLiveSession = workspace?.meta?.hasLiveSession ?? !!debate?.live;

  const isWaitingForOpponent =
    debate?.status === "scheduled" && !hasTwoParticipants;

  const canStartDebate =
    debate?.status === "scheduled" && hasTwoParticipants;

  const firstOpenRoundId = useMemo(() => {
    const rounds = debate?.rounds || [];
    const openRound = rounds.find((r) => r.status !== "closed");

    return openRound?.id || "";
  }, [debate]);

  const liveJoinUrl = useMemo(() => {
    const live = debate?.live;

    if (!live) {
      return "";
    }

    if (live.joinUrl) {
      return live.joinUrl;
    }

    if (live.roomUrl && live.token) {
      return `${live.roomUrl}?t=${live.token}`;
    }

    return live.roomUrl || "";
  }, [debate]);

  const estimatedDurationLabel = useMemo(() => {
    const format = debate?.format || "short";
    const count = Number(roundCount || 0);

    if (!count) {
      return format === "long" ? "Long format" : "Short format";
    }

    const minutesPerRound = format === "long" ? 3 : 1;
    const totalMinutes = count * minutesPerRound;

    return `${totalMinutes} min estimated`;
  }, [debate?.format, roundCount]);

  const resultSummary = useMemo(() => {
    const finalScore = debate?.finalScore;

    if (!finalScore) {
      return null;
    }

    const leaderboard = finalScore.leaderboard || [];
    const winner = leaderboard[0];

    if (!winner) {
      return {
        title: "No winner calculated yet",
        body: "The debate has ended, but no winner could be calculated.",
      };
    }

    if (finalScore.tie) {
      return {
        title: "Debate ended in a tie",
        body: "Both sides finished with the same score.",
      };
    }

    return {
      title: `${winner.speakerId} won the debate`,
      body: `${winner.speakerId} won with a score of ${Number(winner.score).toFixed(
        1
      )}. The winner is based on the scored round dimensions, penalties, bonuses and final confidence factor.`,
    };
  }, [debate?.finalScore]);

  useEffect(() => {
    if (!roundIdInput && firstOpenRoundId) {
      setRoundIdInput(firstOpenRoundId);
    }
  }, [firstOpenRoundId, roundIdInput]);

  useEffect(() => {
    if (debate?.status !== "live" || !debate?.startedAt) {
      return;
    }

    function updateElapsed() {
      const startedAtMs = new Date(debate.startedAt).getTime();

      if (!Number.isFinite(startedAtMs)) {
        setElapsedSeconds(0);
        return;
      }

      const diffSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
      setElapsedSeconds(Math.max(0, diffSeconds));
    }

    updateElapsed();

    const id = setInterval(updateElapsed, 1000);

    return () => clearInterval(id);
  }, [debate?.status, debate?.startedAt]);

  async function loadWorkspace() {
    if (!debateId) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setNotice("");

      const res = await fetch(`/api/debates/${debateId}/workspace`, {
        headers: await getAuthHeaders(),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.error || "Failed to load workspace");
      }

      setWorkspace(body);
      setScorecard(null);
    } catch (e) {
      setError(e.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && debateId) {
      loadWorkspace();
    } else if (user === null) {
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, debateId]);

  useEffect(() => {
    const status = debate?.status;

    if (status !== "live" && status !== "scheduled") {
      return;
    }

    const id = setInterval(() => {
      loadWorkspace();
    }, 15000);

    return () => clearInterval(id);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debate?.status]);

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

      if (!res.ok) {
        throw new Error(json?.error || "Request failed");
      }

      return json;
    } finally {
      setBusy(false);
    }
  }

  async function onStart() {
    try {
      if (!hasTwoParticipants) {
        throw new Error("You need two participants before starting the debate.");
      }

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

      setNotice("Live session created.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onCloseRound() {
    try {
      const speakers = JSON.parse(speakersJson);

      if (!roundIdInput) {
        throw new Error("Round ID is required.");
      }

      await callApi(`/api/debates/${debateId}/rounds/${roundIdInput}/close`, "POST", {
        speakers,
      });

      setNotice("Round closed.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message || "Invalid speakers JSON");
    }
  }

  async function onComputeFinal() {
    try {
      await callApi(`/api/debates/${debateId}/score/final`, "POST", {
        confidenceFactor: 1,
      });

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

      if (!res.ok) {
        throw new Error(body?.error || "Failed to load scorecard");
      }

      setScorecard(body);
    } catch (e) {
      setError(e.message);
    }
  }

  async function onAddSegment() {
    try {
      if (!segmentText.trim()) {
        throw new Error("Transcript text is required.");
      }

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

  if (user === undefined) {
    return null;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        Please sign in to access debate workspace.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Debate Workspace</h1>
        <p className="text-gray-600">Debate ID: {debateId}</p>
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-green-700">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <div className="text-gray-500">Loading workspace...</div>
      ) : (
        <>
          <div className="rounded-xl border p-4">
            <div className="font-medium">Status: {debate?.status}</div>

            <div className="text-sm text-gray-600 mt-1">
              Rounds: {roundCount} · Closed: {closedRoundCount} · Live session:{" "}
              {hasLiveSession ? "yes" : "no"} · Participants: {participants.length}/2
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                disabled={busy}
                onClick={onCreateLiveSession}
                className="rounded border px-3 py-2 disabled:opacity-50"
              >
                Create live session
              </button>

              <button
                disabled={busy || !canStartDebate}
                onClick={onStart}
                className="rounded border px-3 py-2 disabled:opacity-50"
              >
                Start debate
              </button>

              <button
                disabled={busy || debate?.status !== "live"}
                onClick={onEnd}
                className="rounded border px-3 py-2 disabled:opacity-50"
              >
                End debate
              </button>

              <button
                disabled={busy || debate?.status !== "ended"}
                onClick={onComputeFinal}
                className="rounded border px-3 py-2 disabled:opacity-50"
              >
                Compute final score
              </button>

              <button
                disabled={busy}
                onClick={onLoadScorecard}
                className="rounded border px-3 py-2 disabled:opacity-50"
              >
                Load scorecard
              </button>
            </div>
          </div>

          {isWaitingForOpponent ? (
            <div className="rounded-xl border p-8 text-center space-y-4">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />

              <div>
                <h2 className="text-2xl font-semibold">Waiting for opponent...</h2>
                <p className="mt-2 text-gray-600">
                  Share the invite link and keep this page open. The debate will be ready once
                  another user joins.
                </p>
              </div>

              <div className="text-sm text-gray-500">
                Participants joined: {participants.length}/2
              </div>
            </div>
          ) : null}

          {debate?.status === "scheduled" && hasTwoParticipants ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <h2 className="text-xl font-semibold text-green-800">
                Opponent joined
              </h2>
              <p className="mt-1 text-green-700">
                Both participants are now in the debate. Create a live session if you have not
                already, then start the debate.
              </p>
            </div>
          ) : null}

          {liveJoinUrl ? (
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-medium">Live Video Debate</h2>
                  <p className="text-sm text-gray-600">
                    Daily room: {debate?.live?.roomName || "Created"}
                  </p>
                </div>

                <a
                  href={liveJoinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border px-3 py-2"
                >
                  Open in new tab
                </a>
              </div>

              <div className="relative overflow-hidden rounded-lg border">
                {debate?.status === "live" ? (
                  <div className="absolute left-4 right-4 top-4 z-10 rounded-xl bg-black/75 p-4 text-white shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">
                          {debate?.title || "Live debate"}
                        </div>
                        <div className="text-sm opacity-90">
                          {debate?.format} format · {roundCount} rounds ·{" "}
                          {estimatedDurationLabel}
                        </div>
                      </div>

                      <div className="rounded-lg bg-white/15 px-4 py-2 font-mono text-2xl">
                        {formatTimer(elapsedSeconds)}
                      </div>
                    </div>
                  </div>
                ) : null}

                <iframe
                  src={liveJoinUrl}
                  className="h-[650px] w-full"
                  allow="camera; microphone; fullscreen; display-capture; autoplay"
                />
              </div>
            </div>
          ) : null}

          {debate?.status === "ended" ? (
            <div className="rounded-xl border p-5 space-y-3">
              <h2 className="text-2xl font-semibold">Debate finished</h2>

              {resultSummary ? (
                <div className="rounded-lg bg-gray-50 p-4">
                  <h3 className="font-semibold">{resultSummary.title}</h3>
                  <p className="mt-1 text-gray-700">{resultSummary.body}</p>
                </div>
              ) : (
                <p className="text-gray-600">
                  The debate has ended. Click Compute final score, then Load scorecard to view
                  the result.
                </p>
              )}
            </div>
          ) : null}

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

            <button
              disabled={busy || debate?.status !== "live"}
              onClick={onCloseRound}
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              Close round
            </button>
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <h2 className="text-xl font-medium">Transcript</h2>

            <input
              className="w-full rounded border p-2"
              value={speakerUserId}
              onChange={(e) => setSpeakerUserId(e.target.value)}
              placeholder="speakerUserId, optional"
            />

            <textarea
              className="w-full rounded border p-2 min-h-[100px]"
              value={segmentText}
              onChange={(e) => setSegmentText(e.target.value)}
              placeholder="Transcript text"
            />

            <button
              disabled={busy}
              onClick={onAddSegment}
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
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
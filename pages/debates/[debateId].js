import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const CustomDailyCall = dynamic(
  () => import("@/components/debates/CustomDailyCall"),
  { ssr: false }
);

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

function getDebateDurationSeconds(format, roundCount) {
  const safeRoundCount = Math.max(1, Number(roundCount || 1));

  if (format === "long") {
    return safeRoundCount * 3 * 60;
  }

  return safeRoundCount * 1 * 60;
}

function getModeLabel(debateMode) {
  if (debateMode === "message") {
    return "Message";
  }

  return "Video/voice";
}

function MessageDebatePanel({
  debate,
  transcriptSegments,
  speakerAName,
  speakerBName,
  timerText,
  busy,
  isParticipant,
  onSendMessage,
}) {
  const [message, setMessage] = useState("");

  const sortedSegments = useMemo(() => {
    return [...(transcriptSegments || [])].sort(
      (a, b) => Number(a.startMs || 0) - Number(b.startMs || 0)
    );
  }, [transcriptSegments]);

  async function submitMessage(e) {
    e.preventDefault();

    const text = message.trim();

    if (!text) {
      return;
    }

    await onSendMessage(text);
    setMessage("");
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b bg-neutral-950 p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-indigo-300">
              Message Debate
            </div>

            <h2 className="mt-1 text-2xl font-bold">
              {debate?.title || "Untitled debate"}
            </h2>

            <div className="mt-2 flex flex-wrap gap-2 text-sm text-white/70">
              <span className="rounded-full bg-white/10 px-3 py-1">
                {speakerAName} vs {speakerBName}
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1">
                Status: {debate?.status}
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1">
                Messages: {sortedSegments.length}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">
              Countdown
            </div>

            <div className="mt-1 rounded-xl bg-white px-5 py-2 font-mono text-4xl font-bold text-neutral-950">
              {debate?.status === "live" ? timerText : "00:00"}
            </div>
          </div>
        </div>
      </div>

      <div className="max-h-[520px] min-h-[360px] space-y-3 overflow-y-auto bg-gray-50 p-4">
        {sortedSegments.length ? (
          sortedSegments.map((segment) => {
            const isSpeakerA = segment.speakerUserId === "speakerA";
            const name = isSpeakerA ? speakerAName : speakerBName;

            return (
              <div
                key={segment.id || `${segment.startMs}-${segment.text}`}
                className={`flex ${isSpeakerA ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isSpeakerA
                      ? "bg-white text-gray-900"
                      : "bg-indigo-600 text-white"
                  }`}
                >
                  <div
                    className={`mb-1 text-xs font-semibold ${
                      isSpeakerA ? "text-gray-500" : "text-indigo-100"
                    }`}
                  >
                    {name}
                  </div>

                  <div className="whitespace-pre-wrap text-sm leading-6">
                    {segment.text}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex h-[320px] items-center justify-center text-center text-gray-500">
            <div>
              <div className="text-lg font-medium">No messages yet</div>
              <p className="mt-1 text-sm">
                Start the debate, then both participants can send messages.
              </p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={submitMessage} className="border-t bg-white p-4">
        {debate?.status !== "live" ? (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            Messages can only be sent while the debate is live.
          </div>
        ) : !isParticipant ? (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            Only the two debate participants can send messages.
          </div>
        ) : (
          <div className="flex gap-3">
            <textarea
              className="min-h-[56px] flex-1 rounded-xl border p-3"
              placeholder="Write your argument..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={busy}
            />

            <button
              type="submit"
              disabled={busy || !message.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        )}
      </form>
    </div>
  );
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
  const [showTranscript, setShowTranscript] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timerReady, setTimerReady] = useState(false);

  const autoFinishStartedRef = useRef(false);

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
  const debateMode = debate?.debateMode || "video_voice";
  const isMessageDebate = debateMode === "message";
  const isVideoVoiceDebate = debateMode !== "message";

  const participants = debate?.participants || [];
  const hasTwoParticipants = participants.length >= 2;

  const roundCount = workspace?.meta?.roundCount ?? debate?.rounds?.length ?? 0;
  const closedRoundCount = workspace?.meta?.closedRoundCount ?? 0;
  const hasLiveSession = workspace?.meta?.hasLiveSession ?? !!debate?.live;

  const isOwner = workspace?.meta?.isOwner || debate?.createdByUid === user?.uid;
  const isParticipant =
    workspace?.meta?.isParticipant ||
    participants.some((participant) => participant.userUid === user?.uid);

  const isWaitingForOpponent =
    debate?.status === "scheduled" && !hasTwoParticipants;

  const canStartDebate = debate?.status === "scheduled" && hasTwoParticipants;

  const firstOpenRoundId = useMemo(() => {
    const rounds = debate?.rounds || [];
    const openRound = rounds.find((r) => r.status !== "closed");

    return openRound?.id || "";
  }, [debate]);

  const currentRound = useMemo(() => {
    const rounds = debate?.rounds || [];
    return rounds.find((round) => round.status !== "closed") || null;
  }, [debate]);

  const currentRoundLabel = currentRound
    ? `Round ${currentRound.roundNumber}`
    : debate?.status === "ended"
      ? "Debate ended"
      : "Not started";

  const speakerA = participants.find(
    (participant) => participant.seat === "speakerA"
  );

  const speakerB = participants.find(
    (participant) => participant.seat === "speakerB"
  );

  const speakerAName = speakerA?.displayName || "Debater A";
  const speakerBName = speakerB?.displayName || "Debater B";

  const liveRoomUrl = useMemo(() => {
    const live = debate?.live;

    if (!live) {
      return "";
    }

    if (live.roomUrl) {
      return live.roomUrl;
    }

    if (live.joinUrl) {
      try {
        const url = new URL(live.joinUrl);
        return `${url.origin}${url.pathname}`;
      } catch {
        return live.joinUrl.split("?")[0];
      }
    }

    return "";
  }, [debate]);

  const liveToken = useMemo(() => {
    const live = debate?.live;

    if (!live) {
      return "";
    }

    if (live.token) {
      return live.token;
    }

    if (live.joinUrl) {
      try {
        const url = new URL(live.joinUrl);
        return url.searchParams.get("t") || "";
      } catch {
        return "";
      }
    }

    return "";
  }, [debate]);

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined" || !debateId) {
      return "";
    }

    return `${window.location.origin}/debates/${debateId}/join`;
  }, [debateId]);

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

  const shouldShowResultGraphic =
    debate?.status === "ended" ||
    (debate?.status === "live" && timerReady && remainingSeconds === 0);

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
        title: "Debate ended in a draw",
        body:
          finalScore.explanation?.winnerReason ||
          "The debate was marked as a draw based on the captured transcript.",
      };
    }

    const winnerName =
      winner.speakerId === "speakerA"
        ? speakerAName
        : winner.speakerId === "speakerB"
          ? speakerBName
          : winner.speakerId;

    return {
      title: `${winnerName} won the debate`,
      body:
        finalScore.explanation?.winnerReason ||
        `${winnerName} won with a score of ${Number(winner.score).toFixed(
          1
        )}. The winner is based on the captured transcript.`,
    };
  }, [debate?.finalScore, speakerAName, speakerBName]);

  useEffect(() => {
    if (!roundIdInput && firstOpenRoundId) {
      setRoundIdInput(firstOpenRoundId);
    }
  }, [firstOpenRoundId, roundIdInput]);

  useEffect(() => {
    if (debate?.status !== "live" || !debate?.startedAt) {
      setTimerReady(false);
      return;
    }

    const totalSeconds = getDebateDurationSeconds(debate?.format, roundCount);

    function updateTimer() {
      const startedAtMs = new Date(debate.startedAt).getTime();

      if (!Number.isFinite(startedAtMs)) {
        setElapsedSeconds(0);
        setRemainingSeconds(totalSeconds);
        setTimerReady(true);
        return;
      }

      const diffSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
      const elapsed = Math.max(0, diffSeconds);
      const remaining = Math.max(0, totalSeconds - elapsed);

      setElapsedSeconds(elapsed);
      setRemainingSeconds(remaining);
      setTimerReady(true);
    }

    updateTimer();

    const id = setInterval(updateTimer, 1000);

    return () => clearInterval(id);
  }, [debate?.status, debate?.startedAt, debate?.format, roundCount]);

  useEffect(() => {
    if (debate?.status !== "live") {
      autoFinishStartedRef.current = false;
    }
  }, [debate?.status]);

  async function loadWorkspace({ silent = false } = {}) {
    if (!debateId) {
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
        setError("");
        setNotice("");
      }

      const res = await fetch(`/api/debates/${debateId}/workspace`, {
        headers: await getAuthHeaders(),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.error || "Failed to load workspace");
      }

      setWorkspace(body);

      if (!silent) {
        setScorecard(null);
      }
    } catch (e) {
      setError(e.message || "Failed to load workspace");
    } finally {
      if (!silent) {
        setLoading(false);
      }
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

    if (status !== "live" && status !== "scheduled" && status !== "ended") {
      return;
    }

    const id = setInterval(() => {
      loadWorkspace({ silent: true });
    }, 5000);

    return () => clearInterval(id);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debate?.status, debateId]);

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

  async function saveDailyTranscriptSegment(segment) {
    if (!isOwner || !debateId) {
      return;
    }

    const text = String(segment?.text || "").trim();

    if (!text) {
      return;
    }

    try {
      const res = await fetch(`/api/debates/${debateId}/transcript/segments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          source: "daily_transcript",
          segments: [
            {
              speakerUserId: segment.speakerUserId || null,
              startMs: Number(segment.startMs || Date.now()),
              endMs: Number(segment.endMs || Date.now() + 1000),
              text,
              confidence: Number(segment.confidence || 0.9),
            },
          ],
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.error || "Failed to save transcript segment");
      }
    } catch (e) {
      setError(e.message || "Could not save transcript.");
    }
  }

  async function sendMessageDebateMessage(text) {
    await callApi(`/api/debates/${debateId}/transcript/segments`, "POST", {
      source: "message",
      segments: [
        {
          startMs: Date.now(),
          endMs: Date.now() + 1000,
          text,
          confidence: 1,
        },
      ],
    });

    await loadWorkspace({ silent: true });
  }

  async function onTimerFinished() {
    if (!isOwner || autoFinishStartedRef.current || debate?.status !== "live") {
      return;
    }

    autoFinishStartedRef.current = true;

    try {
      await callApi(`/api/debates/${debateId}/end`, "POST");

      await callApi(`/api/debates/${debateId}/score/final`, "POST", {
        confidenceFactor: 1,
      });

      setNotice("Debate ended and transcript-based final score computed.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message || "Could not finish debate.");
    }
  }

  useEffect(() => {
    if (debate?.status !== "live") {
      return;
    }

    if (!timerReady) {
      return;
    }

    if (remainingSeconds > 0) {
      return;
    }

    onTimerFinished();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, timerReady, debate?.status]);

  async function copyInviteLink() {
    try {
      if (!inviteLink) {
        throw new Error("Invite link is not ready yet.");
      }

      await navigator.clipboard.writeText(inviteLink);
      setNotice("Invite link copied.");
    } catch (e) {
      setError(e.message || "Could not copy invite link.");
    }
  }

  async function onStart() {
    try {
      if (!isOwner) {
        throw new Error("Only the debate owner can start the debate.");
      }

      if (!hasTwoParticipants) {
        throw new Error("You need two participants before starting the debate.");
      }

      autoFinishStartedRef.current = false;

      await callApi(`/api/debates/${debateId}/start`, "POST");

      setNotice("Debate started.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onEnd() {
    try {
      if (!isOwner) {
        throw new Error("Only the debate owner can end the debate.");
      }

      await callApi(`/api/debates/${debateId}/end`, "POST");

      await callApi(`/api/debates/${debateId}/score/final`, "POST", {
        confidenceFactor: 1,
      });

      setNotice("Debate ended and transcript-based final score computed.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onCreateLiveSession() {
    try {
      if (!isOwner) {
        throw new Error("Only the debate owner can create the live session.");
      }

      await callApi(`/api/debates/${debateId}/live/session`, "POST");

      setNotice("Live session created.");
      await loadWorkspace();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onCloseRound() {
    try {
      if (!isOwner) {
        throw new Error("Only the debate owner can close rounds.");
      }

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
      if (!isOwner) {
        throw new Error("Only the debate owner can compute the final score.");
      }

      await callApi(`/api/debates/${debateId}/score/final`, "POST", {
        confidenceFactor: 1,
      });

      setNotice("Transcript-based final score computed.");
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
        source: "manual",
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
              Mode: {getModeLabel(debateMode)} · Rounds: {roundCount} · Closed:{" "}
              {closedRoundCount} · Live session: {hasLiveSession ? "yes" : "no"} ·
              Participants: {participants.length}/2 · Role:{" "}
              {isOwner ? "Host" : isParticipant ? "Participant" : "Viewer"} · Duration:{" "}
              {estimatedDurationLabel} · Transcript segments:{" "}
              {(workspace?.transcriptSegments || []).length}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {isOwner ? (
                <>
                  <button
                    disabled={busy}
                    onClick={copyInviteLink}
                    className="rounded border px-3 py-2 disabled:opacity-50"
                  >
                    Copy invite link
                  </button>

                  {isVideoVoiceDebate ? (
                    <button
                      disabled={busy}
                      onClick={onCreateLiveSession}
                      className="rounded border px-3 py-2 disabled:opacity-50"
                    >
                      Create live session
                    </button>
                  ) : null}

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
                </>
              ) : (
                <div className="rounded border px-3 py-2 text-sm text-gray-600">
                  Waiting for host controls
                </div>
              )}
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
              <h2 className="text-xl font-semibold text-green-800">Opponent joined</h2>
              <p className="mt-1 text-green-700">
                Both participants are now in the debate. The host can start the debate.
              </p>
            </div>
          ) : null}

          {!isOwner && isVideoVoiceDebate && !liveRoomUrl ? (
            <div className="rounded-xl border p-5 text-center">
              <h2 className="text-xl font-semibold">Waiting for host to start video</h2>
              <p className="mt-2 text-gray-600">
                You have joined the debate. The video room will appear here once the host creates
                the live session.
              </p>
            </div>
          ) : null}

          {isMessageDebate ? (
            <MessageDebatePanel
              debate={debate}
              transcriptSegments={workspace?.transcriptSegments || []}
              speakerAName={speakerAName}
              speakerBName={speakerBName}
              timerText={formatTimer(remainingSeconds)}
              busy={busy}
              isParticipant={isParticipant}
              onSendMessage={sendMessageDebateMessage}
            />
          ) : null}

          {isVideoVoiceDebate && liveRoomUrl ? (
            <CustomDailyCall
              roomUrl={liveRoomUrl}
              token={liveToken}
              userName={user?.displayName || user?.email || "Debater"}
              debateTitle={debate?.title || "Untitled debate"}
              debateStatus={debate?.status}
              timerText={formatTimer(remainingSeconds)}
              currentRoundLabel={currentRoundLabel}
              speakerAName={speakerAName}
              speakerBName={speakerBName}
              showResultGraphic={shouldShowResultGraphic}
              finalScore={debate?.finalScore}
              isOwner={isOwner}
              onTranscriptSegment={saveDailyTranscriptSegment}
            />
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
                  The debate has ended. The host should click Compute final score to generate the
                  transcript-based result.
                </p>
              )}

              <button
                onClick={() => setShowTranscript((current) => !current)}
                className="rounded border px-3 py-2"
              >
                {showTranscript ? "Hide transcript" : "Reveal transcript"}
              </button>

              {showTranscript ? (
                <div className="mt-4 rounded-lg bg-gray-50 p-4">
                  <h3 className="font-semibold">Debate transcript</h3>

                  {(workspace?.transcriptSegments || []).length ? (
                    <div className="mt-3 space-y-3">
                      {(workspace?.transcriptSegments || []).map((segment) => {
                        const name =
                          segment.speakerUserId === "speakerA"
                            ? speakerAName
                            : segment.speakerUserId === "speakerB"
                              ? speakerBName
                              : "Unknown speaker";

                        return (
                          <div key={segment.id || `${segment.startMs}-${segment.text}`}>
                            <div className="text-sm font-medium text-gray-800">
                              {name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {segment.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600">
                      No transcript was captured for this debate. This usually means no messages
                      were sent or Daily transcription did not start.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {isOwner ? (
            <>
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
                <h2 className="text-xl font-medium">Manual Transcript</h2>

                <input
                  className="w-full rounded border p-2"
                  value={speakerUserId}
                  onChange={(e) => setSpeakerUserId(e.target.value)}
                  placeholder="speakerA or speakerB"
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
            </>
          ) : null}

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
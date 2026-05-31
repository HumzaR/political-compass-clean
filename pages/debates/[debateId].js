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

function getDebateDurationSeconds(format, durationMinutes) {
  if (format === "custom") {
    return Math.max(1, Number(durationMinutes || 10)) * 60;
  }

  if (format === "long") {
    return 45 * 60;
  }

  if (format === "medium") {
    return 20 * 60;
  }

  return 5 * 60;
}

function getModeLabel(debateMode) {
  if (debateMode === "message") {
    return "Message";
  }

  return "Video/voice";
}

function getLengthLabel(format, durationMinutes) {
  if (format === "custom") {
    return `${durationMinutes || 10} min estimated`;
  }

  if (format === "long") {
    return "45 min estimated";
  }

  if (format === "medium") {
    return "20 min estimated";
  }

  return "5 min estimated";
}

function getRoundDisplay(round) {
  if (!round) {
    return "";
  }

  if (round.subtopic) {
    return `Round ${round.roundNumber}: ${round.subtopic}`;
  }

  return `Round ${round.roundNumber}`;
}

function MessageDebatePanel({
  debate,
  transcriptSegments,
  speakerAName,
  speakerBName,
  timerText,
  currentRoundLabel,
  busy,
  isParticipant,
  isOwner,
  endingDebate,
  onEndDebate,
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
                {currentRoundLabel}
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

  {isOwner && debate?.status === "live" ? (
    <button
      type="button"
      onClick={onEndDebate}
      disabled={endingDebate}
      className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
    >
      {endingDebate ? "Ending..." : "End debate"}
    </button>
  ) : null}
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

const MESSAGE_DIMENSION_LABELS = {
  argumentQuality: "Argument quality",
  factualAccuracy: "Evidence usage",
  rebuttalEffectiveness: "Rebuttal effectiveness",
  rhetoricDelivery: "Delivery and rhetoric",
  topicConsistency: "Topic consistency",
};

function getMessageScoreForSpeaker(finalScore, speakerId) {
  const item = finalScore?.leaderboard?.find(
    (entry) => entry.speakerId === speakerId
  );

  return Number(item?.score || 0);
}

function getMessageSpeakerBreakdown(finalScore, speakerId) {
  return finalScore?.speakerBreakdown?.[speakerId] || null;
}

function getMessageSpeakerName(speakerId, speakerAName, speakerBName) {
  if (speakerId === "speakerA") return speakerAName;
  if (speakerId === "speakerB") return speakerBName;
  return speakerId || "Unknown speaker";
}

function MessageScoreCard({ label, name, score, animatedScore }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs uppercase tracking-[0.25em] text-white/40">
        {label}
      </div>

      <div className="mt-2 text-xl font-bold">{name}</div>

      <div className="mt-6 font-mono text-6xl font-black">
        {animatedScore.toFixed(1)}
      </div>

      <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white transition-all duration-200"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>

      <div className="mt-2 text-sm text-white/50">Final score out of 100</div>
    </div>
  );
}

function MessageDimensionBars({ dimensions }) {
  const safeDimensions = dimensions || {};

  return (
    <div className="mt-4 space-y-3">
      {Object.entries(MESSAGE_DIMENSION_LABELS).map(([key, label]) => {
        const value = Math.max(
          0,
          Math.min(100, Number(safeDimensions[key] || 0))
        );

        return (
          <div key={key}>
            <div className="flex justify-between text-xs text-white/60">
              <span>{label}</span>
              <span>{value.toFixed(1)}</span>
            </div>

            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white/80"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MessageTextList({ title, items, emptyText }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  return (
    <div className="rounded-xl bg-white/5 p-4">
      <h5 className="text-sm font-bold text-white">{title}</h5>

      {safeItems.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-white/70">
          {safeItems.slice(0, 4).map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-white/45">{emptyText}</p>
      )}
    </div>
  );
}

function MessageEvidenceQuotes({ quotes }) {
  const safeQuotes = Array.isArray(quotes) ? quotes.filter(Boolean) : [];

  return (
    <div className="rounded-xl bg-white/5 p-4">
      <h5 className="text-sm font-bold text-white">Evidence from messages</h5>

      {safeQuotes.length ? (
        <div className="mt-3 space-y-2">
          {safeQuotes.slice(0, 3).map((quote, index) => (
            <blockquote
              key={`message-quote-${index}`}
              className="border-l-2 border-indigo-300 pl-3 text-sm leading-6 text-white/70"
            >
              “{quote}”
            </blockquote>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-white/45">
          No specific message quotes were returned by the judge.
        </p>
      )}
    </div>
  );
}

function MessageSpeakerJudgeCard({ label, name, breakdown }) {
  const score = Number(breakdown?.score || 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-white/40">
            {label}
          </div>

          <h4 className="mt-1 text-2xl font-black">{name}</h4>

          <p className="mt-2 text-sm leading-6 text-white/60">
            {breakdown?.summary || "No judging summary available."}
          </p>
        </div>

        <div className="rounded-xl bg-white px-4 py-2 text-right text-neutral-950">
          <div className="text-xs font-semibold uppercase">Score</div>
          <div className="text-2xl font-black">{score.toFixed(1)}</div>
        </div>
      </div>

      <MessageDimensionBars dimensions={breakdown?.dimensions} />

      <div className="mt-5 grid gap-3">
        <MessageTextList
          title="Strengths"
          items={breakdown?.strengths}
          emptyText="No clear strengths detected."
        />

        <MessageTextList
          title="Weaknesses"
          items={breakdown?.weaknesses}
          emptyText="No clear weaknesses detected."
        />

        <MessageEvidenceQuotes quotes={breakdown?.evidenceQuotes} />
      </div>
    </div>
  );
}

function MessageResultGraphic({ finalScore, speakerAName, speakerBName }) {
  const [animatedA, setAnimatedA] = useState(0);
  const [animatedB, setAnimatedB] = useState(0);
  const [stage, setStage] = useState("calculating");

  const speakerAScore = getMessageScoreForSpeaker(finalScore, "speakerA");
  const speakerBScore = getMessageScoreForSpeaker(finalScore, "speakerB");

  const speakerABreakdown = getMessageSpeakerBreakdown(finalScore, "speakerA");
  const speakerBBreakdown = getMessageSpeakerBreakdown(finalScore, "speakerB");

  const finalScoreKey = useMemo(() => {
    if (!finalScore) return "no-final-score";

    return [
      finalScore.computedAt || "",
      finalScore.winnerSpeakerId || "",
      finalScore.tie ? "tie" : "not-tie",
      speakerAScore,
      speakerBScore,
    ].join("|");
  }, [
    finalScore?.computedAt,
    finalScore?.winnerSpeakerId,
    finalScore?.tie,
    speakerAScore,
    speakerBScore,
  ]);

  const winnerId = finalScore?.tie
    ? null
    : finalScore?.winnerSpeakerId ||
      finalScore?.leaderboard?.[0]?.speakerId ||
      null;

  const winnerName = winnerId
    ? getMessageSpeakerName(winnerId, speakerAName, speakerBName)
    : null;

  const explanation = finalScore?.explanation || {
    winnerReason: "The AI judge is reading the message transcript.",
    loserReason: "The final breakdown will appear once scoring is complete.",
  };

  useEffect(() => {
    setAnimatedA(0);
    setAnimatedB(0);

    if (!finalScore) {
      setStage("calculating");
      return;
    }

    setStage("counting");

    const durationMs = 2600;
    const startMs = Date.now();

    const intervalId = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startMs) / durationMs);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedA(speakerAScore * easedProgress);
      setAnimatedB(speakerBScore * easedProgress);

      if (progress >= 1) clearInterval(intervalId);
    }, 40);

    const winnerTimerId = setTimeout(() => {
      setStage("winner");
    }, durationMs + 300);

    const summaryTimerId = setTimeout(() => {
      setStage("summary");
    }, durationMs + 2100);

    return () => {
      clearInterval(intervalId);
      clearTimeout(winnerTimerId);
      clearTimeout(summaryTimerId);
    };
  }, [finalScoreKey]);

  if (!finalScore) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-neutral-950 p-8 text-white">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-white" />

          <h3 className="mt-6 text-3xl font-black">Calculating result...</h3>

          <p className="mt-3 max-w-xl text-white/60">
            The message debate has ended. The AI judge is reading the written
            transcript.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-black p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.35em] text-indigo-300">
            AI Judge Result
          </div>

          <h3 className="mt-2 text-4xl font-black">
            {stage === "counting"
              ? "Scores are being revealed..."
              : finalScore.tie
                ? "It is a draw"
                : `${winnerName} wins`}
          </h3>

          <p className="mt-2 text-white/60">
            Scores are based on the written message transcript.
          </p>

          <div className="mt-3 text-xs text-white/40">
            Source: {finalScore.source || "message_transcript"} · Transcript words:{" "}
            {finalScore.transcriptWordCount || 0}
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <MessageScoreCard
            label="Speaker A"
            name={speakerAName}
            score={speakerAScore}
            animatedScore={animatedA}
          />

          <MessageScoreCard
            label="Speaker B"
            name={speakerBName}
            score={speakerBScore}
            animatedScore={animatedB}
          />
        </div>

        {stage === "winner" || stage === "summary" ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-6 text-center">
            <div className="text-sm uppercase tracking-[0.25em] text-white/50">
              Result
            </div>

            <div className="mt-2 text-5xl font-black">
              {finalScore.tie ? "Draw" : winnerName}
            </div>
          </div>
        ) : null}

        {stage === "summary" ? (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-5">
                <h4 className="text-lg font-bold text-green-200">
                  {finalScore.tie
                    ? "Why it was a draw"
                    : "Why this result was chosen"}
                </h4>

                <p className="mt-2 text-sm leading-6 text-white/75">
                  {explanation.winnerReason}
                </p>
              </div>

              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
                <h4 className="text-lg font-bold text-red-200">
                  What needs improving
                </h4>

                <p className="mt-2 text-sm leading-6 text-white/75">
                  {explanation.loserReason}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-2xl font-black">Judge breakdown</h4>

              <p className="mt-1 text-sm text-white/50">
                Each score is based only on what appears in the message
                transcript.
              </p>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <MessageSpeakerJudgeCard
                  label="Speaker A"
                  name={speakerAName}
                  breakdown={speakerABreakdown}
                />

                <MessageSpeakerJudgeCard
                  label="Speaker B"
                  name={speakerBName}
                  breakdown={speakerBBreakdown}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
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

  const activeRound = useMemo(() => {
    const debateRounds = debate?.rounds || [];

    if (!debateRounds.length || debate?.status === "ended") {
      return null;
    }

    if (debate?.status === "live" && timerReady) {
      const totalSeconds = getDebateDurationSeconds(
        debate?.format,
        debate?.durationMinutes
      );

      const secondsPerRound =
        totalSeconds / Math.max(1, Number(debateRounds.length || 1));

      const activeIndex = Math.min(
        debateRounds.length - 1,
        Math.max(0, Math.floor(elapsedSeconds / secondsPerRound))
      );

      return debateRounds[activeIndex] || debateRounds[0] || null;
    }

    return (
      debateRounds.find((round) => round.status !== "closed") ||
      debateRounds[0] ||
      null
    );
  }, [
    debate?.rounds,
    debate?.status,
    debate?.format,
    debate?.durationMinutes,
    elapsedSeconds,
    timerReady,
  ]);

  const currentRoundLabel = activeRound
    ? getRoundDisplay(activeRound)
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
    return getLengthLabel(debate?.format || "short", debate?.durationMinutes);
  }, [debate?.format, debate?.durationMinutes]);

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
    if (debate?.status !== "live" || !debate?.startedAt) {
      setTimerReady(false);
      return;
    }

    const totalSeconds = getDebateDurationSeconds(
      debate?.format,
      debate?.durationMinutes
    );

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
  }, [
    debate?.status,
    debate?.startedAt,
    debate?.format,
    debate?.durationMinutes,
  ]);

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

      if (isVideoVoiceDebate && !liveRoomUrl) {
        await callApi(`/api/debates/${debateId}/live/session`, "POST");
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
      <div className="flex items-start justify-between gap-4">
  <div>
    <h1 className="text-3xl font-semibold">Debate Workspace</h1>
    <p className="text-gray-600">Debate ID: {debateId}</p>
  </div>

  <button
    disabled={busy}
    onClick={copyInviteLink}
    className="rounded border px-4 py-2 disabled:opacity-50"
  >
    Copy invite link
  </button>
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
          {isWaitingForOpponent ? (
            <div className="rounded-xl border p-8 text-center space-y-4">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />

              <div>
                <h2 className="text-2xl font-semibold">Waiting for opponent...</h2>

                <p className="mt-2 text-gray-600">
                  Share the invite link and keep this page open. The debate will
                  be ready once another user joins.
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
                Both participants are now in the debate. The host can start the
                debate.
              </p>

              {isOwner ? (
                <button
                  disabled={busy || !canStartDebate}
                  onClick={onStart}
                  className="mt-4 rounded border bg-white px-4 py-2 font-medium text-green-800 disabled:opacity-50"
                >
                  Start debate
                </button>
              ) : (
                <p className="mt-4 text-sm text-green-700">
                  Waiting for the host to start the debate.
                </p>
              )}
            </div>
          ) : null}

          {!isOwner && isVideoVoiceDebate && !liveRoomUrl ? (
            <div className="rounded-xl border p-5 text-center">
              <h2 className="text-xl font-semibold">
                Waiting for host to start video
              </h2>

              <p className="mt-2 text-gray-600">
                You have joined the debate. The video room will appear here once
                the host starts the debate.
              </p>
            </div>
          ) : null}

          {isMessageDebate ? (
            <div className="space-y-5">
              {shouldShowResultGraphic ? (
                <MessageResultGraphic
                  finalScore={debate?.finalScore}
                  speakerAName={speakerAName}
                  speakerBName={speakerBName}
                />
              ) : null}

              <MessageDebatePanel
  debate={debate}
  transcriptSegments={workspace?.transcriptSegments || []}
  speakerAName={speakerAName}
  speakerBName={speakerBName}
  timerText={formatTimer(remainingSeconds)}
  currentRoundLabel={currentRoundLabel}
  busy={busy}
  isParticipant={isParticipant}
  isOwner={isOwner}
  endingDebate={busy}
  onEndDebate={onEnd}
  onSendMessage={sendMessageDebateMessage}
/>
            </div>
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
  endingDebate={busy}
  onEndDebate={onEnd}
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
                  The debate has ended. The host should click Compute final score
                  to generate the transcript-based result.
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
                      No transcript was captured for this debate. This usually
                      means no messages were sent or Daily transcription did not
                      start.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
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
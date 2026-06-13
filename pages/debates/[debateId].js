import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from "next/dynamic";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Gavel,
  Loader2,
  MessageSquare,
  Mic,
  Play,
  Radio,
  Send,
  Trophy,
  Users,
} from "lucide-react";

const CustomDailyCall = dynamic(
  () => import("@/components/debates/CustomDailyCall"),
  { ssr: false }
);

const MESSAGE_DIMENSION_LABELS = {
  argumentQuality: "Argument quality",
  factualAccuracy: "Evidence usage",
  rebuttalEffectiveness: "Rebuttal effectiveness",
  rhetoricDelivery: "Delivery and rhetoric",
  topicConsistency: "Topic consistency",
};

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
    return "Text";
  }

  return "Voice";
}

function getLengthLabel(format, durationMinutes) {
  if (format === "custom") {
    return `${durationMinutes || 10} min`;
  }

  if (format === "long") {
    return "45 min";
  }

  if (format === "medium") {
    return "20 min";
  }

  return "5 min";
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

function Label({ children }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </span>
  );
}

function StatusChip({ status }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
        <Radio className="h-3 w-3" />
        Live
      </span>
    );
  }

  if (status === "ended") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        Ended
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-lime-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-lime-900">
      Waiting
    </span>
  );
}

function Notice({ type = "info", children }) {
  const className =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-hairline bg-surface-2 text-muted-foreground";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${className}`}>
      {children}
    </div>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-2 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
          {label}
        </span>
      </div>

      <div className="mt-1 font-display text-lg font-bold text-foreground">
        {value}
      </div>
    </div>
  );
}

function ParticipantCard({ label, participant, fallbackName }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-2 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
          {(participant?.displayName || fallbackName || "?").slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {participant?.displayName || fallbackName}
          </div>

          <div className="text-xs font-medium text-muted-foreground">
            {participant ? "Joined" : "Waiting"}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 font-display text-lg font-bold">{name}</div>

      <div className="mt-5 font-mono text-4xl font-semibold">
        {animatedScore.toFixed(1)}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-200"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>

      <div className="mt-2 text-xs font-medium text-muted-foreground">
        Final score out of 100
      </div>
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
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>{label}</span>
              <span>{value.toFixed(1)}</span>
            </div>

            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
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
    <div className="rounded-xl bg-surface-2 p-3">
      <h5 className="text-sm font-semibold text-foreground">{title}</h5>

      {safeItems.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
          {safeItems.slice(0, 4).map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

function MessageEvidenceQuotes({ quotes }) {
  const safeQuotes = Array.isArray(quotes) ? quotes.filter(Boolean) : [];

  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <h5 className="text-sm font-semibold text-foreground">
        Evidence from messages
      </h5>

      {safeQuotes.length ? (
        <div className="mt-3 space-y-2">
          {safeQuotes.slice(0, 3).map((quote, index) => (
            <blockquote
              key={`message-quote-${index}`}
              className="border-l-2 border-primary/50 pl-3 text-sm leading-6 text-muted-foreground"
            >
              “{quote}”
            </blockquote>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No specific message quotes were returned by the judge.
        </p>
      )}
    </div>
  );
}

function MessageSpeakerJudgeCard({ label, name, breakdown }) {
  const score = Number(breakdown?.score || 0);

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </div>

          <h4 className="mt-1 font-display text-xl font-bold">{name}</h4>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {breakdown?.summary || "No judging summary available."}
          </p>
        </div>

        <div className="rounded-xl bg-primary px-3 py-2 text-right text-primary-foreground">
          <div className="text-[10px] font-semibold uppercase">Score</div>
          <div className="font-display text-xl font-bold">{score.toFixed(1)}</div>
        </div>
      </div>

      <MessageDimensionBars dimensions={breakdown?.dimensions} />

      <div className="mt-4 grid gap-3">
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
      <div className="surface-card flex min-h-[360px] items-center justify-center rounded-2xl p-8 text-center">
        <div>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />

          <h3 className="mt-5 font-display text-3xl font-bold">
            Calculating result...
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-muted-foreground">
            The debate has ended. The AI judge is reading the transcript.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-2xl p-5 lg:p-7">
      <div className="text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
          AI Judge Result
        </div>

        <h3 className="mt-1 font-display text-4xl font-bold leading-[1] tracking-tight lg:text-5xl">
          {stage === "counting"
            ? "Revealing scores..."
            : finalScore.tie
              ? "It is a draw"
              : `${winnerName} wins`}
        </h3>

        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Scores are based on the captured transcript.
        </p>

        <div className="mt-2 text-xs font-medium text-muted-foreground">
          Transcript words: {finalScore.transcriptWordCount || 0}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
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
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Result
          </div>

          <div className="mt-1 font-display text-4xl font-bold">
            {finalScore.tie ? "Draw" : winnerName}
          </div>
        </div>
      ) : null}

      {stage === "summary" ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <h4 className="text-sm font-semibold text-emerald-800">
                {finalScore.tie ? "Why it was a draw" : "Why this result was chosen"}
              </h4>

              <p className="mt-2 text-sm leading-6 text-emerald-900/75">
                {explanation.winnerReason}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h4 className="text-sm font-semibold text-red-800">
                What needs improving
              </h4>

              <p className="mt-2 text-sm leading-6 text-red-900/75">
                {explanation.loserReason}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-display text-xl font-bold">Judge breakdown</h4>

            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Each score is based only on what appears in the transcript.
            </p>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
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
  );
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
    <div className="surface-card overflow-hidden rounded-2xl">
      <div className="border-b border-hairline p-4 lg:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              <MessageSquare className="h-3.5 w-3.5" />
              Text Debate
            </div>

            <h2 className="mt-1 font-display text-2xl font-bold">
              {debate?.title || "Untitled debate"}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {speakerAName} vs {speakerBName}
              </span>

              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {currentRoundLabel}
              </span>

              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                Messages: {sortedSegments.length}
              </span>
            </div>
          </div>

          <div className="text-right">
            <Label>Countdown</Label>

            <div className="mt-1 rounded-xl bg-slate-950 px-4 py-2 font-mono text-2xl font-semibold text-white">
              {debate?.status === "live" ? timerText : "00:00"}
            </div>

            {isOwner && debate?.status === "live" ? (
              <button
                type="button"
                onClick={onEndDebate}
                disabled={endingDebate}
                className="focus-ring mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {endingDebate ? "Ending..." : "End debate"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-h-[520px] min-h-[360px] space-y-3 overflow-y-auto bg-surface-2 p-4">
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
                      ? "border border-hairline bg-surface text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <div
                    className={`mb-1 text-xs font-semibold ${
                      isSpeakerA
                        ? "text-muted-foreground"
                        : "text-primary-foreground/75"
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
          <div className="flex h-[320px] items-center justify-center text-center">
            <div>
              <div className="font-display text-lg font-bold">No messages yet</div>

              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Start the debate, then both participants can send messages.
              </p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={submitMessage} className="border-t border-hairline p-4">
        {debate?.status !== "live" ? (
          <div className="rounded-xl bg-muted p-3 text-sm font-medium text-muted-foreground">
            Messages can only be sent while the debate is live.
          </div>
        ) : !isParticipant ? (
          <div className="rounded-xl bg-muted p-3 text-sm font-medium text-muted-foreground">
            Only the two debate participants can send messages.
          </div>
        ) : (
          <div className="flex gap-3">
            <textarea
              className="focus-ring min-h-[56px] flex-1 resize-none rounded-xl border border-hairline bg-surface-2 p-3 text-sm"
              placeholder="Write your argument..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={busy}
            />

            <button
              type="submit"
              disabled={busy || !message.trim()}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
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
  const [copied, setCopied] = useState(false);

  const [workspace, setWorkspace] = useState(null);
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
      setCopied(true);
      setNotice("Invite link copied.");

      setTimeout(() => {
        setCopied(false);
      }, 2500);
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

  if (user === undefined) {
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full p-3 lg:p-4">
        <div className="surface-card mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl flex-col justify-center rounded-2xl p-5 lg:p-7">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Gavel className="h-5 w-5" />
          </div>

          <div className="mt-5 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              Debate Workspace
            </div>

            <h1 className="mt-1 font-display text-4xl font-bold leading-[1] tracking-tight lg:text-5xl">
              Sign in first
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm font-medium text-muted-foreground">
              Please sign in to access this debate workspace.
            </p>

            <button
              onClick={() => router.push("/login")}
              className="focus-ring mt-6 inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_18px_40px_-12px_var(--primary)]"
            >
              Go to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-3 lg:p-4">
      <div className="grid min-h-[calc(100vh-2rem)] w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-4">
        <main className="flex min-h-0 flex-col gap-3">
          <section className="surface-card rounded-2xl p-5 lg:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link
                  href="/debates"
                  className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Arena
                </Link>

                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                    Debate Workspace
                  </div>
                  <StatusChip status={debate?.status} />
                </div>

                <h1 className="mt-1 font-display text-4xl font-bold leading-[1] tracking-tight lg:text-5xl">
                  {debate?.title || "Loading debate..."}
                </h1>

                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  {currentRoundLabel} · {getModeLabel(debateMode)} ·{" "}
                  {estimatedDurationLabel}
                </p>
              </div>

              <button
                disabled={busy}
                onClick={copyInviteLink}
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-slate-200 disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy invite"}
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={<Users className="h-3.5 w-3.5" />}
                label="Participants"
                value={`${participants.length}/2`}
              />

              <MetricCard
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Timer"
                value={debate?.status === "live" ? formatTimer(remainingSeconds) : "00:00"}
              />

              <MetricCard
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                label="Transcript"
                value={`${(workspace?.transcriptSegments || []).length} segments`}
              />

              <MetricCard
                icon={<Trophy className="h-3.5 w-3.5" />}
                label="Rounds"
                value={`${roundCount || 0} total`}
              />
            </div>
          </section>

          {error ? <Notice type="error">{error}</Notice> : null}
          {notice ? <Notice type="success">{notice}</Notice> : null}

          {loading ? (
            <div className="surface-card flex min-h-[360px] items-center justify-center rounded-2xl p-8 text-center">
              <div>
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  Loading workspace...
                </p>
              </div>
            </div>
          ) : (
            <>
              {isWaitingForOpponent ? (
                <div className="surface-card rounded-2xl p-8 text-center">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />

                  <h2 className="mt-5 font-display text-3xl font-bold">
                    Waiting for opponent
                  </h2>

                  <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-muted-foreground">
                    Share the invite link and keep this page open. The debate
                    will be ready once another user joins.
                  </p>

                  <div className="mt-5 text-sm font-medium text-muted-foreground">
                    Participants joined: {participants.length}/2
                  </div>
                </div>
              ) : null}

              {debate?.status === "scheduled" && hasTwoParticipants ? (
                <div className="surface-card rounded-2xl p-5 lg:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                        Ready
                      </div>

                      <h2 className="mt-1 font-display text-2xl font-bold">
                        Opponent joined
                      </h2>

                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        Both participants are now in the debate. The host can
                        start the session.
                      </p>
                    </div>

                    {isOwner ? (
                      <button
                        disabled={busy || !canStartDebate}
                        onClick={onStart}
                        className="focus-ring inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_18px_40px_-12px_var(--primary)] disabled:opacity-50"
                      >
                        <Play className="h-4 w-4" />
                        Start debate
                      </button>
                    ) : (
                      <p className="text-sm font-medium text-muted-foreground">
                        Waiting for the host to start.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {!isOwner && isVideoVoiceDebate && !liveRoomUrl ? (
                <div className="surface-card rounded-2xl p-6 text-center">
                  <Mic className="mx-auto h-8 w-8 text-primary" />

                  <h2 className="mt-3 font-display text-2xl font-bold">
                    Waiting for host
                  </h2>

                  <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-muted-foreground">
                    You have joined the debate. The video room will appear once
                    the host starts the debate.
                  </p>
                </div>
              ) : null}

              {isMessageDebate ? (
                <div className="space-y-3">
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
                <div className="surface-card rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-bold">
                        Debate finished
                      </h2>

                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        The transcript and result are available below.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowTranscript((current) => !current)}
                      className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground hover:bg-slate-200"
                    >
                      {showTranscript ? "Hide transcript" : "Reveal transcript"}
                    </button>
                  </div>

                  {resultSummary ? (
                    <div className="mt-4 rounded-xl border border-hairline bg-surface-2 p-4">
                      <h3 className="text-sm font-semibold">
                        {resultSummary.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {resultSummary.body}
                      </p>
                    </div>
                  ) : isOwner ? (
                    <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        No final score was found. You can retry transcript-based
                        scoring.
                      </p>

                      <button
                        disabled={busy}
                        onClick={onComputeFinal}
                        className="focus-ring mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Retry scoring
                      </button>
                    </div>
                  ) : null}

                  {showTranscript ? (
                    <div className="mt-4 rounded-xl bg-surface-2 p-4">
                      <h3 className="text-sm font-semibold">Debate transcript</h3>

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
                              <div
                                key={segment.id || `${segment.startMs}-${segment.text}`}
                                className="rounded-xl border border-hairline bg-surface p-3"
                              >
                                <div className="text-xs font-semibold text-foreground">
                                  {name}
                                </div>

                                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                                  {segment.text}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          No transcript was captured for this debate.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </main>

        <aside className="surface-card flex min-h-0 flex-col overflow-hidden rounded-2xl p-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Session
            </h2>

            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Debate details and participants.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <ParticipantCard
              label="Speaker A"
              participant={speakerA}
              fallbackName="Debater A"
            />

            <ParticipantCard
              label="Speaker B"
              participant={speakerB}
              fallbackName="Debater B"
            />

            <div className="rounded-xl border border-hairline bg-surface-2 p-3">
              <Label>Details</Label>

              <div className="mt-3 space-y-2 text-sm font-medium text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <span>Mode</span>
                  <span className="text-foreground">{getModeLabel(debateMode)}</span>
                </div>

                <div className="flex justify-between gap-3">
                  <span>Duration</span>
                  <span className="text-foreground">{estimatedDurationLabel}</span>
                </div>

                <div className="flex justify-between gap-3">
                  <span>Rounds</span>
                  <span className="text-foreground">{roundCount || 0}</span>
                </div>

                <div className="flex justify-between gap-3">
                  <span>Closed</span>
                  <span className="text-foreground">{closedRoundCount}</span>
                </div>

                <div className="flex justify-between gap-3">
                  <span>Live room</span>
                  <span className="text-foreground">
                    {hasLiveSession ? "Created" : "Not yet"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
              <Label>Debate ID</Label>
              <div className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                {debateId}
              </div>
            </div>
          </div>

          <button
            disabled={busy}
            onClick={copyInviteLink}
            className="focus-ring mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-slate-200 disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy invite"}
          </button>
        </aside>
      </div>
    </div>
  );
}
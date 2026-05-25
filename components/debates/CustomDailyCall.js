import { useEffect, useMemo, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import {
  DailyAudio,
  DailyProvider,
  DailyVideo,
  useDaily,
  useMeetingState,
  useParticipantIds,
  useParticipantProperty,
} from "@daily-co/daily-react";

const DIMENSION_LABELS = {
  argumentQuality: "Argument quality",
  factualAccuracy: "Evidence usage",
  rebuttalEffectiveness: "Rebuttal effectiveness",
  rhetoricDelivery: "Delivery and rhetoric",
  topicConsistency: "Topic consistency",
};

function getScoreForSpeaker(finalScore, speakerId) {
  const item = finalScore?.leaderboard?.find(
    (entry) => entry.speakerId === speakerId
  );

  return Number(item?.score || 0);
}

function getSpeakerName(speakerId, speakerAName, speakerBName) {
  if (speakerId === "speakerA") return speakerAName;
  if (speakerId === "speakerB") return speakerBName;
  return speakerId || "Unknown speaker";
}

function getSpeakerBreakdown(finalScore, speakerId) {
  return finalScore?.speakerBreakdown?.[speakerId] || null;
}

function buildResultExplanation({
  finalScore,
  speakerAName,
  speakerBName,
}) {
  if (finalScore?.explanation) {
    return finalScore.explanation;
  }

  if (!finalScore) {
    return {
      winnerReason: "The scoring engine is still calculating the result.",
      loserReason:
        "The post-debate breakdown will appear once the final score is ready.",
    };
  }

  if (finalScore.tie) {
    return {
      winnerReason:
        "No winner was awarded because the final scores were too close.",
      loserReason:
        "Both sides need stronger arguments, clearer evidence and better rebuttals.",
    };
  }

  const winnerId =
    finalScore.winnerSpeakerId || finalScore.leaderboard?.[0]?.speakerId;

  const loserId = winnerId === "speakerA" ? "speakerB" : "speakerA";

  const winnerName = getSpeakerName(winnerId, speakerAName, speakerBName);
  const loserName = getSpeakerName(loserId, speakerAName, speakerBName);

  return {
    winnerReason: `${winnerName} won because they performed better across the overall judging criteria.`,
    loserReason: `${loserName} fell behind on the final combined score.`,
  };
}

function extractTranscriptText(event) {
  return (
    event?.text ||
    event?.transcript ||
    event?.message ||
    event?.rawResponse?.channel?.alternatives?.[0]?.transcript ||
    event?.rawResponse?.alternatives?.[0]?.transcript ||
    ""
  )
    .toString()
    .trim();
}

function extractTranscriptSessionId(event) {
  return (
    event?.participantId ||
    event?.participant?.session_id ||
    event?.participant?.sessionId ||
    event?.session_id ||
    event?.sessionId ||
    event?.user_id ||
    ""
  );
}

function isFinalTranscriptEvent(event) {
  if (typeof event?.is_final === "boolean") return event.is_final;
  if (typeof event?.isFinal === "boolean") return event.isFinal;
  if (typeof event?.rawResponse?.is_final === "boolean") {
    return event.rawResponse.is_final;
  }

  return true;
}

function ParticipantTile({ sessionId, fallbackName, label }) {
  const participantName = useParticipantProperty(sessionId, "user_name");
  const isLocal = useParticipantProperty(sessionId, "local");
  const videoState = useParticipantProperty(sessionId, [
    "tracks",
    "video",
    "state",
  ]);
  const audioState = useParticipantProperty(sessionId, [
    "tracks",
    "audio",
    "state",
  ]);

  const displayName = participantName || fallbackName || "Debater";
  const cameraOn = videoState === "playable";
  const micOn = audioState === "playable";

  return (
    <div className="relative min-h-[340px] overflow-hidden rounded-2xl border border-white/10 bg-neutral-900">
      {cameraOn ? (
        <DailyVideo
          sessionId={sessionId}
          type="video"
          fit="cover"
          automirror
          className="h-full w-full"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div className="flex h-full min-h-[340px] items-center justify-center bg-neutral-800">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-3xl font-bold">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="mt-3 text-sm text-white/60">Camera off</div>
          </div>
        </div>
      )}

      <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
        {label}
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl bg-black/75 px-4 py-3 text-white">
        <div>
          <div className="font-semibold">
            {displayName}
            {isLocal ? " (You)" : ""}
          </div>

          <div className="text-xs text-white/60">
            {micOn ? "Mic on" : "Mic muted"}
          </div>
        </div>

        <div className="rounded-full bg-white/10 px-3 py-1 text-xs">
          {cameraOn ? "Video on" : "Video off"}
        </div>
      </div>
    </div>
  );
}

function EmptyTile({ label }) {
  return (
    <div className="flex min-h-[340px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-neutral-900 text-white/50">
      <div className="text-center">
        <div className="text-sm uppercase tracking-[0.2em]">{label}</div>
        <div className="mt-2 text-lg font-semibold">Waiting to join</div>
      </div>
    </div>
  );
}

function CallControls({ joined }) {
  const callObject = useDaily();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  function toggleMic() {
    if (!callObject) return;

    const next = !callObject.localAudio();
    callObject.setLocalAudio(next);
    setMicOn(next);
  }

  function toggleCamera() {
    if (!callObject) return;

    const next = !callObject.localVideo();
    callObject.setLocalVideo(next);
    setCameraOn(next);
  }

  function leaveCall() {
    if (!callObject) return;
    callObject.leave();
  }

  if (!joined) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3 border-t border-white/10 bg-neutral-950 p-4">
      <button
        onClick={toggleMic}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
      >
        {micOn ? "Mute mic" : "Unmute mic"}
      </button>

      <button
        onClick={toggleCamera}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
      >
        {cameraOn ? "Turn camera off" : "Turn camera on"}
      </button>

      <button
        onClick={leaveCall}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Leave call
      </button>
    </div>
  );
}

function ScoreCard({ label, name, score, animatedScore }) {
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

function DimensionBars({ dimensions }) {
  const safeDimensions = dimensions || {};

  return (
    <div className="mt-4 space-y-3">
      {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
        const value = Math.max(0, Math.min(100, Number(safeDimensions[key] || 0)));

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

function TextList({ title, items, emptyText }) {
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

function EvidenceQuotes({ quotes }) {
  const safeQuotes = Array.isArray(quotes) ? quotes.filter(Boolean) : [];

  return (
    <div className="rounded-xl bg-white/5 p-4">
      <h5 className="text-sm font-bold text-white">Evidence from transcript</h5>

      {safeQuotes.length ? (
        <div className="mt-3 space-y-2">
          {safeQuotes.slice(0, 3).map((quote, index) => (
            <blockquote
              key={`quote-${index}`}
              className="border-l-2 border-indigo-300 pl-3 text-sm leading-6 text-white/70"
            >
              “{quote}”
            </blockquote>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-white/45">
          No specific evidence quotes were returned by the judge.
        </p>
      )}
    </div>
  );
}

function SpeakerJudgeCard({ label, name, breakdown }) {
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

      <DimensionBars dimensions={breakdown?.dimensions} />

      <div className="mt-5 grid gap-3">
        <TextList
          title="Strengths"
          items={breakdown?.strengths}
          emptyText="No clear strengths detected."
        />

        <TextList
          title="Weaknesses"
          items={breakdown?.weaknesses}
          emptyText="No clear weaknesses detected."
        />

        <EvidenceQuotes quotes={breakdown?.evidenceQuotes} />
      </div>
    </div>
  );
}

function ResultGraphic({
  finalScore,
  speakerAName,
  speakerBName,
}) {
  const [animatedA, setAnimatedA] = useState(0);
  const [animatedB, setAnimatedB] = useState(0);
  const [stage, setStage] = useState("calculating");

  const speakerAScore = getScoreForSpeaker(finalScore, "speakerA");
  const speakerBScore = getScoreForSpeaker(finalScore, "speakerB");

  const speakerABreakdown = getSpeakerBreakdown(finalScore, "speakerA");
  const speakerBBreakdown = getSpeakerBreakdown(finalScore, "speakerB");

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
    ? getSpeakerName(winnerId, speakerAName, speakerBName)
    : null;

  const explanation = useMemo(
    () =>
      buildResultExplanation({
        finalScore,
        speakerAName,
        speakerBName,
      }),
    [finalScore, speakerAName, speakerBName]
  );

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
      <div className="flex min-h-[520px] items-center justify-center bg-neutral-950 p-8 text-white">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-white" />

          <h3 className="mt-6 text-3xl font-black">Calculating result...</h3>

          <p className="mt-3 max-w-xl text-white/60">
            The debate has ended. The AI judge is reading the transcript.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[520px] bg-gradient-to-br from-neutral-950 via-neutral-900 to-black p-6 text-white">
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
            Scores are based on the captured transcript and AI judging criteria.
          </p>

          {finalScore.source ? (
            <div className="mt-3 text-xs text-white/40">
              Source: {finalScore.source} · Transcript words:{" "}
              {finalScore.transcriptWordCount || 0}
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <ScoreCard
            label="Speaker A"
            name={speakerAName}
            score={speakerAScore}
            animatedScore={animatedA}
          />

          <ScoreCard
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
                Each score is based only on what appears in the transcript.
              </p>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <SpeakerJudgeCard
                  label="Speaker A"
                  name={speakerAName}
                  breakdown={speakerABreakdown}
                />

                <SpeakerJudgeCard
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

function CustomDailyCallInner({
  roomUrl,
  token,
  userName,
  debateTitle,
  debateStatus,
  timerText,
  currentRoundLabel,
  speakerAName,
  speakerBName,
  showResultGraphic,
  finalScore,
  isOwner,
  onTranscriptSegment,
}) {
  const callObject = useDaily();
  const meetingState = useMeetingState();
  const participantIds = useParticipantIds({ sort: "joined_at" });

  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState("off");

  const savedTranscriptKeysRef = useRef(new Set());
  const transcriptionStartedRef = useRef(false);
  const onTranscriptSegmentRef = useRef(onTranscriptSegment);

  const joined = meetingState === "joined-meeting";
  const joiningNow = meetingState === "joining-meeting" || joining;

  useEffect(() => {
    onTranscriptSegmentRef.current = onTranscriptSegment;
  }, [onTranscriptSegment]);

  const speakerBySessionId = useMemo(() => {
    const map = {};
    if (participantIds[0]) map[participantIds[0]] = "speakerA";
    if (participantIds[1]) map[participantIds[1]] = "speakerB";
    return map;
  }, [participantIds]);

  useEffect(() => {
    if (!callObject) return;

    function handleTranscriptionStarted() {
      setTranscriptionStatus("on");
    }

    function handleTranscriptionStopped() {
      setTranscriptionStatus("stopped");
    }

    function handleTranscriptionError(error) {
      console.error("Daily transcription error", error);
      setTranscriptionStatus("error");
    }

    function handleTranscriptionMessage(event) {
      if (!onTranscriptSegmentRef.current) return;
      if (!isFinalTranscriptEvent(event)) return;

      const text = extractTranscriptText(event);
      if (!text) return;

      const sessionId = extractTranscriptSessionId(event);
      const speakerUserId = speakerBySessionId[sessionId] || null;

      const startMs =
        Number(event?.startMs ?? event?.start_ms ?? event?.timestamp ?? Date.now()) ||
        Date.now();

      const endMs =
        Number(event?.endMs ?? event?.end_ms ?? event?.timestamp ?? startMs + 1000) ||
        startMs + 1000;

      const key = `${speakerUserId || sessionId || "unknown"}|${startMs}|${text}`;

      if (savedTranscriptKeysRef.current.has(key)) return;
      savedTranscriptKeysRef.current.add(key);

      onTranscriptSegmentRef.current({
        speakerUserId,
        startMs,
        endMs,
        text,
        confidence: Number(event?.confidence ?? 0.9),
      });
    }

    callObject.on("transcription-started", handleTranscriptionStarted);
    callObject.on("transcription-stopped", handleTranscriptionStopped);
    callObject.on("transcription-error", handleTranscriptionError);
    callObject.on("transcription-message", handleTranscriptionMessage);

    return () => {
      callObject.off("transcription-started", handleTranscriptionStarted);
      callObject.off("transcription-stopped", handleTranscriptionStopped);
      callObject.off("transcription-error", handleTranscriptionError);
      callObject.off("transcription-message", handleTranscriptionMessage);
    };
  }, [callObject, speakerBySessionId]);

  useEffect(() => {
    if (!callObject || !joined || !isOwner || showResultGraphic) return;
    if (debateStatus !== "live") return;
    if (transcriptionStartedRef.current) return;

    transcriptionStartedRef.current = true;
    setTranscriptionStatus("starting");

    callObject
      .startTranscription({
        language: "en",
        punctuate: true,
        includeRawResponse: true,
      })
      .then(() => {
        setTranscriptionStatus("on");
      })
      .catch((error) => {
        console.error("Could not start Daily transcription", error);
        setTranscriptionStatus("error");
      });
  }, [callObject, joined, isOwner, debateStatus, showResultGraphic]);

  useEffect(() => {
    if (!showResultGraphic || !joined || !callObject) return;

    callObject.leave().catch(() => null);
  }, [showResultGraphic, joined, callObject]);

  async function joinCall() {
    if (!callObject || !roomUrl || joined || joiningNow) return;

    try {
      setJoinError("");
      setJoining(true);

      await callObject.join({
        url: roomUrl,
        token: token || undefined,
        userName: userName || "Debater",
      });
    } catch (error) {
      setJoinError(error.message || "Could not join the video call.");
    } finally {
      setJoining(false);
    }
  }

  const firstParticipant = participantIds[0];
  const secondParticipant = participantIds[1];

  return (
    <div className="overflow-hidden rounded-2xl border bg-neutral-950 text-white shadow-xl">
      <div className="border-b border-white/10 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.25em] text-indigo-300">
              Live Debate
            </div>

            <h2 className="mt-1 truncate text-2xl font-bold">
              {debateTitle || "Untitled debate"}
            </h2>

            <div className="mt-2 flex flex-wrap gap-2 text-sm text-white/70">
              <span className="rounded-full bg-white/10 px-3 py-1">
                {currentRoundLabel}
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1">
                {speakerAName} vs {speakerBName}
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1">
                {showResultGraphic
                  ? "Result mode"
                  : joined
                    ? "Video connected"
                    : "Not connected"}
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1">
                Transcript: {transcriptionStatus}
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">
              Countdown
            </div>

            <div className="mt-1 rounded-xl bg-white px-5 py-2 font-mono text-4xl font-bold text-neutral-950">
              {debateStatus === "live" ? timerText : "00:00"}
            </div>
          </div>
        </div>
      </div>

      {joinError ? (
        <div className="border-b border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {joinError}
        </div>
      ) : null}

      {showResultGraphic ? (
        <ResultGraphic
          finalScore={finalScore}
          speakerAName={speakerAName}
          speakerBName={speakerBName}
        />
      ) : !joined ? (
        <div className="flex min-h-[420px] items-center justify-center bg-neutral-900 p-6">
          <div className="max-w-md text-center">
            <h3 className="text-2xl font-semibold">Join the debate video</h3>

            <p className="mt-2 text-white/60">
              Click the button below, then allow camera and microphone access.
            </p>

            <button
              onClick={joinCall}
              disabled={joiningNow || !roomUrl}
              className="mt-5 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {joiningNow ? "Joining..." : "Join video"}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 bg-black p-4 md:grid-cols-2">
          {firstParticipant ? (
            <ParticipantTile
              sessionId={firstParticipant}
              fallbackName={speakerAName}
              label="Speaker A"
            />
          ) : (
            <EmptyTile label="Speaker A" />
          )}

          {secondParticipant ? (
            <ParticipantTile
              sessionId={secondParticipant}
              fallbackName={speakerBName}
              label="Speaker B"
            />
          ) : (
            <EmptyTile label="Speaker B" />
          )}
        </div>
      )}

      <DailyAudio />

      <CallControls joined={joined && !showResultGraphic} />
    </div>
  );
}

export default function CustomDailyCall(props) {
  const [callObject, setCallObject] = useState(null);
  const destroyedRef = useRef(false);

  useEffect(() => {
    destroyedRef.current = false;

    const dailyCallObject = DailyIframe.createCallObject();

    setCallObject(dailyCallObject);

    return () => {
      destroyedRef.current = true;

      dailyCallObject
        .leave()
        .catch(() => null)
        .finally(() => {
          try {
            dailyCallObject.destroy();
          } catch {}
        });
    };
  }, []);

  if (!callObject || destroyedRef.current) {
    return (
      <div className="rounded-2xl border bg-neutral-950 p-6 text-white">
        Loading video call...
      </div>
    );
  }

  return (
    <DailyProvider callObject={callObject}>
      <CustomDailyCallInner {...props} />
    </DailyProvider>
  );
}
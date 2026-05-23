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
  argumentQuality: "argument quality",
  factualAccuracy: "evidence usage",
  rebuttalEffectiveness: "rebuttal effectiveness",
  rhetoricDelivery: "delivery and rhetoric",
  topicConsistency: "topic consistency",
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

function aggregateDimensions(roundScores, speakerId) {
  const totals = {};
  let count = 0;

  (roundScores || []).forEach((roundScore) => {
    const dimensions = roundScore?.speakers?.[speakerId]?.dimensions;

    if (!dimensions) return;

    Object.keys(DIMENSION_LABELS).forEach((key) => {
      totals[key] = (totals[key] || 0) + Number(dimensions[key] || 0);
    });

    count += 1;
  });

  if (!count) return {};

  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, value / count])
  );
}

function buildResultExplanation({
  finalScore,
  roundScores,
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
        "No winner was awarded because the scores were too close.",
      loserReason:
        "Both sides need stronger arguments, clearer evidence and better rebuttals.",
    };
  }

  const winnerId =
    finalScore.winnerSpeakerId || finalScore.leaderboard?.[0]?.speakerId;

  const loserId = winnerId === "speakerA" ? "speakerB" : "speakerA";

  const winnerName = getSpeakerName(winnerId, speakerAName, speakerBName);
  const loserName = getSpeakerName(loserId, speakerAName, speakerBName);

  const winnerDimensions = aggregateDimensions(roundScores, winnerId);
  const loserDimensions = aggregateDimensions(roundScores, loserId);

  const dimensionComparisons = Object.keys(DIMENSION_LABELS)
    .map((key) => ({
      key,
      label: DIMENSION_LABELS[key],
      winnerValue: Number(winnerDimensions[key] || 0),
      loserValue: Number(loserDimensions[key] || 0),
      gap: Number(winnerDimensions[key] || 0) - Number(loserDimensions[key] || 0),
    }))
    .sort((a, b) => b.gap - a.gap);

  const winnerStrengths = dimensionComparisons
    .filter((item) => item.gap > 0)
    .slice(0, 2)
    .map((item) => item.label);

  const loserWeaknesses = dimensionComparisons
    .filter((item) => item.gap > 0)
    .slice(0, 2)
    .map((item) => item.label);

  if (!winnerStrengths.length) {
    return {
      winnerReason: `${winnerName} edged the debate overall based on the combined scoring dimensions.`,
      loserReason: `${loserName} was close, but fell slightly behind on the final combined score.`,
    };
  }

  return {
    winnerReason: `${winnerName} won because they performed better on ${winnerStrengths.join(
      " and "
    )}.`,
    loserReason: `${loserName} lost ground mainly on ${loserWeaknesses.join(
      " and "
    )}, which reduced their final score.`,
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

function ResultGraphic({
  finalScore,
  roundScores,
  speakerAName,
  speakerBName,
}) {
  const [animatedA, setAnimatedA] = useState(0);
  const [animatedB, setAnimatedB] = useState(0);
  const [stage, setStage] = useState("calculating");

  const speakerAScore = getScoreForSpeaker(finalScore, "speakerA");
  const speakerBScore = getScoreForSpeaker(finalScore, "speakerB");

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
        roundScores,
        speakerAName,
        speakerBName,
      }),
    [finalScore, roundScores, speakerAName, speakerBName]
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
            The debate has ended. The scoring engine is preparing the final result.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[520px] bg-gradient-to-br from-neutral-950 via-neutral-900 to-black p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.35em] text-indigo-300">
            Final Result
          </div>

          <h3 className="mt-2 text-4xl font-black">
            {stage === "counting"
              ? "Scores are being revealed..."
              : finalScore.tie
                ? "It is a draw"
                : `${winnerName} wins`}
          </h3>

          <p className="mt-2 text-white/60">
            Scores are based on the captured Daily transcript.
          </p>
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
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-5">
              <h4 className="text-lg font-bold text-green-200">
                Why this result was chosen
              </h4>

              <p className="mt-2 text-sm leading-6 text-white/75">
                {explanation.winnerReason}
              </p>
            </div>

            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
              <h4 className="text-lg font-bold text-red-200">
                What held the weaker side back
              </h4>

              <p className="mt-2 text-sm leading-6 text-white/75">
                {explanation.loserReason}
              </p>
            </div>
          </div>
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
  roundScores,
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

  const joined = meetingState === "joined-meeting";
  const joiningNow = meetingState === "joining-meeting" || joining;

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
      if (!onTranscriptSegment) return;
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

      onTranscriptSegment({
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
  }, [callObject, onTranscriptSegment, speakerBySessionId]);

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
          roundScores={roundScores}
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
          if (!dailyCallObject.isDestroyed()) {
            dailyCallObject.destroy();
          }
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
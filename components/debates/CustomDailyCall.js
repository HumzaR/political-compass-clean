import { useEffect, useRef, useState } from "react";
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

  if (!joined) {
    return null;
  }

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
}) {
  const callObject = useDaily();
  const meetingState = useMeetingState();
  const participantIds = useParticipantIds({ sort: "joined_at" });

  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  const joined = meetingState === "joined-meeting";
  const joiningNow = meetingState === "joining-meeting" || joining;

  async function joinCall() {
    if (!callObject || !roomUrl || joined || joiningNow) {
      return;
    }

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
                {joined ? "Video connected" : "Not connected"}
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">
              Timer
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

      {!joined ? (
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

      <CallControls joined={joined} />
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
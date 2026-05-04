import crypto from "node:crypto";

const debates = new Map();

export function nowIso() {
  return new Date().toISOString();
}

function ensureDebate(id) {
  const debate = debates.get(id);
  if (!debate) throw new Error("Debate not found");
  return debate;
}

export function createDebate({ title, motionText, format, domain, rounds = 3 }) {
  const id = crypto.randomUUID();
  const debate = {
    id,
    title,
    motionText,
    format,
    domain,
    status: "scheduled",
    live: null,
    createdAt: nowIso(),
    startedAt: null,
    endedAt: null,
    rounds: Array.from({ length: rounds }, (_, idx) => ({
      id: crypto.randomUUID(),
      roundNumber: idx + 1,
      status: "scheduled",
      closedAt: null,
    })),
    transcriptSegments: [],
    roundScores: [],
    finalScore: null,
  };

  debates.set(id, debate);
  return debate;
}

export function getDebate(id) {
  return ensureDebate(id);
}

export function listDebates() {
  return Array.from(debates.values());
}

export function setLiveSession(id, liveSession) {
  const debate = ensureDebate(id);
  debate.live = liveSession;
  return debate;
}

export function startDebate(id) {
  const debate = ensureDebate(id);
  debate.status = "live";
  debate.startedAt = nowIso();
  return debate;
}

export function endDebate(id) {
  const debate = ensureDebate(id);
  debate.status = "ended";
  debate.endedAt = nowIso();
  return debate;
}

export function addTranscriptSegments(id, segments) {
  const debate = ensureDebate(id);
  const normalized = segments.map((segment) => ({
    id: crypto.randomUUID(),
    speakerUserId: segment.speakerUserId || null,
    startMs: Number(segment.startMs ?? 0),
    endMs: Number(segment.endMs ?? 0),
    text: String(segment.text || ""),
    confidence: Number(segment.confidence ?? 0),
    createdAt: nowIso(),
  }));

  debate.transcriptSegments.push(...normalized);
  return normalized;
}

export function closeRound(debateId, roundId, scoreResult) {
  const debate = ensureDebate(debateId);
  const round = debate.rounds.find((item) => item.id === roundId);
  if (!round) throw new Error("Round not found");
  round.status = "closed";
  round.closedAt = nowIso();

  const idx = debate.roundScores.findIndex((item) => item.roundId === roundId);
  if (idx >= 0) debate.roundScores[idx] = scoreResult;
  else debate.roundScores.push(scoreResult);

  return { round, scoreResult };
}

export function setFinalScore(debateId, finalScore) {
  const debate = ensureDebate(debateId);
  debate.finalScore = finalScore;
  return debate;
}

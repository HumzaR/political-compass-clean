import crypto from "node:crypto";

const debates = new Map();
const nowIso = () => new Date().toISOString();

function ensureDebate(id) {
  const debate = debates.get(id);
  if (!debate) throw new Error("Debate not found");
  return debate;
}

export function createDebate({ title, motionText, format, domain, rounds = 3 }) {
  const id = crypto.randomUUID();
  const debate = {
    id, title, motionText, format, domain,
    status: "scheduled",
    createdAt: nowIso(),
    startedAt: null,
    endedAt: null,
    live: null,
    rounds: Array.from({ length: rounds }, (_, i) => ({
      id: crypto.randomUUID(),
      roundNumber: i + 1,
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

export function listDebates() { return Array.from(debates.values()); }
export function getDebate(id) { return ensureDebate(id); }

export function setLiveSession(id, liveSession) {
  const d = ensureDebate(id); d.live = liveSession; return d;
}
export function startDebate(id) {
  const d = ensureDebate(id); d.status = "live"; d.startedAt = nowIso(); return d;
}
export function endDebate(id) {
  const d = ensureDebate(id); d.status = "ended"; d.endedAt = nowIso(); return d;
}
export function addTranscriptSegments(id, segments) {
  const d = ensureDebate(id);
  const normalized = segments.map((s) => ({
    id: crypto.randomUUID(),
    speakerUserId: s.speakerUserId || null,
    startMs: Number(s.startMs ?? 0),
    endMs: Number(s.endMs ?? 0),
    text: String(s.text || ""),
    confidence: Number(s.confidence ?? 0),
    createdAt: nowIso(),
  }));
  d.transcriptSegments.push(...normalized);
  return normalized;
}
export function closeRound(debateId, roundId, scoreResult) {
  const d = ensureDebate(debateId);
  const round = d.rounds.find((r) => r.id === roundId);
  if (!round) throw new Error("Round not found");
  round.status = "closed";
  round.closedAt = nowIso();

  const idx = d.roundScores.findIndex((r) => r.roundId === roundId);
  if (idx >= 0) d.roundScores[idx] = scoreResult;
  else d.roundScores.push(scoreResult);

  return { round, scoreResult };
}
export function setFinalScore(debateId, finalScore) {
  const d = ensureDebate(debateId); d.finalScore = finalScore; return d;
}

import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { normalizeLimit } from "@/lib/debates/pagination";
import { adminDb } from "@/lib/firebaseAdmin";

const COLLECTIONS = {
  debates: "debates",
  rounds: "debate_rounds",
  transcriptSegments: "debate_transcript_segments",
  roundScores: "debate_round_scores",
  finalScores: "debate_final_scores",
  participants: "debate_participants",
};

const nowIso = () => new Date().toISOString();

function debateRef(id) {
  return adminDb.collection(COLLECTIONS.debates).doc(id);
}

function roundRef(id) {
  return adminDb.collection(COLLECTIONS.rounds).doc(id);
}

function finalScoreRef(id) {
  return adminDb.collection(COLLECTIONS.finalScores).doc(id);
}

function participantRef(debateId, userUid) {
  return adminDb.collection(COLLECTIONS.participants).doc(`${debateId}_${userUid}`);
}

async function fetchRounds(debateId) {
  const snap = await adminDb
    .collection(COLLECTIONS.rounds)
    .where("debateId", "==", debateId)
    .orderBy("roundNumber", "asc")
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchRoundScores(debateId) {
  const snap = await adminDb
    .collection(COLLECTIONS.roundScores)
    .where("debateId", "==", debateId)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchFinalScore(debateId) {
  const doc = await finalScoreRef(debateId).get();
  if (!doc.exists) return null;
  return doc.data();
}

async function fetchTranscriptSegments(debateId) {
  const snap = await adminDb
    .collection(COLLECTIONS.transcriptSegments)
    .where("debateId", "==", debateId)
    .orderBy("startMs", "asc")
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchParticipants(debateId) {
  const snap = await adminDb
    .collection(COLLECTIONS.participants)
    .where("debateId", "==", debateId)
    .orderBy("joinedAt", "asc")
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function assertCanStart(status) {
  if (status !== "scheduled") {
    throw new Error("Debate cannot be started from current status");
  }
}

function assertCanEnd(status) {
  if (status !== "live") {
    throw new Error("Debate can only be ended when live");
  }
}

function assertCanCloseRound(status) {
  if (status !== "live") {
    throw new Error("Rounds can only be closed while debate is live");
  }
}

function assertCanSaveFinalScore(status) {
  if (status !== "ended") {
    throw new Error("Final score can only be saved after debate has ended");
  }
}

export async function createDebate({
  title,
  motionText,
  format,
  domain,
  rounds = 3,
  createdByUid = null,
}) {
  const id = crypto.randomUUID();
  const createdAt = nowIso();

  const debate = {
    id,
    title,
    motionText,
    format,
    domain,
    status: "scheduled",
    createdByUid,
    createdAt,
    startedAt: null,
    endedAt: null,
    live: null,
    updatedAt: createdAt,
  };

  const batch = adminDb.batch();

  batch.set(debateRef(id), {
    ...debate,
    createdAtServer: FieldValue.serverTimestamp(),
    updatedAtServer: FieldValue.serverTimestamp(),
  });

  const roundCount = Number(rounds || 3);

  for (let i = 0; i < roundCount; i += 1) {
    const roundId = crypto.randomUUID();

    batch.set(roundRef(roundId), {
      id: roundId,
      debateId: id,
      roundNumber: i + 1,
      status: "scheduled",
      closedAt: null,
      createdAt,
      createdAtServer: FieldValue.serverTimestamp(),
      updatedAtServer: FieldValue.serverTimestamp(),
    });
  }

  if (createdByUid) {
    batch.set(participantRef(id, createdByUid), {
      id: `${id}_${createdByUid}`,
      debateId: id,
      userUid: createdByUid,
      role: "host",
      seat: "speakerA",
      displayName: "Host",
      joinedAt: createdAt,
      lastSeenAt: createdAt,
      joinedAtServer: FieldValue.serverTimestamp(),
      lastSeenAtServer: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return getDebate(id);
}

export async function listDebates(maxItems = 50) {
  const limitItems = normalizeLimit(maxItems, { min: 1, max: 100, fallback: 50 });

  const snap = await adminDb
    .collection(COLLECTIONS.debates)
    .orderBy("createdAt", "desc")
    .limit(limitItems)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getDebate(id) {
  const doc = await debateRef(id).get();

  if (!doc.exists) {
    throw new Error("Debate not found");
  }

  const base = { id: doc.id, ...doc.data() };

  const [rounds, roundScores, finalScore, participants] = await Promise.all([
    fetchRounds(id),
    fetchRoundScores(id),
    fetchFinalScore(id),
    fetchParticipants(id),
  ]);

  return {
    ...base,
    rounds,
    roundScores,
    participants,
    finalScore: finalScore?.finalScore || null,
  };
}

export async function joinDebate(debateId, userUid, displayName = "Guest") {
  const debate = await getDebate(debateId);

  const participants = debate.participants || [];
  const existing = participants.find((p) => p.userUid === userUid);

  const seat =
    existing?.seat ||
    (participants.some((p) => p.seat === "speakerA") ? "speakerB" : "speakerA");

  const role = debate.createdByUid === userUid ? "host" : "guest";
  const joinedAt = existing?.joinedAt || nowIso();

  await participantRef(debateId, userUid).set(
    {
      id: `${debateId}_${userUid}`,
      debateId,
      userUid,
      role,
      seat,
      displayName,
      joinedAt,
      lastSeenAt: nowIso(),
      joinedAtServer: existing?.joinedAtServer || FieldValue.serverTimestamp(),
      lastSeenAtServer: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return getDebate(debateId);
}

export async function setLiveSession(id, liveSession) {
  await debateRef(id).set(
    {
      live: liveSession,
      updatedAt: nowIso(),
      updatedAtServer: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return getDebate(id);
}

export async function startDebate(id) {
  const current = await getDebate(id);
  assertCanStart(current.status);

  await debateRef(id).set(
    {
      status: "live",
      startedAt: nowIso(),
      updatedAt: nowIso(),
      updatedAtServer: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return getDebate(id);
}

export async function endDebate(id) {
  const current = await getDebate(id);
  assertCanEnd(current.status);

  await debateRef(id).set(
    {
      status: "ended",
      endedAt: nowIso(),
      updatedAt: nowIso(),
      updatedAtServer: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return getDebate(id);
}

export async function addTranscriptSegments(id, segments) {
  await getDebate(id);

  const batch = adminDb.batch();

  const normalized = segments.map((s) => {
    const segmentId = crypto.randomUUID();

    const item = {
      id: segmentId,
      debateId: id,
      speakerUserId: s.speakerUserId || null,
      startMs: Number(s.startMs ?? 0),
      endMs: Number(s.endMs ?? 0),
      text: String(s.text || ""),
      confidence: Number(s.confidence ?? 0),
      createdAt: nowIso(),
      createdAtServer: FieldValue.serverTimestamp(),
    };

    batch.set(adminDb.collection(COLLECTIONS.transcriptSegments).doc(segmentId), item);

    return item;
  });

  await batch.commit();

  return normalized;
}

export async function listTranscriptSegments(debateId) {
  await getDebate(debateId);
  return fetchTranscriptSegments(debateId);
}

export async function closeRound(debateId, roundId, scoreResult) {
  const debate = await getDebate(debateId);
  assertCanCloseRound(debate.status);

  const roundDoc = await roundRef(roundId).get();

  if (!roundDoc.exists) {
    throw new Error("Round not found");
  }

  const round = roundDoc.data();

  if (round.debateId !== debateId) {
    throw new Error("Round not found");
  }

  if (round.status === "closed") {
    throw new Error("Round already closed");
  }

  const closedAt = nowIso();

  const batch = adminDb.batch();

  batch.set(
    roundRef(roundId),
    {
      status: "closed",
      closedAt,
      updatedAtServer: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const scoreId = `${debateId}_${roundId}`;

  batch.set(adminDb.collection(COLLECTIONS.roundScores).doc(scoreId), {
    id: scoreId,
    debateId,
    roundId,
    ...scoreResult,
    updatedAtServer: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    round: {
      ...round,
      status: "closed",
      closedAt,
    },
    scoreResult,
  };
}

export async function setFinalScore(debateId, finalScore) {
  const debate = await getDebate(debateId);
  assertCanSaveFinalScore(debate.status);

  await finalScoreRef(debateId).set(
    {
      id: debateId,
      debateId,
      finalScore,
      updatedAt: nowIso(),
      updatedAtServer: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return getDebate(debateId);
}
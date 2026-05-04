import crypto from "node:crypto";
import { normalizeLimit } from "@/lib/debates/pagination";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  collection,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

const COLLECTIONS = {
  debates: "debates",
  rounds: "debate_rounds",
  transcriptSegments: "debate_transcript_segments",
  roundScores: "debate_round_scores",
  finalScores: "debate_final_scores",
};

export function nowIso() {
  return new Date().toISOString();
}

async function ensureDebate(id) {
  const ref = doc(db, COLLECTIONS.debates, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Debate not found");
  return { id: snap.id, ...snap.data() };
}

export async function createDebate({ title, motionText, format, domain, rounds = 3, createdByUid }) {
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  const roundsData = Array.from({ length: rounds }, (_, idx) => ({
    id: crypto.randomUUID(),
    debateId: id,
    roundNumber: idx + 1,
    status: "scheduled",
    createdByUid: createdByUid || null,
    closedAt: null,
    createdAt,
  }));

  const debate = {
    id,
    title,
    motionText,
    format,
    domain,
    createdByUid: createdByUid || null,
    status: "scheduled",
    live: null,
    createdAt,
    startedAt: null,
    endedAt: null,
    rounds: roundsData,
    roundsCount: rounds,
    finalScore: null,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.debates, id), debate);
  roundsData.forEach((round) => {
    batch.set(doc(db, COLLECTIONS.rounds, round.id), round);
  });
  await batch.commit();

  return debate;
}

export async function getDebate(id) {
  const debate = await ensureDebate(id);

  const [roundsSnap, roundScoresSnap, finalScoreSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.rounds), where("debateId", "==", id), orderBy("roundNumber", "asc"))),
    getDocs(query(collection(db, COLLECTIONS.roundScores), where("debateId", "==", id))),
    getDoc(doc(db, COLLECTIONS.finalScores, id)),
  ]);

  const rounds = roundsSnap.docs.map((item) => ({ id: item.id, ...item.data() }));
  const roundScores = roundScoresSnap.docs.map((item) => ({ ...item.data() }));
  const finalScore = finalScoreSnap.exists() ? finalScoreSnap.data() : null;

  return { ...debate, rounds, roundScores, finalScore };
}

export async function listDebates(maxItems = 50) {
  const normalizedMax = normalizeLimit(maxItems);
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.debates), orderBy("createdAt", "desc"), limit(normalizedMax))
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function setLiveSession(id, liveSession) {
  await ensureDebate(id);
  await updateDoc(doc(db, COLLECTIONS.debates, id), { live: liveSession });
  return getDebate(id);
}

export async function startDebate(id) {
  const debate = await ensureDebate(id);
  if (debate.status !== "scheduled") {
    throw new Error("Debate cannot be started from current status");
  }
  await updateDoc(doc(db, COLLECTIONS.debates, id), {
    status: "live",
    startedAt: nowIso(),
  });
  return getDebate(id);
}

export async function endDebate(id) {
  const debate = await ensureDebate(id);
  if (debate.status !== "live") {
    throw new Error("Debate can only be ended when live");
  }
  await updateDoc(doc(db, COLLECTIONS.debates, id), {
    status: "ended",
    endedAt: nowIso(),
  });
  return getDebate(id);
}

export async function addTranscriptSegments(id, segments) {
  await ensureDebate(id);
  const normalized = segments.map((segment) => ({
    id: crypto.randomUUID(),
    debateId: id,
    speakerUserId: segment.speakerUserId || null,
    startMs: Number(segment.startMs ?? 0),
    endMs: Number(segment.endMs ?? 0),
    text: String(segment.text || ""),
    confidence: Number(segment.confidence ?? 0),
    createdAt: nowIso(),
  }));

  const batch = writeBatch(db);
  normalized.forEach((segment) => {
    batch.set(doc(db, COLLECTIONS.transcriptSegments, segment.id), segment);
  });
  await batch.commit();

  return normalized;
}

export async function listTranscriptSegments(debateId) {
  await ensureDebate(debateId);
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.transcriptSegments), where("debateId", "==", debateId), orderBy("startMs", "asc"))
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function closeRound(debateId, roundId, scoreResult) {
  const debate = await ensureDebate(debateId);
  if (debate.status !== "live") {
    throw new Error("Round can only be closed while debate is live");
  }
  const roundRef = doc(db, COLLECTIONS.rounds, roundId);
  const roundSnap = await getDoc(roundRef);
  if (!roundSnap.exists() || roundSnap.data().debateId !== debateId) throw new Error("Round not found");
  if (roundSnap.data().status === "closed") throw new Error("Round already closed");

  const updatedRound = {
    ...roundSnap.data(),
    status: "closed",
    closedAt: nowIso(),
  };

  const scoreDoc = {
    ...scoreResult,
    debateId,
    roundId,
  };

  const batch = writeBatch(db);
  batch.set(roundRef, updatedRound, { merge: true });
  batch.set(doc(db, COLLECTIONS.roundScores, roundId), scoreDoc);
  await batch.commit();

  return { round: { id: roundId, ...updatedRound }, scoreResult: scoreDoc };
}

export async function setFinalScore(debateId, finalScore) {
  const debate = await ensureDebate(debateId);
  if (debate.status !== "ended") {
    throw new Error("Final score can only be set after debate has ended");
  }

  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.finalScores, debateId), finalScore);
  batch.set(doc(db, COLLECTIONS.debates, debateId), { finalScore }, { merge: true });
  await batch.commit();

  return getDebate(debateId);
}

import {
  allowMethods,
  badRequest,
  handleError,
  requireActor,
} from "@/lib/debates/http";
import {
  addTranscriptSegments,
  getDebate,
  listTranscriptSegments,
} from "@/lib/debates/store";

function getActorParticipant(debate, actorUid) {
  return (debate.participants || []).find(
    (participant) => participant.userUid === actorUid
  );
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET", "POST"])) return;

  try {
    const { debateId } = req.query;

    const actorUid = await requireActor(req, res);
    if (!actorUid) return;

    const debate = await getDebate(debateId);

    const isOwner = debate.createdByUid === actorUid;
    const actorParticipant = getActorParticipant(debate, actorUid);
    const isParticipant = !!actorParticipant;

    if (!isOwner && !isParticipant) {
      return res.status(403).json({
        error: "You must be part of this debate to access the transcript.",
      });
    }

    if (req.method === "GET") {
      const segments = await listTranscriptSegments(debateId);
      return res.status(200).json({ segments });
    }

    const { segments, source = "daily_transcript" } = req.body || {};

    if (!Array.isArray(segments) || segments.length === 0) {
      return badRequest(res, "segments[] is required");
    }

    let normalizedSegments = segments;

    if (source === "message") {
      if (!actorParticipant?.seat) {
        return res.status(403).json({
          error: "Only debate participants can send debate messages.",
        });
      }

      if (debate.status !== "live") {
        return res.status(409).json({
          error: "Messages can only be sent while the debate is live.",
        });
      }

      normalizedSegments = segments.map((segment) => ({
        ...segment,
        speakerUserId: actorParticipant.seat,
        confidence: 1,
      }));
    } else if (!isOwner) {
      return res.status(403).json({
        error: "Only the debate owner can save non-message transcript segments.",
      });
    }

    const savedSegments = await addTranscriptSegments(debateId, normalizedSegments);

    return res.status(202).json({
      accepted: savedSegments.length,
      segments: savedSegments,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
import { allowMethods, handleError, requireActor } from "@/lib/debates/http";
import { getDebate, listTranscriptSegments } from "@/lib/debates/store";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;

  try {
    const { debateId } = req.query;

    const actorUid = await requireActor(req, res);

    if (!actorUid) {
      return;
    }

    const debate = await getDebate(debateId);

    const isOwner = debate.createdByUid === actorUid;

    const isParticipant = (debate.participants || []).some(
      (participant) => participant.userUid === actorUid
    );

    if (!isOwner && !isParticipant) {
      return res.status(403).json({
        error: "You must join this debate before opening the workspace.",
      });
    }

    const segments = await listTranscriptSegments(debateId);

    return res.status(200).json({
      debate,
      transcriptSegments: segments,
      meta: {
        hasLiveSession: !!debate.live,
        roundCount: debate.rounds?.length || 0,
        closedRoundCount: (debate.rounds || []).filter(
          (round) => round.status === "closed"
        ).length,
        participantCount: debate.participants?.length || 0,
        isOwner,
        isParticipant,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}
import { allowMethods, handleError, requireDebateOwner } from "@/lib/debates/http";
import { getDebate, listTranscriptSegments } from "@/lib/debates/store";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;

  try {
    const { debateId } = req.query;
    const debate = await getDebate(debateId);
    if (!(await requireDebateOwner(req, res, debate))) return;

    const segments = await listTranscriptSegments(debateId);
    return res.status(200).json({
      debate,
      transcriptSegments: segments,
      meta: {
        hasLiveSession: !!debate.live,
        roundCount: debate.rounds?.length || 0,
        closedRoundCount: (debate.rounds || []).filter((round) => round.status === "closed").length,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

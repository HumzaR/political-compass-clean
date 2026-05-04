import { allowMethods, badRequest, handleError, requireDebateOwner } from "@/lib/debates/http";
import { getDebate } from "@/lib/debates/store";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;

  try {
    const { debateId } = req.query;
    const debate = await getDebate(debateId);
    if (!(await requireDebateOwner(req, res, debate))) return;
    if (!debate.finalScore) {
      return badRequest(res, "Final score has not been computed yet");
    }

    return res.status(200).json({
      debateId,
      status: debate.status,
      roundScores: debate.roundScores,
      finalScore: debate.finalScore,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

import { allowMethods, badRequest, handleError, requireDebateOwner } from "@/lib/debates/http";
import { computeFinalScore } from "@/lib/debates/scoring";
import { getDebate, setFinalScore } from "@/lib/debates/store";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const { debateId } = req.query;
    const debate = await getDebate(debateId);
    if (!(await requireDebateOwner(req, res, debate))) return;
    if (!debate.roundScores.length) {
      return badRequest(res, "No round scores recorded yet");
    }

    const confidenceFactor = Number(req.body?.confidenceFactor ?? 1);
    if (!Number.isFinite(confidenceFactor) || confidenceFactor < 0.9 || confidenceFactor > 1) {
      return badRequest(res, "confidenceFactor must be a number between 0.9 and 1.0");
    }
    const finalScore = computeFinalScore({ debate, confidenceFactor });
    await setFinalScore(debateId, finalScore);

    return res.status(200).json({ finalScore });
  } catch (error) {
    return handleError(res, error);
  }
}

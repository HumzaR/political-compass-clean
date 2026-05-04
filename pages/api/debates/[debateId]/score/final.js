import { allowMethods, badRequest, handleError } from "@/lib/debates/http";
import { computeFinalScore } from "@/lib/debates/scoring";
import { getDebate, setFinalScore } from "@/lib/debates/store";

export default function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const { debateId } = req.query;
    const debate = getDebate(debateId);
    if (!debate.roundScores.length) {
      return badRequest(res, "No round scores recorded yet");
    }

    const confidenceFactor = Number(req.body?.confidenceFactor ?? 1);
    const finalScore = computeFinalScore({ debate, confidenceFactor });
    setFinalScore(debateId, finalScore);

    return res.status(200).json({ finalScore });
  } catch (error) {
    return handleError(res, error);
  }
}

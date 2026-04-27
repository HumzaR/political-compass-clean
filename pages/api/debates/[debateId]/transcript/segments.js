import { allowMethods, badRequest, handleError } from "@/lib/debates/http";
import { addTranscriptSegments } from "@/lib/debates/store";

export default function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  const { segments } = req.body || {};
  if (!Array.isArray(segments) || segments.length === 0) {
    return badRequest(res, "segments[] is required");
  }

  try {
    const { debateId } = req.query;
    const saved = addTranscriptSegments(debateId, segments);
    return res.status(202).json({ accepted: saved.length });
  } catch (error) {
    return handleError(res, error);
  }
}

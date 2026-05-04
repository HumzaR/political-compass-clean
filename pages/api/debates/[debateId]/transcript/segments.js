import { allowMethods, badRequest, handleError, requireDebateOwner } from "@/lib/debates/http";
import { addTranscriptSegments, getDebate, listTranscriptSegments } from "@/lib/debates/store";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET", "POST"])) return;

  if (req.method === "GET") {
    try {
      const { debateId } = req.query;
      const debate = await getDebate(debateId);
      if (!(await requireDebateOwner(req, res, debate))) return;
      const segments = await listTranscriptSegments(debateId);
      return res.status(200).json({ segments });
    } catch (error) {
      return handleError(res, error);
    }
  }

  const { segments } = req.body || {};
  if (!Array.isArray(segments) || segments.length === 0) {
    return badRequest(res, "segments[] is required");
  }

  try {
    const { debateId } = req.query;
    const debate = await getDebate(debateId);
    if (!(await requireDebateOwner(req, res, debate))) return;
    const savedSegments = await addTranscriptSegments(debateId, segments);
    return res.status(202).json({ accepted: savedSegments.length });
  } catch (error) {
    return handleError(res, error);
  }
}

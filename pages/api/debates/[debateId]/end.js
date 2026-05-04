import { allowMethods, handleError, requireDebateOwner } from "@/lib/debates/http";
import { endDebate, getDebate } from "@/lib/debates/store";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const { debateId } = req.query;
    const debate = await getDebate(debateId);
    if (!(await requireDebateOwner(req, res, debate))) return;
    const updatedDebate = await endDebate(debateId);
    return res.status(200).json({ debate: updatedDebate });
  } catch (error) {
    return handleError(res, error);
  }
}

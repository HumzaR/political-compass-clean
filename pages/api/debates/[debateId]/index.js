import { allowMethods, handleError, requireDebateOwner } from "@/lib/debates/http";
import { getDebate } from "@/lib/debates/store";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;

  try {
    const { debateId } = req.query;
    const debate = await getDebate(debateId);
    if (!(await requireDebateOwner(req, res, debate))) return;
    return res.status(200).json({ debate });
  } catch (error) {
    return handleError(res, error);
  }
}

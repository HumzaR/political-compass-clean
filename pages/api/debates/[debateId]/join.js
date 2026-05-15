import { allowMethods, handleError, requireActor } from "@/lib/debates/http";
import { joinDebate } from "@/lib/debates/store";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const { debateId } = req.query;

    const actorUid = await requireActor(req, res);

    if (!actorUid) {
      return;
    }

    const displayName =
      req.body?.displayName ||
      req.body?.name ||
      "Guest";

    const debate = await joinDebate(debateId, actorUid, displayName);

    return res.status(200).json({
      ok: true,
      debate,
      participants: debate.participants || [],
    });
  } catch (error) {
    return handleError(res, error);
  }
}
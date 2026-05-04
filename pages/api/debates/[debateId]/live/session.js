import crypto from "node:crypto";

import { allowMethods, handleError, requireDebateOwner } from "@/lib/debates/http";
import { buildDailyRoomUrl, getConfiguredDailyDomain } from "@/lib/debates/live";
import { getDebate, setLiveSession } from "@/lib/debates/store";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const { debateId } = req.query;
    const debate = await getDebate(debateId);
    if (!(await requireDebateOwner(req, res, debate))) return;
    const dailyDomain = getConfiguredDailyDomain(process.env);
    if (!dailyDomain) {
      return res.status(503).json({
        error: "Live provider is not configured. Set DAILY_DOMAIN to enable live sessions.",
      });
    }

    const session = {
      provider: "daily",
      roomName: `debate-${debate.id}`,
      roomUrl: buildDailyRoomUrl(dailyDomain, debate.id),
      token: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    await setLiveSession(debateId, session);
    return res.status(200).json({ session });
  } catch (error) {
    return handleError(res, error);
  }
}

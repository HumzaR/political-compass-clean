import crypto from "node:crypto";
import { allowMethods, handleError } from "@/lib/debates/http";
import { getDebate, setLiveSession } from "@/lib/debates/store";

export default function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  try {
    const { debateId } = req.query;
    const debate = getDebate(debateId);

    const session = {
      provider: "daily",
      roomName: `debate-${debate.id}`,
      roomUrl: `https://example.daily.co/debate-${debate.id}`,
      token: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    setLiveSession(debateId, session);
    return res.status(200).json({ session });
  } catch (error) {
    return handleError(res, error);
  }
}

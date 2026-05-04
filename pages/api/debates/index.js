import { allowMethods, badRequest, requireActor } from "@/lib/debates/http";
import { createDebate, listDebates } from "@/lib/debates/store";

const FORMATS = new Set(["short", "long"]);
const DOMAINS = new Set(["politics", "sports", "general"]);

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET", "POST"])) return;

  if (req.method === "GET") {
    const requestedLimit = Number(req.query?.limit ?? 50);
    const debates = await listDebates(requestedLimit);
    return res.status(200).json({ debates });
  }

  const { title, motionText, format, domain, rounds } = req.body || {};

  if (!title || !motionText) {
    return badRequest(res, "title and motionText are required");
  }
  if (!FORMATS.has(format)) {
    return badRequest(res, "format must be short or long");
  }
  if (!DOMAINS.has(domain)) {
    return badRequest(res, "domain must be politics, sports, or general");
  }
  const actorUid = await requireActor(req, res);
  if (!actorUid) return;

  const debate = await createDebate({
    title,
    motionText,
    format,
    domain,
    rounds: Number(rounds || (format === "short" ? 3 : 6)),
    createdByUid: actorUid,
  });

  return res.status(201).json({ debate });
}

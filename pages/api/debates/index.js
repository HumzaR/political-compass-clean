import { allowMethods, badRequest, requireActor } from "@/lib/debates/http";
import { createDebate, listDebates } from "@/lib/debates/store";

const FORMATS = new Set(["short", "medium", "long", "custom"]);
const DEBATE_MODES = new Set(["video_voice", "message"]);
const DOMAINS = new Set(["politics", "sports", "general"]);

function normaliseRounds(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.min(20, Math.floor(number)));
}

function normaliseDurationMinutes(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(1, Math.min(180, Math.floor(number)));
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET", "POST"])) return;

  if (req.method === "GET") {
    const requestedLimit = Number(req.query?.limit ?? 50);
    const debates = await listDebates(requestedLimit);

    return res.status(200).json({ debates });
  }

  const {
    title,
    motionText,
    debateMode = "video_voice",
    format = "short",
    durationMinutes = null,
    domain = "politics",
    rounds = 1,
    roundSubtopics = [],
  } = req.body || {};

  const cleanTitle = String(title || "").trim();
  const cleanMotionText = String(motionText || title || "").trim();
  const roundCount = normaliseRounds(rounds);
  const cleanDurationMinutes = normaliseDurationMinutes(durationMinutes);

  if (!cleanTitle || !cleanMotionText) {
    return badRequest(res, "title and motionText are required");
  }

  if (!DEBATE_MODES.has(debateMode)) {
    return badRequest(res, "debateMode must be video_voice or message");
  }

  if (!FORMATS.has(format)) {
    return badRequest(res, "format must be short, medium, long, or custom");
  }

  if (format === "custom" && !cleanDurationMinutes) {
    return badRequest(res, "durationMinutes is required for custom debates");
  }

  if (!DOMAINS.has(domain)) {
    return badRequest(res, "domain must be politics, sports, or general");
  }

  const cleanedRoundSubtopics =
    roundCount > 1
      ? Array.isArray(roundSubtopics)
        ? roundSubtopics
            .slice(0, roundCount)
            .map((item) => String(item || "").trim())
        : []
      : [];

  if (
    roundCount > 1 &&
    (cleanedRoundSubtopics.length !== roundCount ||
      cleanedRoundSubtopics.some((item) => !item))
  ) {
    return badRequest(res, "A subtopic is required for every round");
  }

  const actorUid = await requireActor(req, res);

  if (!actorUid) return;

  const debate = await createDebate({
    title: cleanTitle,
    motionText: cleanMotionText,
    debateMode,
    format,
    durationMinutes: format === "custom" ? cleanDurationMinutes : null,
    domain,
    rounds: roundCount,
    roundSubtopics: cleanedRoundSubtopics,
    createdByUid: actorUid,
  });

  return res.status(201).json({ debate });
}
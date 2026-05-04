import { allowMethods, badRequest, handleError } from "@/lib/debates/http";
import { computeSpeakerScore, getWeights } from "@/lib/debates/scoring";
import { closeRound, getDebate } from "@/lib/debates/store";

export default function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  const { speakers } = req.body || {};
  if (!speakers || typeof speakers !== "object") {
    return badRequest(res, "speakers object is required");
  }

  try {
    const { debateId, roundId } = req.query;
    const debate = getDebate(debateId);
    const weights = getWeights(debate.format, debate.domain);

    const scoredSpeakers = Object.fromEntries(
      Object.entries(speakers).map(([speakerId, payload]) => {
        const dimensions = payload?.dimensions || {};
        const normalizedDimensions = {
          argumentQuality: Number(dimensions.argumentQuality ?? 0),
          factualAccuracy: Number(dimensions.factualAccuracy ?? 0),
          rebuttalEffectiveness: Number(dimensions.rebuttalEffectiveness ?? 0),
          rhetoricDelivery: Number(dimensions.rhetoricDelivery ?? 0),
          topicConsistency: Number(dimensions.topicConsistency ?? 0),
        };

        const penalties = Number(payload?.penalties ?? 0);
        const bonuses = Number(payload?.bonuses ?? 0);
        const roundScore = computeSpeakerScore({
          dimensions: normalizedDimensions,
          penalties,
          bonuses,
          weights,
        });

        return [speakerId, { dimensions: normalizedDimensions, penalties, bonuses, roundScore }];
      })
    );

    const result = closeRound(debateId, roundId, {
      roundId,
      weights,
      speakers: scoredSpeakers,
      computedAt: new Date().toISOString(),
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

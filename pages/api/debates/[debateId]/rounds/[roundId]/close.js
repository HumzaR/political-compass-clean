import { allowMethods, badRequest, handleError, requireDebateOwner } from "@/lib/debates/http";
import { computeSpeakerScore, getWeights } from "@/lib/debates/scoring";
import { closeRound, getDebate } from "@/lib/debates/store";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  const { speakers } = req.body || {};
  if (!speakers || typeof speakers !== "object") {
    return badRequest(res, "speakers object is required");
  }
  if (!Object.keys(speakers).length) {
    return badRequest(res, "speakers object must include at least one speaker");
  }

  try {
    const { debateId, roundId } = req.query;
    const debate = await getDebate(debateId);
    if (!(await requireDebateOwner(req, res, debate))) return;
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
        const isValidDimension = Object.values(normalizedDimensions).every(
          (value) => Number.isFinite(value) && value >= 0 && value <= 100
        );
        if (!isValidDimension) {
          throw new Error("Invalid dimensions: scores must be numbers between 0 and 100");
        }

        const penalties = Number(payload?.penalties ?? 0);
        const bonuses = Number(payload?.bonuses ?? 0);
        if (!Number.isFinite(penalties) || penalties < 0 || !Number.isFinite(bonuses) || bonuses < 0) {
          throw new Error("Invalid penalties/bonuses: values must be non-negative numbers");
        }
        const roundScore = computeSpeakerScore({
          dimensions: normalizedDimensions,
          penalties,
          bonuses,
          weights,
        });

        return [speakerId, { dimensions: normalizedDimensions, penalties, bonuses, roundScore }];
      })
    );

    const result = await closeRound(debateId, roundId, {
      roundId,
      weights,
      speakers: scoredSpeakers,
      computedAt: new Date().toISOString(),
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error?.message?.startsWith("Invalid dimensions") || error?.message?.startsWith("Invalid penalties/bonuses")) {
      return badRequest(res, error.message);
    }
    return handleError(res, error);
  }
}

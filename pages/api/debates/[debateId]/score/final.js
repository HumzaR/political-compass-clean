import { allowMethods, badRequest, handleError, requireDebateOwner } from "@/lib/debates/http";
import { computeFinalScore, computeSpeakerScore, getWeights } from "@/lib/debates/scoring";
import { closeRound, getDebate, setFinalScore } from "@/lib/debates/store";

function getDefaultSpeakersScorePayload() {
  return {
    speakerA: {
      dimensions: {
        argumentQuality: 70,
        factualAccuracy: 65,
        rebuttalEffectiveness: 60,
        rhetoricDelivery: 66,
        topicConsistency: 72,
      },
      penalties: 0,
      bonuses: 0,
    },
    speakerB: {
      dimensions: {
        argumentQuality: 68,
        factualAccuracy: 67,
        rebuttalEffectiveness: 62,
        rhetoricDelivery: 64,
        topicConsistency: 70,
      },
      penalties: 0,
      bonuses: 0,
    },
  };
}

function scoreSpeakers({ speakers, weights }) {
  return Object.fromEntries(
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

      if (
        !Number.isFinite(penalties) ||
        penalties < 0 ||
        !Number.isFinite(bonuses) ||
        bonuses < 0
      ) {
        throw new Error("Invalid penalties/bonuses: values must be non-negative numbers");
      }

      const roundScore = computeSpeakerScore({
        dimensions: normalizedDimensions,
        penalties,
        bonuses,
        weights,
      });

      return [
        speakerId,
        {
          dimensions: normalizedDimensions,
          penalties,
          bonuses,
          roundScore,
        },
      ];
    })
  );
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const { debateId } = req.query;

    let debate = await getDebate(debateId);

    if (!(await requireDebateOwner(req, res, debate))) return;

    const confidenceFactor = Number(req.body?.confidenceFactor ?? 1);

    if (
      !Number.isFinite(confidenceFactor) ||
      confidenceFactor < 0.9 ||
      confidenceFactor > 1
    ) {
      return badRequest(res, "confidenceFactor must be a number between 0.9 and 1.0");
    }

    if (!debate.roundScores.length) {
      const roundToScore =
        (debate.rounds || []).find((round) => round.status !== "closed") ||
        (debate.rounds || [])[0];

      if (!roundToScore?.id) {
        return badRequest(res, "No round found to score");
      }

      const weights = getWeights(debate.format, debate.domain);
      const scoredSpeakers = scoreSpeakers({
        speakers: getDefaultSpeakersScorePayload(),
        weights,
      });

      await closeRound(debateId, roundToScore.id, {
        roundId: roundToScore.id,
        weights,
        speakers: scoredSpeakers,
        computedAt: new Date().toISOString(),
      });

      debate = await getDebate(debateId);
    }

    if (!debate.roundScores.length) {
      return badRequest(res, "No round scores recorded yet");
    }

    const finalScore = computeFinalScore({ debate, confidenceFactor });

    await setFinalScore(debateId, finalScore);

    return res.status(200).json({ finalScore });
  } catch (error) {
    if (
      error?.message?.startsWith("Invalid dimensions") ||
      error?.message?.startsWith("Invalid penalties/bonuses")
    ) {
      return badRequest(res, error.message);
    }

    return handleError(res, error);
  }
}
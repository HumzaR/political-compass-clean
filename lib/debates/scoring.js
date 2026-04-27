const WEIGHT_PRESETS = {
  long: {
    politics: { argumentQuality: 0.3, factualAccuracy: 0.3, rebuttalEffectiveness: 0.2, rhetoricDelivery: 0.1, topicConsistency: 0.1 },
    sports: { argumentQuality: 0.25, factualAccuracy: 0.2, rebuttalEffectiveness: 0.25, rhetoricDelivery: 0.2, topicConsistency: 0.1 },
    general: { argumentQuality: 0.25, factualAccuracy: 0.25, rebuttalEffectiveness: 0.2, rhetoricDelivery: 0.15, topicConsistency: 0.15 },
  },
  short: {
    politics: { argumentQuality: 0.2, factualAccuracy: 0.1, rebuttalEffectiveness: 0.3, rhetoricDelivery: 0.25, topicConsistency: 0.15 },
    sports: { argumentQuality: 0.2, factualAccuracy: 0.1, rebuttalEffectiveness: 0.3, rhetoricDelivery: 0.25, topicConsistency: 0.15 },
    general: { argumentQuality: 0.2, factualAccuracy: 0.1, rebuttalEffectiveness: 0.3, rhetoricDelivery: 0.25, topicConsistency: 0.15 },
  },
};

const clamp = (v) => Math.max(0, Math.min(100, v));

export function getWeights(format, domain) {
  const fmt = WEIGHT_PRESETS[format] || WEIGHT_PRESETS.short;
  return fmt[domain] || fmt.general;
}

export function computeSpeakerScore({ dimensions, penalties = 0, bonuses = 0, weights }) {
  const weighted =
    dimensions.argumentQuality * weights.argumentQuality +
    dimensions.factualAccuracy * weights.factualAccuracy +
    dimensions.rebuttalEffectiveness * weights.rebuttalEffectiveness +
    dimensions.rhetoricDelivery * weights.rhetoricDelivery +
    dimensions.topicConsistency * weights.topicConsistency;

  return clamp(weighted - penalties + bonuses);
}

export function computeFinalScore({ debate, confidenceFactor = 1 }) {
  const totals = {};
  debate.roundScores.forEach((round) => {
    Object.entries(round.speakers).forEach(([speakerId, payload]) => {
      totals[speakerId] = (totals[speakerId] || 0) + payload.roundScore;
    });
  });

  Object.keys(totals).forEach((id) => {
    totals[id] = clamp(totals[id] * confidenceFactor);
  });

  const leaderboard = Object.entries(totals)
    .map(([speakerId, score]) => ({ speakerId, score }))
    .sort((a, b) => b.score - a.score);

  return {
    confidenceFactor,
    leaderboard,
    winnerSpeakerId: leaderboard[0]?.speakerId || null,
    tie: leaderboard.length > 1 && leaderboard[0].score === leaderboard[1].score,
    computedAt: new Date().toISOString(),
  };
}

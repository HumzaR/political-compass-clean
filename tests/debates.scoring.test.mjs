import test from "node:test";
import assert from "node:assert/strict";

import { computeFinalScore, computeSpeakerScore, getWeights } from "../lib/debates/scoring.js";

test("getWeights returns domain-specific preset and falls back safely", () => {
  const politicsLong = getWeights("long", "politics");
  assert.equal(politicsLong.argumentQuality, 0.3);
  assert.equal(politicsLong.factualAccuracy, 0.3);

  const fallback = getWeights("unknown", "unknown");
  assert.equal(fallback.rebuttalEffectiveness, 0.3);
  assert.equal(fallback.factualAccuracy, 0.1);
});

test("computeSpeakerScore applies weights, penalties, bonuses, and clamps to 0-100", () => {
  const weights = getWeights("short", "general");
  const base = computeSpeakerScore({
    dimensions: {
      argumentQuality: 80,
      factualAccuracy: 80,
      rebuttalEffectiveness: 80,
      rhetoricDelivery: 80,
      topicConsistency: 80,
    },
    penalties: 0,
    bonuses: 0,
    weights,
  });
  assert.equal(base, 80);

  const clampedLow = computeSpeakerScore({
    dimensions: {
      argumentQuality: 10,
      factualAccuracy: 10,
      rebuttalEffectiveness: 10,
      rhetoricDelivery: 10,
      topicConsistency: 10,
    },
    penalties: 50,
    bonuses: 0,
    weights,
  });
  assert.equal(clampedLow, 0);

  const clampedHigh = computeSpeakerScore({
    dimensions: {
      argumentQuality: 100,
      factualAccuracy: 100,
      rebuttalEffectiveness: 100,
      rhetoricDelivery: 100,
      topicConsistency: 100,
    },
    penalties: 0,
    bonuses: 30,
    weights,
  });
  assert.equal(clampedHigh, 100);
});

test("computeFinalScore aggregates, applies confidence factor, and sets winner", () => {
  const debate = {
    roundScores: [
      {
        speakers: {
          alpha: { roundScore: 40 },
          beta: { roundScore: 30 },
        },
      },
      {
        speakers: {
          alpha: { roundScore: 30 },
          beta: { roundScore: 50 },
        },
      },
    ],
  };

  const result = computeFinalScore({ debate, confidenceFactor: 1 });
  assert.equal(result.winnerSpeakerId, "beta");
  assert.equal(result.tie, false);
  assert.deepEqual(result.leaderboard, [
    { speakerId: "beta", score: 80 },
    { speakerId: "alpha", score: 70 },
  ]);
});

test("computeFinalScore applies confidence factor and exposes tie state", () => {
  const debate = {
    roundScores: [
      {
        speakers: {
          alpha: { roundScore: 50 },
          beta: { roundScore: 50 },
        },
      },
      {
        speakers: {
          alpha: { roundScore: 30 },
          beta: { roundScore: 30 },
        },
      },
    ],
  };

  const result = computeFinalScore({ debate, confidenceFactor: 0.9 });
  assert.equal(result.tie, true);
  assert.equal(result.winnerSpeakerId, "alpha");
  assert.deepEqual(result.leaderboard, [
    { speakerId: "alpha", score: 72 },
    { speakerId: "beta", score: 72 },
  ]);
});

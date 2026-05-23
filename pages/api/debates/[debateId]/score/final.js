import { allowMethods, badRequest, handleError, requireDebateOwner } from "@/lib/debates/http";
import { getDebate, listTranscriptSegments, setFinalScore } from "@/lib/debates/store";

const DIMENSIONS = [
  "argumentQuality",
  "factualAccuracy",
  "rebuttalEffectiveness",
  "rhetoricDelivery",
  "topicConsistency",
];

const EVIDENCE_WORDS = [
  "because",
  "therefore",
  "evidence",
  "example",
  "data",
  "study",
  "research",
  "statistics",
  "statistic",
  "percent",
  "%",
  "according",
  "shows",
  "proves",
  "demonstrates",
];

const REBUTTAL_WORDS = [
  "but",
  "however",
  "although",
  "disagree",
  "respond",
  "response",
  "counter",
  "opponent",
  "you said",
  "that ignores",
  "that assumes",
  "not true",
];

function words(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9%£$.\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function sentences(text) {
  return String(text || "")
    .split(/[.!?]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function countMatches(text, terms) {
  const lower = String(text || "").toLowerCase();

  return terms.reduce((count, term) => {
    return lower.includes(term) ? count + 1 : count;
  }, 0);
}

function getTopicTerms(debate) {
  const source = `${debate.title || ""} ${debate.motionText || ""}`;
  const stopWords = new Set([
    "the",
    "and",
    "or",
    "a",
    "an",
    "to",
    "of",
    "in",
    "on",
    "for",
    "is",
    "are",
    "should",
    "we",
    "be",
    "it",
    "this",
    "that",
    "do",
    "does",
    "with",
  ]);

  return Array.from(new Set(words(source)))
    .filter((word) => word.length > 3)
    .filter((word) => !stopWords.has(word))
    .slice(0, 12);
}

function clamp0to100(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function scoreSpeakerFromTranscript({ speakerId, text, debate, opponentText }) {
  const wordList = words(text);
  const sentenceList = sentences(text);
  const wordCount = wordList.length;

  if (wordCount < 5) {
    return {
      speakerId,
      score: 0,
      dimensions: {
        argumentQuality: 0,
        factualAccuracy: 0,
        rebuttalEffectiveness: 0,
        rhetoricDelivery: 0,
        topicConsistency: 0,
      },
      wordCount,
      summary: "No meaningful speech was detected for this speaker.",
    };
  }

  const evidenceMatches = countMatches(text, EVIDENCE_WORDS);
  const rebuttalMatches = countMatches(text, REBUTTAL_WORDS);
  const topicTerms = getTopicTerms(debate);
  const topicMatches = topicTerms.filter((term) =>
    wordList.includes(term.toLowerCase())
  ).length;

  const avgSentenceLength = sentenceList.length
    ? wordCount / sentenceList.length
    : wordCount;

  const hasNumbers = /\d/.test(text);
  const hasOpponentSpeech = words(opponentText).length >= 5;

  const argumentQuality = clamp0to100(
    10 + Math.min(35, wordCount * 0.9) + Math.min(35, evidenceMatches * 9)
  );

  const factualAccuracy = clamp0to100(
    5 + Math.min(35, evidenceMatches * 10) + (hasNumbers ? 15 : 0)
  );

  const rebuttalEffectiveness = clamp0to100(
    hasOpponentSpeech
      ? 5 + Math.min(45, rebuttalMatches * 12) + Math.min(20, wordCount * 0.3)
      : Math.min(20, rebuttalMatches * 8)
  );

  const rhetoricDelivery = clamp0to100(
    10 +
      Math.min(35, sentenceList.length * 6) +
      (avgSentenceLength >= 6 && avgSentenceLength <= 28 ? 25 : 5)
  );

  const topicConsistency = clamp0to100(
    topicTerms.length
      ? 10 + Math.min(65, (topicMatches / topicTerms.length) * 100)
      : 45
  );

  const dimensions = {
    argumentQuality,
    factualAccuracy,
    rebuttalEffectiveness,
    rhetoricDelivery,
    topicConsistency,
  };

  const score = clamp0to100(
    argumentQuality * 0.3 +
      factualAccuracy * 0.2 +
      rebuttalEffectiveness * 0.2 +
      rhetoricDelivery * 0.15 +
      topicConsistency * 0.15
  );

  return {
    speakerId,
    score,
    dimensions,
    wordCount,
    summary: `Scored from ${wordCount} transcript words.`,
  };
}

function buildTranscriptText(segments, speakerId) {
  return (segments || [])
    .filter((segment) => segment.speakerUserId === speakerId)
    .map((segment) => segment.text)
    .join(" ")
    .trim();
}

function buildExplanation({ speakerAResult, speakerBResult, speakerAName, speakerBName, tie }) {
  const aScore = speakerAResult.score;
  const bScore = speakerBResult.score;

  if (aScore === 0 && bScore === 0) {
    return {
      winnerReason:
        "No winner was awarded because the transcript did not contain meaningful speech from either side.",
      loserReason:
        "Both speakers need to make clear arguments before the debate can be judged.",
    };
  }

  if (tie) {
    return {
      winnerReason:
        "The debate was marked as a draw because the final scores were too close to award a clear winner.",
      loserReason:
        "Both sides were relatively close. Stronger evidence, clearer rebuttals or more developed arguments would be needed to separate them.",
    };
  }

  const winner = aScore > bScore ? speakerAResult : speakerBResult;
  const loser = aScore > bScore ? speakerBResult : speakerAResult;

  const winnerName = winner.speakerId === "speakerA" ? speakerAName : speakerBName;
  const loserName = loser.speakerId === "speakerA" ? speakerAName : speakerBName;

  const dimensionGaps = DIMENSIONS.map((key) => ({
    key,
    gap: Number(winner.dimensions[key] || 0) - Number(loser.dimensions[key] || 0),
  })).sort((a, b) => b.gap - a.gap);

  const labelMap = {
    argumentQuality: "argument quality",
    factualAccuracy: "evidence usage",
    rebuttalEffectiveness: "rebuttal effectiveness",
    rhetoricDelivery: "clarity and delivery",
    topicConsistency: "staying on topic",
  };

  const strengths = dimensionGaps
    .filter((item) => item.gap > 0)
    .slice(0, 2)
    .map((item) => labelMap[item.key]);

  const weaknesses = strengths.length ? strengths : ["overall substance"];

  return {
    winnerReason: `${winnerName} won because their transcript showed stronger ${weaknesses.join(
      " and "
    )}.`,
    loserReason: `${loserName} fell behind on ${weaknesses.join(
      " and "
    )}. Their score can be improved by making clearer claims, using better evidence and directly responding to the opposing argument.`,
  };
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const { debateId } = req.query;

    const debate = await getDebate(debateId);

    if (!(await requireDebateOwner(req, res, debate))) return;

    const confidenceFactor = Number(req.body?.confidenceFactor ?? 1);

    if (
      !Number.isFinite(confidenceFactor) ||
      confidenceFactor < 0.9 ||
      confidenceFactor > 1
    ) {
      return badRequest(res, "confidenceFactor must be a number between 0.9 and 1.0");
    }

    const transcriptSegments = await listTranscriptSegments(debateId);

    const speakerAText = buildTranscriptText(transcriptSegments, "speakerA");
    const speakerBText = buildTranscriptText(transcriptSegments, "speakerB");

    const speakerAResult = scoreSpeakerFromTranscript({
      speakerId: "speakerA",
      text: speakerAText,
      debate,
      opponentText: speakerBText,
    });

    const speakerBResult = scoreSpeakerFromTranscript({
      speakerId: "speakerB",
      text: speakerBText,
      debate,
      opponentText: speakerAText,
    });

    const aScore = clamp0to100(speakerAResult.score * confidenceFactor);
    const bScore = clamp0to100(speakerBResult.score * confidenceFactor);

    speakerAResult.score = aScore;
    speakerBResult.score = bScore;

    const scoreDifference = Math.abs(aScore - bScore);
    const tie = scoreDifference <= 3 || (aScore < 10 && bScore < 10);

    const leaderboard = [
      { speakerId: "speakerA", score: aScore },
      { speakerId: "speakerB", score: bScore },
    ].sort((a, b) => b.score - a.score);

    const explanation = buildExplanation({
      speakerAResult,
      speakerBResult,
      speakerAName: "Speaker A",
      speakerBName: "Speaker B",
      tie,
    });

    const finalScore = {
      confidenceFactor,
      source: "daily_transcript",
      transcriptSegmentCount: transcriptSegments.length,
      transcriptWordCount: speakerAResult.wordCount + speakerBResult.wordCount,
      leaderboard,
      winnerSpeakerId: tie ? null : leaderboard[0]?.speakerId || null,
      tie,
      speakerBreakdown: {
        speakerA: speakerAResult,
        speakerB: speakerBResult,
      },
      explanation,
      computedAt: new Date().toISOString(),
    };

    await setFinalScore(debateId, finalScore);

    return res.status(200).json({ finalScore });
  } catch (error) {
    return handleError(res, error);
  }
}
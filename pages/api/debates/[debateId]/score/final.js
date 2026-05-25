import {
  allowMethods,
  badRequest,
  handleError,
  requireDebateOwner,
} from "@/lib/debates/http";
import { getDebate, listTranscriptSegments, setFinalScore } from "@/lib/debates/store";

const DIMENSIONS = [
  "argumentQuality",
  "factualAccuracy",
  "rebuttalEffectiveness",
  "rhetoricDelivery",
  "topicConsistency",
];

function clamp0to100(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function wordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildTranscriptText(segments, speakerId) {
  return (segments || [])
    .filter((segment) => segment.speakerUserId === speakerId)
    .map((segment) => segment.text)
    .join(" ")
    .trim();
}

function buildFullTranscript(segments) {
  return (segments || [])
    .map((segment, index) => {
      const speaker =
        segment.speakerUserId === "speakerA"
          ? "Speaker A"
          : segment.speakerUserId === "speakerB"
            ? "Speaker B"
            : "Unknown speaker";

      return `${index + 1}. ${speaker}: ${segment.text}`;
    })
    .join("\n");
}

function getZeroScoreFinal({ transcriptSegments }) {
  return {
    confidenceFactor: 1,
    source: "daily_transcript_no_speech",
    transcriptSegmentCount: transcriptSegments.length,
    transcriptWordCount: 0,
    leaderboard: [
      { speakerId: "speakerA", score: 0 },
      { speakerId: "speakerB", score: 0 },
    ],
    winnerSpeakerId: null,
    tie: true,
    speakerBreakdown: {
      speakerA: {
        speakerId: "speakerA",
        score: 0,
        dimensions: {
          argumentQuality: 0,
          factualAccuracy: 0,
          rebuttalEffectiveness: 0,
          rhetoricDelivery: 0,
          topicConsistency: 0,
        },
        wordCount: 0,
        strengths: [],
        weaknesses: ["No meaningful speech was detected."],
        evidenceQuotes: [],
        summary: "Speaker A did not provide enough speech to judge.",
      },
      speakerB: {
        speakerId: "speakerB",
        score: 0,
        dimensions: {
          argumentQuality: 0,
          factualAccuracy: 0,
          rebuttalEffectiveness: 0,
          rhetoricDelivery: 0,
          topicConsistency: 0,
        },
        wordCount: 0,
        strengths: [],
        weaknesses: ["No meaningful speech was detected."],
        evidenceQuotes: [],
        summary: "Speaker B did not provide enough speech to judge.",
      },
    },
    explanation: {
      winnerReason:
        "No winner was awarded because the transcript did not contain meaningful speech from either side.",
      loserReason:
        "Both speakers need to make clear arguments before the debate can be judged.",
    },
    computedAt: new Date().toISOString(),
  };
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  const pieces = [];

  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") {
        pieces.push(content.text);
      }
    }
  }

  return pieces.join("\n").trim();
}

function normaliseDimensionScores(dimensions) {
  const output = {};

  DIMENSIONS.forEach((key) => {
    output[key] = clamp0to100(dimensions?.[key]);
  });

  return output;
}

function normaliseJudgeResult({ judgeResult, speakerAWordCount, speakerBWordCount }) {
  const speakerA = judgeResult?.speakerA || {};
  const speakerB = judgeResult?.speakerB || {};

  const speakerAScore = clamp0to100(speakerA.totalScore);
  const speakerBScore = clamp0to100(speakerB.totalScore);

  const scoreDifference = Math.abs(speakerAScore - speakerBScore);

  const aiResult = judgeResult?.result;
  const tie =
    aiResult === "draw" ||
    scoreDifference <= 3 ||
    (speakerAScore < 10 && speakerBScore < 10);

  const leaderboard = [
    { speakerId: "speakerA", score: speakerAScore },
    { speakerId: "speakerB", score: speakerBScore },
  ].sort((a, b) => b.score - a.score);

  const winnerSpeakerId = tie
    ? null
    : aiResult === "speakerA" || aiResult === "speakerB"
      ? aiResult
      : leaderboard[0]?.speakerId || null;

  return {
    leaderboard,
    winnerSpeakerId,
    tie,
    speakerBreakdown: {
      speakerA: {
        speakerId: "speakerA",
        score: speakerAScore,
        dimensions: normaliseDimensionScores(speakerA.dimensions),
        wordCount: speakerAWordCount,
        strengths: Array.isArray(speakerA.strengths) ? speakerA.strengths : [],
        weaknesses: Array.isArray(speakerA.weaknesses) ? speakerA.weaknesses : [],
        evidenceQuotes: Array.isArray(speakerA.evidenceQuotes)
          ? speakerA.evidenceQuotes
          : [],
        summary: speakerA.summary || "No summary provided.",
      },
      speakerB: {
        speakerId: "speakerB",
        score: speakerBScore,
        dimensions: normaliseDimensionScores(speakerB.dimensions),
        wordCount: speakerBWordCount,
        strengths: Array.isArray(speakerB.strengths) ? speakerB.strengths : [],
        weaknesses: Array.isArray(speakerB.weaknesses) ? speakerB.weaknesses : [],
        evidenceQuotes: Array.isArray(speakerB.evidenceQuotes)
          ? speakerB.evidenceQuotes
          : [],
        summary: speakerB.summary || "No summary provided.",
      },
    },
    explanation: {
      winnerReason:
        judgeResult?.explanation?.winnerReason ||
        "The result was selected based on the transcript.",
      loserReason:
        judgeResult?.explanation?.loserReason ||
        "The weaker side scored lower across the judging criteria.",
    },
  };
}

async function judgeWithOpenAI({ debate, transcriptSegments, speakerAText, speakerBText }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const model = process.env.OPENAI_JUDGE_MODEL || "gpt-5.5";

  const fullTranscript = buildFullTranscript(transcriptSegments);

  const payload = {
    model,
    input: [
      {
        role: "system",
        content:
          "You are an impartial debate judge. Judge only from the provided transcript. Do not invent claims, evidence, facts or arguments that are not in the transcript. Low-quality debates should receive low scores. Silence or meaningless speech should score close to 0. A draw is allowed. Only award a winner when the transcript clearly supports it.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            debate: {
              title: debate.title || "",
              motionText: debate.motionText || "",
              format: debate.format || "",
              domain: debate.domain || "",
            },
            judgingRules: {
              scoresOutOf100: true,
              allowDraw: true,
              lowScoresAllowed: true,
              noTranscriptMeansZeroScore: true,
              dimensions: {
                argumentQuality:
                  "Clear claims, logical reasoning, developed arguments and structure.",
                factualAccuracy:
                  "Use of facts, examples, evidence and avoiding unsupported assertions.",
                rebuttalEffectiveness:
                  "Directly answering or challenging the opposing side.",
                rhetoricDelivery:
                  "Clarity, persuasiveness, confidence and coherence.",
                topicConsistency:
                  "Staying relevant to the motion and not drifting off topic.",
              },
            },
            transcript: fullTranscript,
            speakerAText,
            speakerBText,
          },
          null,
          2
        ),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "debate_judgement",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            result: {
              type: "string",
              enum: ["speakerA", "speakerB", "draw"],
            },
            speakerA: {
              type: "object",
              additionalProperties: false,
              properties: {
                totalScore: { type: "number" },
                dimensions: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    argumentQuality: { type: "number" },
                    factualAccuracy: { type: "number" },
                    rebuttalEffectiveness: { type: "number" },
                    rhetoricDelivery: { type: "number" },
                    topicConsistency: { type: "number" },
                  },
                  required: [
                    "argumentQuality",
                    "factualAccuracy",
                    "rebuttalEffectiveness",
                    "rhetoricDelivery",
                    "topicConsistency",
                  ],
                },
                strengths: {
                  type: "array",
                  items: { type: "string" },
                },
                weaknesses: {
                  type: "array",
                  items: { type: "string" },
                },
                evidenceQuotes: {
                  type: "array",
                  items: { type: "string" },
                },
                summary: { type: "string" },
              },
              required: [
                "totalScore",
                "dimensions",
                "strengths",
                "weaknesses",
                "evidenceQuotes",
                "summary",
              ],
            },
            speakerB: {
              type: "object",
              additionalProperties: false,
              properties: {
                totalScore: { type: "number" },
                dimensions: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    argumentQuality: { type: "number" },
                    factualAccuracy: { type: "number" },
                    rebuttalEffectiveness: { type: "number" },
                    rhetoricDelivery: { type: "number" },
                    topicConsistency: { type: "number" },
                  },
                  required: [
                    "argumentQuality",
                    "factualAccuracy",
                    "rebuttalEffectiveness",
                    "rhetoricDelivery",
                    "topicConsistency",
                  ],
                },
                strengths: {
                  type: "array",
                  items: { type: "string" },
                },
                weaknesses: {
                  type: "array",
                  items: { type: "string" },
                },
                evidenceQuotes: {
                  type: "array",
                  items: { type: "string" },
                },
                summary: { type: "string" },
              },
              required: [
                "totalScore",
                "dimensions",
                "strengths",
                "weaknesses",
                "evidenceQuotes",
                "summary",
              ],
            },
            explanation: {
              type: "object",
              additionalProperties: false,
              properties: {
                winnerReason: { type: "string" },
                loserReason: { type: "string" },
              },
              required: ["winnerReason", "loserReason"],
            },
          },
          required: ["result", "speakerA", "speakerB", "explanation"],
        },
      },
    },
    max_output_tokens: 1800,
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `OpenAI judging failed with status ${response.status}`
    );
  }

  const text = extractResponseText(data);

  if (!text) {
    throw new Error("OpenAI judging returned an empty response.");
  }

  return JSON.parse(text);
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

    const speakerAWordCount = wordCount(speakerAText);
    const speakerBWordCount = wordCount(speakerBText);
    const totalWordCount = speakerAWordCount + speakerBWordCount;

    if (totalWordCount < 5) {
      const finalScore = getZeroScoreFinal({ transcriptSegments });
      await setFinalScore(debateId, finalScore);
      return res.status(200).json({ finalScore });
    }

    const judgeResult = await judgeWithOpenAI({
      debate,
      transcriptSegments,
      speakerAText,
      speakerBText,
    });

    const normalised = normaliseJudgeResult({
      judgeResult,
      speakerAWordCount,
      speakerBWordCount,
    });

    const adjustedLeaderboard = normalised.leaderboard
      .map((entry) => ({
        ...entry,
        score: clamp0to100(entry.score * confidenceFactor),
      }))
      .sort((a, b) => b.score - a.score);

    const adjustedSpeakerBreakdown = {
      speakerA: {
        ...normalised.speakerBreakdown.speakerA,
        score: clamp0to100(
          normalised.speakerBreakdown.speakerA.score * confidenceFactor
        ),
      },
      speakerB: {
        ...normalised.speakerBreakdown.speakerB,
        score: clamp0to100(
          normalised.speakerBreakdown.speakerB.score * confidenceFactor
        ),
      },
    };

    const adjustedDifference = Math.abs(
      adjustedSpeakerBreakdown.speakerA.score -
        adjustedSpeakerBreakdown.speakerB.score
    );

    const tie =
      normalised.tie ||
      adjustedDifference <= 3 ||
      (adjustedSpeakerBreakdown.speakerA.score < 10 &&
        adjustedSpeakerBreakdown.speakerB.score < 10);

    const finalScore = {
      confidenceFactor,
      source: "openai_transcript_judge",
      judgeModel: process.env.OPENAI_JUDGE_MODEL || "gpt-5.5",
      transcriptSegmentCount: transcriptSegments.length,
      transcriptWordCount: totalWordCount,
      leaderboard: adjustedLeaderboard,
      winnerSpeakerId: tie ? null : adjustedLeaderboard[0]?.speakerId || null,
      tie,
      speakerBreakdown: adjustedSpeakerBreakdown,
      explanation: normalised.explanation,
      computedAt: new Date().toISOString(),
    };

    await setFinalScore(debateId, finalScore);

    return res.status(200).json({ finalScore });
  } catch (error) {
    return handleError(res, error);
  }
}
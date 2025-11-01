// src/lib/parties.ts
import { computeAxisScores, topDrivers } from "@/lib/scoring";

export type Axis = "economic" | "social";

export type Party = {
  id: string;
  name: string;
  country: "UK" | "USA";
  // Party positions on the same scale as user axis scores: [-100..100]
  position: { economic: number; social: number };
  blurb?: string;
};

export type Question = {
  id: string;
  axis: Axis;
  direction: -1 | 1;
  title?: string;
  text?: string;
  prompt?: string;
};

export type AnswerMap = Record<string, number>;

export const PARTIES: Party[] = [
  // UK
  {
    id: "uk-conservative",
    name: "Conservative Party",
    country: "UK",
    position: { economic: 60, social: 40 },
    blurb: "Right-leaning on economy, moderately authoritarian on social policy.",
  },
  {
    id: "uk-labour",
    name: "Labour Party",
    country: "UK",
    position: { economic: -40, social: 10 },
    blurb: "Left-leaning on economy, mild authority/social regulation.",
  },
  {
    id: "uk-libdem",
    name: "Liberal Democrats",
    country: "UK",
    position: { economic: 10, social: -10 },
    blurb: "Centrist economics, socially liberal.",
  },
  {
    id: "uk-green",
    name: "Green Party",
    country: "UK",
    position: { economic: -60, social: -40 },
    blurb: "Progressive economics, socially libertarian/green priorities.",
  },
  {
    id: "uk-reform",
    name: "Reform UK",
    country: "UK",
    position: { economic: 50, social: 60 },
    blurb: "Right-leaning economics and socially authoritarian.",
  },
  {
    id: "uk-snp",
    name: "Scottish National Party (SNP)",
    country: "UK",
    position: { economic: -30, social: -5 },
    blurb: "Left-of-centre economics, socially liberal.",
  },

  // USA
  {
    id: "us-republican",
    name: "Republican Party",
    country: "USA",
    position: { economic: 60, social: 50 },
    blurb: "Right-leaning on economy and socially conservative/authoritarian.",
  },
  {
    id: "us-democratic",
    name: "Democratic Party",
    country: "USA",
    position: { economic: -10, social: 10 },
    blurb: "Centre-left economics, moderate social regulation.",
  },
  {
    id: "us-libertarian",
    name: "Libertarian Party",
    country: "USA",
    position: { economic: 40, social: -60 },
    blurb: "Free-market economics and strongly socially libertarian.",
  },
  {
    id: "us-green",
    name: "Green Party (US)",
    country: "USA",
    position: { economic: -60, social: -40 },
    blurb: "Left/progressive economics and socially libertarian.",
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function euclidean(a: { economic: number; social: number }, b: { economic: number; social: number }) {
  const dx = a.economic - b.economic;
  const dy = a.social - b.social;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Convert 2D distance on [-100..100] axes to a match percentage.
 * 0 distance => 100% match, max distance (~282.84) => 0% match.
 */
function distanceToPercent(distance: number) {
  const MAX = Math.sqrt(200 * 200 + 200 * 200); // ~282.8427
  const pct = 100 - (distance / MAX) * 100;
  return clamp(Math.round(pct), 0, 100);
}

/**
 * Generate simple, human-friendly reasons based on axis proximity + top drivers.
 */
function reasonsForParty(
  userAxis: { economic: number; social: number },
  party: Party,
  answers: AnswerMap,
  QUESTIONS: Question[]
): string[] {
  const reasons: string[] = [];

  // Axis proximity reasons
  const econDiff = Math.abs(userAxis.economic - party.position.economic);
  const socDiff = Math.abs(userAxis.social - party.position.social);

  const econClose = econDiff <= 25;
  const socClose = socDiff <= 25;

  if (econClose) {
    reasons.push(
      userAxis.economic >= 0
        ? "Your economic answers lean market-friendly, similar to this party’s stance."
        : "Your economic answers lean equality/redistribution, similar to this party’s stance."
    );
  }
  if (socClose) {
    reasons.push(
      userAxis.social >= 0
        ? "Your social answers lean towards authority/order, which aligns with this party."
        : "Your social answers lean libertarian/civil-liberties, which aligns with this party."
    );
  }

  // If neither axis is "close", still offer one directional reason each
  if (!econClose) {
    reasons.push(
      userAxis.economic >= party.position.economic
        ? "You are more pro-market than this party."
        : "You favour more redistribution/regulation than this party."
    );
  }
  if (!socClose) {
    reasons.push(
      userAxis.social >= party.position.social
        ? "You prefer more social order/authority than this party."
        : "You prefer more personal liberty/civil rights than this party."
    );
  }

  // Add 1–2 question-level drivers that point in the same overall directions as the party
  // Heuristic: pick top drivers and keep those whose axis sign roughly matches party sign.
  const drivers = topDrivers(answers, QUESTIONS, 6);
  const aligned: string[] = [];
  for (const d of drivers) {
    if (aligned.length >= 2) break;
    const partySign = party.position[d.axis] >= 0 ? 1 : -1;
    // We don't have the signed pull in the returned driver, but "impact" is abs.
    // Approximate: consider the user's axis sign to choose relevant axis driver labels.
    const userSign = userAxis[d.axis] >= 0 ? 1 : -1;
    if (userSign === partySign) {
      aligned.push(`Your answer on “${d.key}” supports similar ${d.axis} priorities.`);
    }
  }
  reasons.push(...aligned);

  // Deduplicate and cap
  return Array.from(new Set(reasons)).slice(0, 4);
}

export function computePartyMatches(
  country: "UK" | "USA",
  answers: AnswerMap,
  QUESTIONS: Question[]
): Array<{
  party: Party;
  matchPercent: number;
  reasons: string[];
}> {
  const userAxis = computeAxisScores(answers, QUESTIONS);
  const candidates = PARTIES.filter((p) => p.country === country);

  const ranked = candidates
    .map((party) => {
      const distance = euclidean(userAxis, party.position);
      const matchPercent = distanceToPercent(distance);
      const reasons = reasonsForParty(userAxis, party, answers, QUESTIONS);
      return { party, matchPercent, reasons };
    })
    .sort((a, b) => b.matchPercent - a.matchPercent);

  return ranked;
}

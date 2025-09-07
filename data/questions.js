// data/questions.js
//
// Direction convention:
//  - economic: -1 = left / pro-redistribution / regulation, +1 = right / market-led
//  - social:   -1 = libertarian / civil liberties,         +1 = authoritarian / order-first
//  - global:   -1 = globalist / intl cooperation,          +1 = nationalist / sovereignty-first
//  - progress: -1 = progressive / innovation,              +1 = conservative / tradition
//
// Type:
//  - "scale" (1..5)  → 1=Strongly Disagree ... 5=Strongly Agree
//  - "yesno"         → "Yes" maps to 5, "No" maps to 1 (internally treated as scale)
//
// Weight: default 1 unless specified.
//
// Core = first 20 (10 economic, 10 social)
// Advanced = next 20 (5 economic nuance, 5 social nuance, 5 global, 5 progress)

const questions = [
  // ===== CORE: ECONOMIC (10) =====
  {
    id: 1,
    text: "Taxes on the wealthy should be increased to support public services.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: -1,
  },
  {
    id: 2,
    text: "Free markets generally produce better outcomes than government planning.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: +1,
  },
  {
    id: 3,
    text: "Workers benefit when trade unions have strong influence.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: -1,
  },
  {
    id: 4,
    text: "Government should ensure basic necessities (healthcare, housing, food) for all citizens.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: -1,
  },
  {
    id: 5,
    text: "Large corporations have too much power in society.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: -1,
  },
  {
    id: 6,
    text: "Public transport should be funded even if it doesn’t make a profit.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: -1,
  },
  {
    id: 7,
    text: "A universal basic income would do more harm than good.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: +1,
  },
  {
    id: 8,
    text: "Privatization of industries (e.g., rail, energy) improves efficiency.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: +1,
  },
  {
    id: 9,
    text: "Welfare programs make people overly dependent on the state.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: +1,
  },
  {
    id: 10,
    text: "Free trade agreements benefit the economy more than they harm workers.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: +1,
  },

  // ===== CORE: SOCIAL (10) =====
  {
    id: 11,
    text: "Law and order must be maintained even if civil liberties are restricted.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: +1,
  },
  {
    id: 12,
    text: "Freedom of speech should include the right to offend.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: -1,
  },
  {
    id: 13,
    text: "Society should accept more cultural diversity.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: -1,
  },
  {
    id: 14,
    text: "The death penalty should be legal for severe crimes.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: +1,
  },
  {
    id: 15,
    text: "Governments should have the right to monitor digital communications for security.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: +1,
  },
  {
    id: 16,
    text: "Religion should play a role in public life.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: +1,
  },
  {
    id: 17,
    text: "Drug use should be legalized or decriminalized.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: -1,
  },
  {
    id: 18,
    text: "People should be free to live their lives without government interference in private matters.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: -1,
  },
  {
    id: 19,
    text: "Respect for authority is essential for a stable society.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: +1,
  },
  {
    id: 20,
    text: "Same-sex marriage should be recognized by the state.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: -1,
  },

  // ===== ADVANCED: ECONOMIC NUANCE (5) =====
  {
    id: 21,
    text: "In times of crisis, governments should nationalize failing industries.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: -1,
  },
  {
    id: 22,
    text: "Wealth inequality is the biggest problem facing society.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: -1,
  },
  {
    id: 23,
    text: "Inheritance should be heavily taxed.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: -1,
  },
  {
    id: 24,
    text: "International institutions (IMF, World Bank) do more harm than good.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: +1,
  },
  {
    id: 25,
    text: "Corporations should be legally required to prioritize environmental goals over profits.",
    type: "scale",
    axis: "economic",
    weight: 1,
    direction: -1,
  },

  // ===== ADVANCED: SOCIAL NUANCE (5) =====
  {
    id: 26,
    text: "Gender roles are largely a social construct.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: -1,
  },
  {
    id: 27,
    text: "People should be able to change their legal gender without restrictions.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: -1,
  },
  {
    id: 28,
    text: "Hate speech should be a criminal offense.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: +1,
  },
  {
    id: 29,
    text: "Parents should have the right to homeschool children without regulation.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: +1,
  },
  {
    id: 30,
    text: "Tradition and national culture should be preserved, even at the cost of progress.",
    type: "scale",
    axis: "social",
    weight: 1,
    direction: +1,
  },

  // ===== ADVANCED: GLOBAL vs NATIONAL (5) =====
  {
    id: 31,
    text: "Immigration strengthens a country’s culture.",
    type: "scale",
    axis: "global",
    weight: 1,
    direction: -1,
  },
  {
    id: 32,
    text: "Nations should prioritize their own citizens over international cooperation.",
    type: "scale",
    axis: "global",
    weight: 1,
    direction: +1,
  },
  {
    id: 33,
    text: "Military intervention is justified to protect human rights abroad.",
    type: "scale",
    axis: "global",
    weight: 1,
    direction: +1,
  },
  {
    id: 34,
    text: "Global challenges like climate change require surrendering some national sovereignty.",
    type: "scale",
    axis: "global",
    weight: 1,
    direction: -1,
  },
  {
    id: 35,
    text: "Borders should be more open for trade and migration.",
    type: "scale",
    axis: "global",
    weight: 1,
    direction: -1,
  },

  // ===== ADVANCED: PROGRESSIVE vs CONSERVATIVE (5) =====
  {
    id: 36,
    text: "Climate change requires urgent government intervention.",
    type: "scale",
    axis: "progress",
    weight: 1,
    direction: -1,
  },
  {
    id: 37,
    text: "Technology companies should be tightly regulated.",
    type: "scale",
    axis: "progress",
    weight: 1,
    direction: -1,
  },
  {
    id: 38,
    text: "Society benefits more from innovation than tradition.",
    type: "scale",
    axis: "progress",
    weight: 1,
    direction: -1,
  },
  {
    id: 39,
    text: "Genetic engineering in humans should be permitted if safe.",
    type: "scale",
    axis: "progress",
    weight: 1,
    direction: -1,
  },
  {
    id: 40,
    text: "Preserving traditional family structures is essential to societal stability.",
    type: "scale",
    axis: "progress",
    weight: 1,
    direction: +1,
  },
];

export default questions;

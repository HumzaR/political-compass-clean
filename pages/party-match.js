import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnswers } from "@/lib/answers";
import { computeAxisScores } from "@/lib/scoring";
import { CheckCircle2, XCircle, MinusCircle, TrendingUp, Globe } from "lucide-react";

// ---- Data (countries & parties) ----

const countries = [
  {
    id: "uk",
    name: "United Kingdom",
    flag: "🇬🇧",
    parties: [
      {
        id: "labour",
        name: "Labour Party",
        shortName: "Labour",
        color: "#E4003B",
        economic: -3.5,
        social: 2.0,
        description: "Centre-left party supporting social democracy and workers' rights.",
      },
      {
        id: "conservative",
        name: "Conservative Party",
        shortName: "Conservatives",
        color: "#0087DC",
        economic: 5.0,
        social: -2.5,
        description: "Centre-right party supporting free markets and traditional values.",
      },
      {
        id: "libdem",
        name: "Liberal Democrats",
        shortName: "Lib Dems",
        color: "#FAA61A",
        economic: 1.0,
        social: 5.5,
        description: "Centrist party supporting social liberalism and civil liberties.",
      },
      {
        id: "green",
        name: "Green Party",
        shortName: "Greens",
        color: "#6AB023",
        economic: -6.0,
        social: 6.5,
        description: "Left-wing party focused on environmentalism and social justice.",
      },
      {
        id: "reform",
        name: "Reform UK",
        shortName: "Reform",
        color: "#12B6CF",
        economic: 7.5,
        social: -1.0,
        description: "Right-wing populist party supporting Brexit and economic freedom.",
      },
    ],
  },
  {
    id: "usa",
    name: "United States",
    flag: "🇺🇸",
    parties: [
      {
        id: "democrat",
        name: "Democratic Party",
        shortName: "Democrats",
        color: "#0015BC",
        economic: -2.0,
        social: 3.5,
        description: "Centre-left party supporting progressive taxation and social programs.",
      },
      {
        id: "republican",
        name: "Republican Party",
        shortName: "Republicans",
        color: "#E81B23",
        economic: 6.5,
        social: -3.0,
        description: "Centre-right party supporting free markets and traditional values.",
      },
      {
        id: "libertarian",
        name: "Libertarian Party",
        shortName: "Libertarians",
        color: "#FED105",
        economic: 8.0,
        social: 7.0,
        description: "Party supporting maximum individual freedom and minimal government.",
      },
      {
        id: "green-us",
        name: "Green Party",
        shortName: "Greens",
        color: "#17aa5c",
        economic: -7.0,
        social: 6.0,
        description: "Left-wing party focused on environmentalism and grassroots democracy.",
      },
    ],
  },
];

// ---- Helpers ----

// Your app’s axis scores are on roughly -100..+100, parties are on -10..+10.
// We normalise the user scores down to -10..+10 so they’re comparable.
function useUserAxis() {
  const ctx = useAnswers && useAnswers();
  const answers = ctx?.answers || {};

  const scores = useMemo(() => computeAxisScores(answers), [answers]);

  const hasAnyAnswer = Object.keys(answers || {}).length > 0;

  const econ = (scores?.economic ?? 0) / 10; // -10..+10
  const soc = (scores?.social ?? 0) / 10;    // -10..+10

  return { hasAnyAnswer, economic: econ, social: soc };
}

// Alignment percentage based on distance in 2D space
function calculateAlignment(userEconomic, userSocial, party) {
  const economicDiff = Math.abs(userEconomic - party.economic);
  const socialDiff = Math.abs(userSocial - party.social);

  const distance = Math.sqrt(economicDiff ** 2 + socialDiff ** 2);
  const maxDistance = Math.sqrt(20 ** 2 + 20 ** 2); // max distance on -10..+10 square

  const alignment = ((maxDistance - distance) / maxDistance) * 100;
  return Math.max(0, Math.min(100, alignment));
}

function getMatchStrength(alignment) {
  if (alignment > 70) return { label: "Strong match", tone: "strong" };
  if (alignment > 50) return { label: "Moderate match", tone: "mid" };
  return { label: "Weak match", tone: "weak" };
}

// Compare user vs party and generate explanation bullets
function getAlignmentReasons(userEconomic, userSocial, party) {
  const reasons = [];
  const economicDiff = userEconomic - party.economic;
  const socialDiff = userSocial - party.social;

  // ECONOMIC
  if (Math.abs(economicDiff) < 1.5) {
    reasons.push({
      type: "agreement",
      category: "Economic",
      icon: CheckCircle2,
      text:
        "Your answers place you very close to this party on questions about taxes, welfare, and how actively the government should manage the economy.",
    });
  } else if (Math.abs(economicDiff) < 4) {
    reasons.push({
      type: "partial",
      category: "Economic",
      icon: MinusCircle,
      text:
        `You share broad economic instincts but not all details. You lean ${economicDiff > 0 ? "a bit more market-oriented" : "a bit more redistribution-oriented"} than this party’s typical platform.`,
    });
  } else {
    reasons.push({
      type: "disagreement",
      category: "Economic",
      icon: XCircle,
      text:
        `Your answers suggest a different economic philosophy. Compared to this party, you are about ${Math.abs(economicDiff).toFixed(
          1
        )} points ${economicDiff > 0 ? "more pro-market and low-tax" : "more supportive of higher taxes and public services"}.`,
    });
  }

  // SOCIAL
  if (Math.abs(socialDiff) < 1.5) {
    reasons.push({
      type: "agreement",
      category: "Social",
      icon: CheckCircle2,
      text:
        "You give similar answers on civil liberties, policing, and questions about personal freedom vs social order.",
    });
  } else if (Math.abs(socialDiff) < 4) {
    reasons.push({
      type: "partial",
      category: "Social",
      icon: MinusCircle,
      text:
        `You overlap on some social issues but not all. You lean ${socialDiff > 0 ? "more libertarian (individual freedom first)" : "more authoritarian (order and tradition first)"} than this party overall.`,
    });
  } else {
    reasons.push({
      type: "disagreement",
      category: "Social",
      icon: XCircle,
      text:
        `Your answers point to a different social philosophy. You are about ${Math.abs(socialDiff).toFixed(
          1
        )} points ${socialDiff > 0 ? "more libertarian" : "more authoritarian"} than this party on issues like speech, protest, and state power.`,
    });
  }

  // OVERALL
  const alignment = calculateAlignment(userEconomic, userSocial, party);
  const baseText =
    alignment > 80
      ? "This party is a very close overall fit. If you read their manifesto, you’d likely recognise many of your own priorities in it."
      : alignment > 60
      ? "There’s substantial overlap between your answers and this party’s general manifesto themes, even though you’d still disagree on some signatures policies."
      : alignment > 40
      ? "You share some headline values with this party, but their policy mix would often pull in a different direction than your answers suggest."
      : "Your answers point to a different overall project. You may occasionally agree on single issues, but the core direction of this party diverges from your own.";

  reasons.push({
    type: alignment > 60 ? (alignment > 80 ? "agreement" : "partial") : "disagreement",
    category: "Overall",
    icon: TrendingUp,
    text: baseText,
  });

  return reasons;
}

// Axis comparison bar with TWO markers (user + party), vertically separated so they never overlap.
function AxisCompareBar({ axisLabel, negLabel, posLabel, userValue, partyValue, partyColor }) {
  // clamp to [-10, 10]
  const clamp = (v) => Math.max(-10, Math.min(10, v));
  const userClamped = clamp(userValue);
  const partyClamped = clamp(partyValue);

  // convert to 0–100%
  const toPct = (v) => ((v + 10) / 20) * 100;
  const userPct = toPct(userClamped);
  const partyPct = toPct(partyClamped);

  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-medium text-gray-900">{axisLabel}</div>
        <div className="text-[11px] text-gray-500">
          Scale: <span className="font-mono">-10</span> to <span className="font-mono">+10</span>
        </div>
      </div>
      <div className="relative h-14">
        {/* Base line */}
        <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-gray-200" />
        {/* Labels at ends */}
        <div className="absolute left-0 top-0 text-[11px] text-gray-500">{negLabel}</div>
        <div className="absolute right-0 top-0 text-[11px] text-gray-500 text-right">{posLabel}</div>

        {/* User marker (above line) */}
        <div
          className="absolute -translate-x-1/2"
          style={{ left: `${userPct}%`, top: "22%" }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px]">
              You
            </div>
            <div className="w-3 h-3 rounded-full bg-indigo-500 shadow" />
          </div>
        </div>

        {/* Party marker (below line) */}
        <div
          className="absolute -translate-x-1/2"
          style={{ left: `${partyPct}%`, top: "62%" }}
        >
          <div className="flex flex-col items-center gap-1">
            <div
              className="px-1.5 py-0.5 rounded-full text-[10px] text-white"
              style={{ backgroundColor: partyColor }}
            >
              Party
            </div>
            <div className="w-3 h-3 rounded-full shadow" style={{ backgroundColor: partyColor }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Page Component ----

export default function PartyMatchPage() {
  const { hasAnyAnswer, economic, social } = useUserAxis();
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);

  const selectedCountry = countries.find((c) => c.id === selectedCountryId) || null;

  const sortedParties = useMemo(() => {
    if (!selectedCountry) return [];
    return selectedCountry.parties
      .map((party) => ({
        ...party,
        alignment: calculateAlignment(economic, social, party),
      }))
      .sort((a, b) => b.alignment - a.alignment);
  }, [selectedCountry, economic, social]);

  if (!hasAnyAnswer) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Party match</h1>
          <Link href="/profile" className="text-sm text-indigo-600 hover:underline">
            ← Back to profile
          </Link>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-gray-800">
            You’ll need quiz results before we can compare you to political parties.{" "}
            <Link href="/quiz" className="text-indigo-600 underline">
              Take the quiz
            </Link>{" "}
            to unlock party matching.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Party match
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            See how your political position compares to major parties.
          </p>
        </div>
        <Link href="/profile" className="text-sm text-indigo-600 hover:underline">
          ← Back to profile
        </Link>
      </div>

      {/* Country selection */}
      {!selectedCountry && (
        <motion.div
          className="grid md:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {countries.map((country, index) => (
            <motion.button
              key={country.id}
              type="button"
              onClick={() => {
                setSelectedCountryId(country.id);
                setSelectedParty(null);
              }}
              className="relative w-full text-left rounded-2xl border border-gray-200 bg-white/80 shadow-sm hover:shadow-md px-5 py-4 flex flex-col gap-3 transition"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <div className="flex items-center gap-3">
                <div className="text-4xl">{country.flag}</div>
                <div>
                  <div className="font-semibold">{country.name}</div>
                  <div className="text-xs text-gray-500">
                    Compare with {country.parties.length} major parties
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {country.parties.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[11px]"
                    style={{ borderColor: p.color, color: p.color }}
                  >
                    {p.shortName}
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Party grid + details */}
      <AnimatePresence mode="wait">
        {selectedCountry && (
          <motion.div
            key={selectedCountry.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 space-y-6"
          >
            {/* Country header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{selectedCountry.flag}</div>
                <div>
                  <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {selectedCountry.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Click a party card to see detailed alignment.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCountryId(null);
                  setSelectedParty(null);
                }}
                className="px-3 py-1.5 rounded-full border border-gray-300 bg-white text-sm hover:bg-gray-50"
              >
                Change country
              </button>
            </div>

            {/* Party cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedParties.map((party, index) => {
                const strength = getMatchStrength(party.alignment);
                return (
                  <motion.button
                    key={party.id}
                    type="button"
                    onClick={() => setSelectedParty(party)}
                    className="relative text-left rounded-2xl border border-gray-200 bg-white/80 hover:bg-white shadow-sm hover:shadow-md px-4 py-4 flex flex-col gap-3 transition group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    {/* Top color bar */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                      style={{ backgroundColor: party.color }}
                    />
                    <div className="flex items-start justify-between gap-3 mt-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: party.color }}
                          />
                          <div className="font-semibold text-sm">{party.name}</div>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{party.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center mt-2">
                      <div className="text-center">
                        <div
                          className="text-2xl font-bold"
                          style={{ color: party.color }}
                        >
                          {party.alignment.toFixed(0)}%
                        </div>
                        <div className="text-[11px] text-gray-500 uppercase tracking-wide">
                          Match
                        </div>
                        <div className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border border-gray-200 bg-gray-50">
                          {strength.label}
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-[11px] text-indigo-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to see why →
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Details panel for selected party */}
            {selectedParty && (
              <motion.div
                key={selectedParty.id}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 25 }}
                className="mt-4 rounded-2xl border border-gray-200 bg-white/90 shadow-sm p-5"
              >
                <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedParty.color }}
                      />
                      <h3 className="text-lg font-semibold">{selectedParty.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{selectedParty.description}</p>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-2xl font-bold"
                      style={{ color: selectedParty.color }}
                    >
                      {selectedParty.alignment.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">Overall match</div>
                    <div className="mt-1 inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[11px] bg-gray-50">
                      {getMatchStrength(selectedParty.alignment).label}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Economic axis</h4>
                    <AxisCompareBar
                      axisLabel="Economic (Left ↔ Right)"
                      negLabel="Economic Left"
                      posLabel="Economic Right"
                      userValue={economic}
                      partyValue={selectedParty.economic}
                      partyColor={selectedParty.color}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Social axis</h4>
                    <AxisCompareBar
                      axisLabel="Social (Libertarian ↔ Authoritarian)"
                      negLabel="Libertarian"
                      posLabel="Authoritarian"
                      userValue={social}
                      partyValue={selectedParty.social}
                      partyColor={selectedParty.color}
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 mt-4 pt-4">
                  <h4 className="text-sm font-semibold mb-3">Why this alignment?</h4>
                  <div className="space-y-3">
                    {getAlignmentReasons(economic, social, selectedParty).map(
                      (reason, idx) => {
                        const Icon = reason.icon;
                        const tone =
                          reason.type === "agreement"
                            ? "bg-emerald-50 border-emerald-200"
                            : reason.type === "partial"
                            ? "bg-amber-50 border-amber-200"
                            : "bg-rose-50 border-rose-200";
                        return (
                          <div
                            key={idx}
                            className={`flex gap-3 rounded-xl border px-3 py-2.5 ${tone}`}
                          >
                            <div className="mt-0.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm">
                                <Icon className="w-4 h-4 text-gray-700" />
                              </div>
                            </div>
                            <div className="text-sm">
                              <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-0.5">
                                {reason.category}
                              </div>
                              <div className="text-gray-800 text-[13px] leading-snug">
                                {reason.text}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

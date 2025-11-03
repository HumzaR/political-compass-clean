// pages/party-match.js
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnswers } from "@/lib/answers";
import { computeAxisScores } from "@/lib/scoring";
import { QUESTIONS } from "@/lib/questions";
import { CheckCircle2, XCircle, MinusCircle, TrendingUp, Globe } from "lucide-react";

// ----------------- Data -----------------

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
        description:
          "Centre-left party emphasising public services, workers’ rights and a stronger welfare state.",
      },
      {
        id: "conservative",
        name: "Conservative Party",
        shortName: "Conservatives",
        color: "#0087DC",
        economic: 5.0,
        social: -2.5,
        description:
          "Centre-right party focused on free markets, lower taxes and more traditional social values.",
      },
      {
        id: "libdem",
        name: "Liberal Democrats",
        shortName: "Lib Dems",
        color: "#FAA61A",
        economic: 1.0,
        social: 5.5,
        description:
          "Liberal party combining market economics with strong civil liberties and electoral reform.",
      },
      {
        id: "green",
        name: "Green Party",
        shortName: "Greens",
        color: "#6AB023",
        economic: -6.0,
        social: 6.5,
        description:
          "Left-wing party prioritising climate action, social justice and community-led politics.",
      },
      {
        id: "reform",
        name: "Reform UK",
        shortName: "Reform",
        color: "#12B6CF",
        economic: 7.5,
        social: -1.0,
        description:
          "Right-leaning party stressing lower taxes, strong borders and institutional reform.",
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
        description:
          "Centre-left party supporting progressive taxation, social programmes and minority rights.",
      },
      {
        id: "republican",
        name: "Republican Party",
        shortName: "Republicans",
        color: "#E81B23",
        economic: 6.5,
        social: -3.0,
        description:
          "Centre-right party championing low taxes, deregulation and conservative social values.",
      },
      {
        id: "libertarian",
        name: "Libertarian Party",
        shortName: "Libertarians",
        color: "#FED105",
        economic: 8.0,
        social: 7.0,
        description:
          "Party advocating minimal government, low taxes and strong protections for personal freedom.",
      },
      {
        id: "green-us",
        name: "Green Party",
        shortName: "Greens",
        color: "#17aa5c",
        economic: -7.0,
        social: 6.0,
        description:
          "Left-wing party focused on climate action, grassroots democracy and economic equality.",
      },
    ],
  },
];

// ----------------- Axis helpers -----------------

function AxisMarker({ label, value, pct, colorClasses }) {
  return (
    <div
      className="absolute top-0 flex flex-col items-center gap-1"
      style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
    >
      <div
        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold text-white whitespace-nowrap ${colorClasses.badge}`}
      >
        {label}{" "}
        <span className="ml-1 font-normal opacity-90">
          {value.toFixed(1)}
        </span>
      </div>
      {/* line from label to axis */}
      <div className="w-px h-4 bg-slate-300" />
      {/* dot on axis */}
      <div className={`w-2.5 h-2.5 rounded-full ${colorClasses.dot}`} />
    </div>
  );
}

function AxisLine({
  title,
  subtitle,
  minLabel,
  maxLabel,
  userValue,
  partyValue,
  min = -10,
  max = 10,
}) {
  const clamp = (n) => Math.min(100, Math.max(0, n));

  const rawUserPct = clamp(((userValue - min) / (max - min)) * 100);
  const rawPartyPct = clamp(((partyValue - min) / (max - min)) * 100);

  let userPct = rawUserPct;
  let partyPct = rawPartyPct;

  // keep markers from overlapping
  if (Math.abs(rawUserPct - rawPartyPct) < 6) {
    if (rawUserPct <= 50) {
      userPct = clamp(rawUserPct - 4);
      partyPct = clamp(rawPartyPct + 4);
    } else {
      userPct = clamp(rawUserPct + 4);
      partyPct = clamp(rawPartyPct - 4);
    }
  }

  const mid = (min + max) / 2;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
        </div>
        <div className="text-[11px] text-slate-500">
          Scale: {min} to {max}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>

        <div className="relative h-12">
          {/* main axis line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-slate-200" />

          {/* min / mid / max tick marks */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between">
            <div className="w-px h-3 bg-slate-300" />
            <div className="w-px h-3 bg-slate-300" />
            <div className="w-px h-3 bg-slate-300" />
          </div>

          {/* markers */}
          <AxisMarker
            label="You"
            value={userValue}
            pct={userPct}
            colorClasses={{ badge: "bg-indigo-500", dot: "bg-indigo-500" }}
          />
          <AxisMarker
            label="Party"
            value={partyValue}
            pct={partyPct}
            colorClasses={{ badge: "bg-sky-500", dot: "bg-sky-500" }}
          />
        </div>

        {/* numeric min / mid / max labels */}
        <div className="flex justify-between text-[11px] text-slate-500 mt-1">
          <span>{min}</span>
          <span>{mid}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}

function AxisCompare({ userResults, party }) {
  return (
    <div className="space-y-4">
      <h4 className="mb-1 text-sm font-semibold text-slate-900">
        Position comparison
      </h4>
      <div className="grid md:grid-cols-2 gap-8">
        <AxisLine
          title="Economic axis"
          subtitle="Economic (Left ↔ Right)"
          minLabel="Economic Left"
          maxLabel="Economic Right"
          userValue={userResults.economic}
          partyValue={party.economic}
        />
        <AxisLine
          title="Social axis"
          subtitle="Social (Libertarian ↔ Authoritarian)"
          minLabel="Libertarian"
          maxLabel="Authoritarian"
          userValue={userResults.social}
          partyValue={party.social}
        />
      </div>
    </div>
  );
}

// ----------------- Alignment logic -----------------

function calculateAlignment(userResults, party) {
  const economicDiff = Math.abs(userResults.economic - party.economic);
  const socialDiff = Math.abs(userResults.social - party.social);

  // max possible distance assuming -10..+10 axes
  const distance = Math.sqrt(economicDiff ** 2 + socialDiff ** 2);
  const maxDistance = Math.sqrt(20 ** 2 + 20 ** 2);

  const alignment = ((maxDistance - distance) / maxDistance) * 100;
  return Math.max(0, Math.min(100, alignment));
}

function getMatchStrength(alignment) {
  if (alignment > 70) return { label: "Strong match", tone: "strong" };
  if (alignment > 50) return { label: "Moderate match", tone: "medium" };
  return { label: "Weak match", tone: "weak" };
}

function getAlignmentReasons(userResults, party) {
  const reasons = [];
  const economicDiff = userResults.economic - party.economic;
  const socialDiff = userResults.social - party.social;
  const alignment = calculateAlignment(userResults, party);

  // Economic: speak in manifesto-ish terms
  if (Math.abs(economicDiff) < 2) {
    reasons.push({
      type: "agreement",
      category: "Economic priorities",
      text:
        "Your views on tax, public spending and the role of the state in the economy are very close to this party’s platform. You tend to agree on how much government should intervene in markets.",
      icon: CheckCircle2,
    });
  } else if (Math.abs(economicDiff) < 5) {
    reasons.push({
      type: "partial",
      category: "Economic priorities",
      text:
        `You share some of this party’s economic instincts but not all of them. In broad terms, you lean ${
          economicDiff > 0 ? "more pro-market and sceptical of state intervention" : "more supportive of regulation and welfare spending"
        } than they typically argue for in their manifestos.`,
      icon: MinusCircle,
    });
  } else {
    reasons.push({
      type: "disagreement",
      category: "Economic priorities",
      text:
        `On questions like tax levels, public services and redistribution you are about ${Math.abs(
          economicDiff
        ).toFixed(
          1
        )} points ${
          economicDiff > 0 ? "further to the economic right" : "further to the economic left"
        } than this party. Their economic agenda would often pull policy in the opposite direction to where you answered.`,
      icon: XCircle,
    });
  }

  // Social / cultural
  if (Math.abs(socialDiff) < 2) {
    reasons.push({
      type: "agreement",
      category: "Social & cultural issues",
      text:
        "On social questions – civil liberties, law and order, cultural change – you sit in almost exactly the same place as this party. The trade-off between individual freedom and social order looks very similar in your answers.",
      icon: CheckCircle2,
    });
  } else if (Math.abs(socialDiff) < 5) {
    reasons.push({
      type: "partial",
      category: "Social & cultural issues",
      text:
        `You have a broadly similar tone on social issues but with a noticeable tilt. Compared with this party, you are ${
          socialDiff > 0
            ? "more libertarian – more relaxed about personal choices and state restrictions"
            : "more authoritarian – more comfortable with rules, restrictions and traditional social norms"
        }.`,
      icon: MinusCircle,
    });
  } else {
    reasons.push({
      type: "disagreement",
      category: "Social & cultural issues",
      text:
        `Your answers put you ${Math.abs(
          socialDiff
        ).toFixed(
          1
        )} points ${
          socialDiff > 0 ? "more libertarian" : "more authoritarian"
        } than this party. On issues like policing, protests, speech and lifestyle choices you’d often find yourself on the other side of their typical stance.`,
      icon: XCircle,
    });
  }

  // Overall
  if (alignment > 80) {
    reasons.push({
      type: "agreement",
      category: "Overall worldview",
      text:
        "Across both axes, this party’s manifesto priorities line up closely with your underlying political instincts. If you read through their key pledges, many of the trade-offs match how you answered the quiz.",
      icon: TrendingUp,
    });
  } else if (alignment > 60) {
    reasons.push({
      type: "partial",
      category: "Overall worldview",
      text:
        "You share a lot of the party’s general direction – for example which way to push the economy and society – but you’d often want to go a bit further or softer than their official positions.",
      icon: TrendingUp,
    });
  } else if (alignment > 40) {
    reasons.push({
      type: "partial",
      category: "Overall worldview",
      text:
        "There is some common ground in your answers and this party’s stated aims, but major manifesto themes – like how fast to reform, how open society should be, or how redistributive the system should become – pull in different directions.",
      icon: TrendingUp,
    });
  } else {
    reasons.push({
      type: "disagreement",
      category: "Overall worldview",
      text:
        "Your answers suggest a political outlook that is quite distant from this party’s usual programme. You’re likely to clash with them on both economic direction and social questions, even if you occasionally agree on individual policies.",
      icon: TrendingUp,
    });
  }

  return reasons;
}

// ----------------- Simple UI helpers -----------------

function Chip({ children, className = "" }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
        className
      }
    >
      {children}
    </span>
  );
}

function Separator() {
  return <div className="h-px w-full bg-slate-200 my-4" />;
}

// ----------------- Main page -----------------

function PartyMatchPage() {
  const { answers } = useAnswers() || { answers: {} };
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);

  const userResults = useMemo(() => {
    const scores = computeAxisScores(answers || {}, QUESTIONS) || {};
    // scores are -100..+100; rescale to -10..+10 for this view
    const econ = Number.isFinite(scores.economic) ? scores.economic / 10 : 0;
    const soc = Number.isFinite(scores.social) ? scores.social / 10 : 0;
    return { economic: econ, social: soc };
  }, [answers]);

  const selectedCountry = countries.find((c) => c.id === selectedCountryId);

  const sortedParties = useMemo(() => {
    if (!selectedCountry) return [];
    return selectedCountry.parties
      .map((party) => ({
        ...party,
        alignment: calculateAlignment(userResults, party),
      }))
      .sort((a, b) => b.alignment - a.alignment);
  }, [selectedCountry, userResults]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header / nav */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg"
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Globe className="w-5 h-5 text-white" />
              </motion.div>
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Party match
              </h1>
            </div>
            <p className="text-sm text-slate-600">
              See how your political coordinates compare to major parties.
            </p>
          </div>
          <Link
            href="/profile"
            className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            ← Back to profile
          </Link>
        </div>

        {/* Your coordinates */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Your coordinates
            </div>
            <div className="mt-1 text-sm text-slate-700">
              Economic:{" "}
              <span className="font-semibold">
                {userResults.economic.toFixed(1)}
              </span>{" "}
              • Social:{" "}
              <span className="font-semibold">
                {userResults.social.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="flex gap-2 text-xs text-slate-500">
            <Chip className="bg-indigo-50 text-indigo-700 border border-indigo-100">
              Economic axis −10 (left) to +10 (right)
            </Chip>
            <Chip className="bg-sky-50 text-sky-700 border border-sky-100">
              Social axis −10 (libertarian) to +10 (authoritarian)
            </Chip>
          </div>
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
                className="group relative text-left rounded-2xl bg-white border border-slate-200 shadow-sm px-5 py-4 flex flex-col gap-3 hover:border-indigo-400 hover:shadow-md transition"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedCountryId(country.id)}
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    className="text-4xl"
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {country.flag}
                  </motion.div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {country.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Compare with {country.parties.length} major parties
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {country.parties.map((p) => (
                    <Chip
                      key={p.id}
                      className="bg-slate-50 text-slate-700 border border-slate-200"
                    >
                      {p.shortName}
                    </Chip>
                  ))}
                </div>
                <div className="absolute right-4 bottom-3 text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition">
                  Click to choose →
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Party grid for a selected country */}
        <AnimatePresence mode="wait">
          {selectedCountry && (
            <motion.div
              key={selectedCountry.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedCountry.flag}</span>
                  <div>
                    <div className="text-lg font-semibold text-slate-900">
                      {selectedCountry.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      Click a party card to see detailed alignment
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCountryId(null);
                    setSelectedParty(null);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Change country
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedParties.map((party, index) => {
                  const strength = getMatchStrength(party.alignment);
                  return (
                    <motion.button
                      key={party.id}
                      type="button"
                      className="relative rounded-2xl bg-white border border-slate-200 shadow-sm px-4 pt-4 pb-5 text-left flex flex-col gap-3 hover:border-indigo-400 hover:shadow-md transition group"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      whileHover={{ y: -4 }}
                      onClick={() => setSelectedParty(party)}
                    >
                      {/* top accent bar */}
                      <div
                        className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
                        style={{ backgroundColor: party.color }}
                      />

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: party.color }}
                              />
                              <span className="font-semibold text-slate-900 text-sm">
                                {party.name}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                              {party.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* circular percentage */}
                      <div className="flex items-center justify-center mt-1">
                        <div className="relative">
                          <svg className="w-20 h-20 -rotate-90">
                            <circle
                              cx="40"
                              cy="40"
                              r="32"
                              stroke="#e5e7eb"
                              strokeWidth="7"
                              fill="none"
                            />
                            <motion.circle
                              cx="40"
                              cy="40"
                              r="32"
                              stroke={party.color}
                              strokeWidth="7"
                              fill="none"
                              strokeLinecap="round"
                              initial={{
                                strokeDasharray: "201 201",
                                strokeDashoffset: 201,
                              }}
                              animate={{
                                strokeDashoffset:
                                  201 - (201 * party.alignment) / 100,
                              }}
                              transition={{ duration: 0.9 }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span
                              className="text-xl font-semibold"
                              style={{ color: party.color }}
                            >
                              {party.alignment.toFixed(0)}%
                            </span>
                            <span className="text-[10px] text-slate-500">
                              match
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center mt-2">
                        <Chip
                          className={
                            strength.tone === "strong"
                              ? "bg-emerald-500 text-white"
                              : strength.tone === "medium"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-slate-50 text-slate-700 border border-slate-200"
                          }
                        >
                          {strength.label}
                        </Chip>
                      </div>

                      <div className="mt-2 text-center text-[11px] text-slate-500 opacity-0 group-hover:opacity-100 transition">
                        Click to see how your answers compare →
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Party detail "dialog" */}
        {selectedParty && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl p-6"
            >
              <button
                type="button"
                onClick={() => setSelectedParty(null)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-lg"
              >
                ×
              </button>

              <div className="space-y-4">
                {/* header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedParty.color }}
                      />
                      <h2 className="text-xl font-semibold text-slate-900">
                        {selectedParty.name}
                      </h2>
                    </div>
                    <p className="text-sm text-slate-600">
                      {selectedParty.description}
                    </p>
                  </div>

                  {/* small circle + badge */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <svg className="w-16 h-16 -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="24"
                          stroke="#e5e7eb"
                          strokeWidth="7"
                          fill="none"
                        />
                        <motion.circle
                          cx="32"
                          cy="32"
                          r="24"
                          stroke={selectedParty.color}
                          strokeWidth="7"
                          fill="none"
                          strokeLinecap="round"
                          initial={{
                            strokeDasharray: "150.7 150.7",
                            strokeDashoffset: 150.7,
                          }}
                          animate={{
                            strokeDashoffset:
                              150.7 -
                              (150.7 * selectedParty.alignment) / 100,
                          }}
                          transition={{ duration: 0.8 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: selectedParty.color }}
                        >
                          {selectedParty.alignment.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <Chip
                      className="text-[11px] text-white"
                      style={{ backgroundColor: selectedParty.color }}
                    >
                      {getMatchStrength(selectedParty.alignment).label}
                    </Chip>
                  </div>
                </div>

                <Separator />

                {/* axes */}
                <AxisCompare userResults={userResults} party={selectedParty} />

                <Separator />

                {/* reasons */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">
                    Why this alignment?
                  </h4>
                  <div className="space-y-3">
                    {getAlignmentReasons(userResults, selectedParty).map(
                      (reason, idx) => {
                        const Icon = reason.icon;
                        const bgMap = {
                          agreement: "bg-emerald-50 border-emerald-100",
                          partial: "bg-amber-50 border-amber-100",
                          disagreement: "bg-rose-50 border-rose-100",
                        };
                        const iconMap = {
                          agreement:
                            "bg-gradient-to-br from-emerald-500 to-emerald-600",
                          partial:
                            "bg-gradient-to-br from-amber-500 to-orange-500",
                          disagreement:
                            "bg-gradient-to-br from-rose-500 to-red-500",
                        };

                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 * idx }}
                            className={`flex gap-3 rounded-xl border px-3 py-3 text-sm ${bgMap[reason.type]}`}
                          >
                            <div
                              className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white shadow ${iconMap[reason.type]}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-700 mb-0.5">
                                {reason.category}
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {reason.text}
                              </p>
                            </div>
                          </motion.div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PartyMatchPage;

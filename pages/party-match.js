// pages/party-match.js
import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAnswers } from "@/lib/answers";
import { computeAxisScores } from "@/lib/scoring";
import { QUESTIONS } from "@/lib/questions";

/**
 * Party/country data on the same -100..+100 axis scale used in your app.
 */
const COUNTRIES = [
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
        economic: -35,
        social: 20,
        description: "Centre-left party supporting social democracy and workers' rights",
      },
      {
        id: "conservative",
        name: "Conservative Party",
        shortName: "Conservatives",
        color: "#0087DC",
        economic: 50,
        social: -25,
        description: "Centre-right party supporting free markets and traditional values",
      },
      {
        id: "libdem",
        name: "Liberal Democrats",
        shortName: "Lib Dems",
        color: "#FAA61A",
        economic: 10,
        social: 55,
        description: "Centrist party supporting social liberalism and civil liberties",
      },
      {
        id: "green",
        name: "Green Party",
        shortName: "Greens",
        color: "#6AB023",
        economic: -60,
        social: 65,
        description: "Left-wing party focused on environmentalism and social justice",
      },
      {
        id: "reform",
        name: "Reform UK",
        shortName: "Reform",
        color: "#12B6CF",
        economic: 75,
        social: -10,
        description: "Right-wing populist party supporting Brexit and economic freedom",
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
        economic: -20,
        social: 35,
        description: "Centre-left party supporting progressive taxation and social programs",
      },
      {
        id: "republican",
        name: "Republican Party",
        shortName: "Republicans",
        color: "#E81B23",
        economic: 65,
        social: -30,
        description: "Centre-right party supporting free markets and traditional values",
      },
      {
        id: "libertarian",
        name: "Libertarian Party",
        shortName: "Libertarians",
        color: "#FED105",
        economic: 80,
        social: 70,
        description: "Maximum individual freedom and minimal government",
      },
      {
        id: "green-us",
        name: "Green Party",
        shortName: "Greens",
        color: "#17aa5c",
        economic: -70,
        social: 60,
        description: "Environmentalism and grassroots democracy",
      },
    ],
  },
];

// Tiny icon dots without extra deps
const Icon = {
  check: () => <span className="inline-block w-5 h-5 rounded-full bg-green-500" />,
  minus: () => <span className="inline-block w-5 h-5 rounded-full bg-amber-500" />,
  x: () => <span className="inline-block w-5 h-5 rounded-full bg-rose-500" />,
  trend: () => <span className="inline-block w-5 h-5 rounded bg-slate-700" />,
};

export default function PartyMatchPage() {
  const { answers } = useAnswers();

  // Support either computeAxisScores(answers) or computeAxisScores(answers, QUESTIONS)
  const scores = useMemo(() => {
    try {
      return computeAxisScores.length >= 2
        ? computeAxisScores(answers, QUESTIONS)
        : computeAxisScores(answers);
    } catch {
      return { economic: 0, social: 0 };
    }
  }, [answers]);

  const user = {
    economic: Number(scores?.economic || 0),
    social: Number(scores?.social || 0),
  };

  const [selectedCountry, setSelectedCountry] = useState(null);
  const selected = COUNTRIES.find((c) => c.id === selectedCountry) || null;

  const calcAlignmentPct = (party) => {
    const dx = Math.abs(user.economic - party.economic);
    const dy = Math.abs(user.social - party.social);
    const maxD = Math.sqrt(200 ** 2 + 200 ** 2); // full square range
    const d = Math.sqrt(dx ** 2 + dy ** 2);
    return Math.max(0, Math.min(100, ((maxD - d) / maxD) * 100));
  };

  const reasonsFor = (party) => {
    const reasons = [];
    const econDiff = user.economic - party.economic;
    const socDiff = user.social - party.social;

    // Economic
    if (Math.abs(econDiff) < 20) {
      reasons.push({
        type: "agreement",
        category: "Economic",
        text: "Very close positions on market regulation and government intervention.",
        Icon: Icon.check,
      });
    } else if (Math.abs(econDiff) < 50) {
      reasons.push({
        type: "partial",
        category: "Economic",
        text: `Similar but not identical views. You lean ${econDiff > 0 ? "more right" : "more left"} economically.`,
        Icon: Icon.minus,
      });
    } else {
      reasons.push({
        type: "disagreement",
        category: "Economic",
        text: `Different philosophies. You are ${Math.abs(econDiff).toFixed(0)} points ${
          econDiff > 0 ? "more right-wing" : "more left-wing"
        } economically.`,
        Icon: Icon.x,
      });
    }

    // Social
    if (Math.abs(socDiff) < 20) {
      reasons.push({
        type: "agreement",
        category: "Social",
        text: "Strong agreement on individual freedoms vs social order.",
        Icon: Icon.check,
      });
    } else if (Math.abs(socDiff) < 50) {
      reasons.push({
        type: "partial",
        category: "Social",
        text: `Moderate agreement. You lean ${socDiff > 0 ? "more libertarian" : "more authoritarian"}.`,
        Icon: Icon.minus,
      });
    } else {
      reasons.push({
        type: "disagreement",
        category: "Social",
        text: `Different views on social freedom. You are ${Math.abs(socDiff).toFixed(0)} points ${
          socDiff > 0 ? "more libertarian" : "more authoritarian"
        }.`,
        Icon: Icon.x,
      });
    }

    const pct = calcAlignmentPct(party);
    if (pct > 80) {
      reasons.push({
        type: "agreement",
        category: "Overall",
        text: "This party closely represents your political views across both dimensions.",
        Icon: Icon.trend,
      });
    } else if (pct > 60) {
      reasons.push({
        type: "partial",
        category: "Overall",
        text: "You share many core values, though some differences exist.",
        Icon: Icon.trend,
      });
    } else if (pct > 40) {
      reasons.push({
        type: "partial",
        category: "Overall",
        text: "Some common ground, but significant disagreements remain.",
        Icon: Icon.trend,
      });
    } else {
      reasons.push({
        type: "disagreement",
        category: "Overall",
        text: "Your views diverge significantly from this party’s platform.",
        Icon: Icon.trend,
      });
    }

    return reasons;
  };

  const sortedParties = useMemo(() => {
    if (!selected) return [];
    return selected.parties
      .map((p) => ({ ...p, alignment: calcAlignmentPct(p) }))
      .sort((a, b) => b.alignment - a.alignment);
  }, [selected, user.economic, user.social]);

  return (
    <>
      <Head>
        <title>Party match</title>
      </Head>

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Party match
            </h1>
            <p className="text-sm text-gray-600">
              Compare your political position with major parties in the UK and USA.
            </p>
          </div>
          <Link href="/profile" className="text-indigo-600 hover:underline text-sm">
            ← Back to Profile
          </Link>
        </div>

        {/* Your coordinates (text only) */}
        <div className="rounded-xl border p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Your coordinates</div>
            <div className="text-lg font-semibold">
              Economic: {user.economic.toFixed(0)} • Social: {user.social.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Country selection */}
        {!selected && (
          <div className="grid md:grid-cols-2 gap-6">
            {COUNTRIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCountry(c.id)}
                className="text-left rounded-2xl border bg-white/60 backdrop-blur-md p-6 shadow hover:shadow-md transition relative group"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="text-5xl">{c.flag}</div>
                  <div>
                    <div className="text-lg font-semibold">{c.name}</div>
                    <div className="text-sm text-gray-600">
                      Compare with {c.parties.length} major parties
                    </div>
                  </div>
                </div>
                <div className="relative z-10 mt-4 flex flex-wrap gap-2">
                  {c.parties.map((p) => (
                    <span
                      key={p.id}
                      className="text-xs px-2 py-1 rounded border bg-white"
                      style={{ borderColor: p.color, color: p.color }}
                    >
                      {p.shortName}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {selected && selectedCountry && (
          <div className="space-y-6 mt-2">
            {/* Country header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selected.flag}</span>
                <div>
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {selected.name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Showing alignment with {selected.parties.length} parties
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCountry(null)}
                className="px-3 py-2 rounded border bg-white hover:bg-gray-50"
              >
                Change country
              </button>
            </div>

            {/* Party cards (no graphs) */}
            <div className="space-y-6">
              {sortedParties.map((party) => {
                const reasons = reasonsFor(party);
                const pct = party.alignment;

                return (
                  <div
                    key={party.id}
                    className="rounded-2xl border bg-white/70 backdrop-blur-md overflow-hidden shadow"
                  >
                    {/* Card header */}
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className="inline-block w-3 h-3 rounded-full"
                              style={{ background: party.color }}
                            />
                            <div className="text-lg font-semibold">{party.name}</div>
                          </div>
                          <div className="text-sm text-gray-600">{party.description}</div>
                        </div>

                        {/* Alignment circle */}
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative">
                            <svg className="w-20 h-20 -rotate-90">
                              <circle
                                cx="40"
                                cy="40"
                                r="32"
                                stroke="#e5e7eb"
                                strokeWidth="8"
                                fill="none"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="32"
                                stroke={party.color}
                                strokeWidth="8"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray="201 201"
                                strokeDashoffset={201 - (201 * pct) / 100}
                              />
                            </svg>
                            <div className="absolute inset-0 grid place-items-center">
                              <span className="text-base font-semibold" style={{ color: party.color }}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <span
                            className="text-xs px-2 py-1 rounded text-white"
                            style={{ background: party.color }}
                          >
                            {pct > 70 ? "Strong match" : pct > 50 ? "Moderate match" : "Weak match"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t" />

                    {/* Card body */}
                    <div className="p-5 sm:p-6 space-y-6">
                      {/* Coordinate comparison (text-only) */}
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded bg-gradient-to-r from-blue-500 to-purple-600" />
                          <div className="font-medium">Coordinate comparison</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-white/60 border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">Economic</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs px-2 py-1 rounded border">
                                You: {user.economic.toFixed(0)}
                              </span>
                              <span className="text-gray-500">vs</span>
                              <span
                                className="text-xs px-2 py-1 rounded border"
                                style={{
                                  background: `${party.color}20`,
                                  color: party.color,
                                  borderColor: party.color,
                                }}
                              >
                                {party.shortName}: {party.economic.toFixed(0)}
                              </span>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-white/60 border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">Social</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs px-2 py-1 rounded border">
                                You: {user.social.toFixed(0)}
                              </span>
                              <span className="text-gray-500">vs</span>
                              <span
                                className="text-xs px-2 py-1 rounded border"
                                style={{
                                  background: `${party.color}20`,
                                  color: party.color,
                                  borderColor: party.color,
                                }}
                              >
                                {party.shortName}: {party.social.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reasons */}
                      <div className="border-t" />
                      <div>
                        <div className="font-medium mb-3">Why this alignment?</div>
                        <div className="space-y-3">
                          {reasons.map((r, i) => {
                            const tone =
                              r.type === "agreement" ? "green" : r.type === "partial" ? "amber" : "rose";
                            const bg =
                              tone === "green"
                                ? "from-green-50 to-emerald-50"
                                : tone === "amber"
                                ? "from-amber-50 to-orange-50"
                                : "from-rose-50 to-red-50";
                            const IconEl = r.Icon;
                            return (
                              <div
                                key={i}
                                className={`flex gap-3 p-4 rounded-xl bg-gradient-to-r ${bg} border`}
                              >
                                <div className="flex-shrink-0 grid place-items-center">
                                  <IconEl />
                                </div>
                                <div className="flex-1">
                                  <div className="mb-1">
                                    <span className="text-xs px-2 py-0.5 rounded border bg-white">
                                      {r.category}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">{r.text}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

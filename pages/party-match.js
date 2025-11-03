// pages/party-match.js
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnswers } from "@/lib/answers";
import { computeAxisScores } from "@/lib/scoring";
import { QUESTIONS } from "@/lib/questions";

// If you’re using shadcn/ui these imports work. If not, you can swap for your own UI primitives.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CheckCircle2, XCircle, MinusCircle, TrendingUp, Globe } from "lucide-react";

/* -------------------------
   Party data (UK & USA)
------------------------- */
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
        description: "Centre-left party supporting social democracy and workers' rights",
      },
      {
        id: "conservative",
        name: "Conservative Party",
        shortName: "Conservatives",
        color: "#0087DC",
        economic: 5.0,
        social: -2.5,
        description: "Centre-right party supporting free markets and traditional values",
      },
      {
        id: "libdem",
        name: "Liberal Democrats",
        shortName: "Lib Dems",
        color: "#FAA61A",
        economic: 1.0,
        social: 5.5,
        description: "Centrist party supporting social liberalism and civil liberties",
      },
      {
        id: "green",
        name: "Green Party",
        shortName: "Greens",
        color: "#6AB023",
        economic: -6.0,
        social: 6.5,
        description: "Left-wing party focused on environmentalism and social justice",
      },
      {
        id: "reform",
        name: "Reform UK",
        shortName: "Reform",
        color: "#12B6CF",
        economic: 7.5,
        social: -1.0,
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
        economic: -2.0,
        social: 3.5,
        description: "Centre-left party supporting progressive taxation and social programs",
      },
      {
        id: "republican",
        name: "Republican Party",
        shortName: "Republicans",
        color: "#E81B23",
        economic: 6.5,
        social: -3.0,
        description: "Centre-right party supporting free markets and traditional values",
      },
      {
        id: "libertarian",
        name: "Libertarian Party",
        shortName: "Libertarians",
        color: "#FED105",
        economic: 8.0,
        social: 7.0,
        description: "Party supporting maximum individual freedom and minimal government",
      },
      {
        id: "green-us",
        name: "Green Party",
        shortName: "Greens",
        color: "#17aa5c",
        economic: -7.0,
        social: 6.0,
        description: "Left-wing party focused on environmentalism and grassroots democracy",
      },
    ],
  },
];

/* ------------------------------------------
   Lightweight party aims / manifesto hooks
   (used to craft clearer reasons)
------------------------------------------ */
const partyAims = {
  // UK
  labour: {
    economicLeft: [
      "Increase investment in public services (NHS, education, social care)",
      "Support higher taxes on top incomes and windfall taxes on excess profits",
      "Strengthen workers’ rights and collective bargaining",
    ],
    socialLib: [
      "Expand civil liberties and anti-discrimination protections",
      "Reform policing with community focus and accountability",
    ],
  },
  conservative: {
    economicRight: [
      "Lower taxes and reduce business regulation to spur growth",
      "Encourage private sector provision and competition",
    ],
    socialAuth: [
      "Stronger law-and-order measures",
      "More controlled immigration and border enforcement",
    ],
  },
  libdem: {
    economicCenter: [
      "Balanced budgets with targeted social investment",
      "Evidence-led regulation to support SMEs and innovation",
    ],
    socialLib: [
      "Strong civil liberties and privacy protections",
      "Electoral and constitutional reform (e.g., PR)",
    ],
  },
  green: {
    economicLeft: [
      "Large-scale public investment in green infrastructure",
      "Redistributive taxation and expanded social safety net",
    ],
    socialLib: [
      "Broad civil rights expansion and participatory democracy",
      "Environmental justice and local community power",
    ],
  },
  reform: {
    economicRight: [
      "Lower personal and corporate taxes",
      "Deregulation and smaller state",
    ],
    socialAuth: [
      "Tighter immigration and border controls",
      "Harsher sentencing / policing reforms",
    ],
  },

  // USA
  democrat: {
    economicLeft: [
      "Progressive taxation to fund healthcare, education and climate programs",
      "Higher minimum wage and stronger labor standards",
    ],
    socialLib: [
      "Abortion rights and LGBTQ+ protections",
      "Criminal justice reform and police accountability",
    ],
  },
  republican: {
    economicRight: [
      "Tax cuts and deregulation to boost investment and jobs",
      "School choice and privatization options",
    ],
    socialAuth: [
      "Tough-on-crime policies and expanded police powers",
      "More restrictive immigration policy",
    ],
  },
  libertarian: {
    economicRight: [
      "Minimal state intervention and lower taxes",
      "Deregulation and free trade",
    ],
    socialLib: [
      "Maximal individual liberties, limited government authority",
      "Decriminalization across non-violent conduct",
    ],
  },
  "green-us": {
    economicLeft: [
      "Green New Deal-scale public spending",
      "Universal social programs and wealth taxes",
    ],
    socialLib: [
      "Grassroots democracy and civil liberties",
      "Environmental justice for marginalized communities",
    ],
  },
};

/* ---------------------------------------
   AxisCompare — single compact axis bar
   with 2 non-overlapping markers
--------------------------------------- */
function AxisCompare({ label, userValue = 0, partyValue = 0, partyColor = "#000" }) {
  // Clamp into [-10..10] (your axes are scaled -10..10)
  const clamp = (v) => Math.max(-10, Math.min(10, Number(v || 0)));
  const u = clamp(userValue);
  const p = clamp(partyValue);

  // Convert to percentage for bar positioning
  const toPct = (v) => ((v + 10) / 20) * 100;

  // Avoid overlap: if markers too close, nudge user marker up
  const tooClose = Math.abs(u - p) < 1; // within 1 point
  const userOffsetClass = tooClose ? "-translate-y-1.5" : "";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-600">
          <span className="mr-2">You: {u.toFixed(1)}</span>
          <span style={{ color: partyColor }}>{/* party name handled outside */}</span>
        </div>
      </div>

      <div className="relative h-3 rounded bg-gray-200">
        {/* midline */}
        <div className="absolute left-1/2 top-0 h-full w-[1px] bg-gray-400/60" />
        {/* ticks */}
        {[0, 25, 75, 100].map((t) => (
          <div key={t} className="absolute" style={{ left: `${t}%` }}>
            <div className="w-[1px] h-3 bg-gray-300/70" />
          </div>
        ))}

        {/* party marker */}
        <div
          className="absolute -top-1.5"
          style={{ left: `calc(${toPct(p)}% - 6px)` }}
          title={`Party: ${p.toFixed(1)}`}
        >
          <div
            className="w-3 h-3 rounded-full border-2"
            style={{ backgroundColor: partyColor + "22", borderColor: partyColor }}
          />
        </div>

        {/* user marker (nudged up if too close) */}
        <div
          className={`absolute -top-1.5 ${userOffsetClass}`}
          style={{ left: `calc(${toPct(u)}% - 6px)` }}
          title={`You: ${u.toFixed(1)}`}
        >
          <div className="w-3 h-3 rounded-full border-2 bg-white" style={{ borderColor: "#111827" }} />
        </div>
      </div>

      <div className="flex text-[11px] text-gray-500 mt-1 justify-between">
        <span>−10</span><span>Left</span><span>Right</span><span>+10</span>
      </div>
    </div>
  );
}

/* ---------------------------------------
   Helper: alignment %, strength label
--------------------------------------- */
const calcAlignment = (user, party) => {
  const economicDiff = Math.abs(user.economic - party.economic);
  const socialDiff = Math.abs(user.social - party.social);
  const distance = Math.sqrt(economicDiff ** 2 + socialDiff ** 2);
  const maxDistance = Math.sqrt(20 ** 2 + 20 ** 2);
  const pct = ((maxDistance - distance) / maxDistance) * 100;
  return Math.max(0, Math.min(100, pct));
};

const matchStrength = (pct) =>
  pct > 70 ? "Strong Match" : pct > 50 ? "Moderate Match" : "Weak Match";

/* ---------------------------------------
   Reason generator:
   Uses axis directions + party aims to
   craft concrete-sounding points
--------------------------------------- */
function generateReasons(party, user) {
  const reasons = [];
  const partyAim = partyAims[party.id] || {};

  const econDelta = user.economic - party.economic; // + means user more right
  const socDelta = user.social - party.social; // + means user more libertarian

  // ECONOMIC
  if (Math.abs(econDelta) < 2) {
    const aims =
      user.economic < 0 ? partyAim.economicLeft : user.economic > 0 ? partyAim.economicRight : partyAim.economicCenter;
    if (aims?.length) {
      reasons.push({
        type: "agreement",
        category: "Economic",
        text: `You and ${party.shortName} are closely aligned on the role of the state in the economy. For example: ${aims[0]}.`,
        icon: CheckCircle2,
      });
    } else {
      reasons.push({
        type: "agreement",
        category: "Economic",
        text: "You and the party sit very close on economic policy (tax/spend, regulation, role of markets).",
        icon: CheckCircle2,
      });
    }
  } else if (Math.abs(econDelta) < 5) {
    const dir = econDelta > 0 ? "more market-oriented" : "more redistributive";
    reasons.push({
      type: "partial",
      category: "Economic",
      text: `Broadly similar economic outlook, but you are ${dir} than ${party.shortName}.`,
      icon: MinusCircle,
    });
  } else {
    const dir = econDelta > 0 ? "more right-leaning (lower taxes, less regulation)" : "more left-leaning (higher taxes on top earners, more social spending)";
    const aims =
      econDelta > 0 ? partyAim.economicLeft || partyAim.economicCenter : partyAim.economicRight || partyAim.economicCenter;
    reasons.push({
      type: "disagreement",
      category: "Economic",
      text: `Clear difference on economics — you are ${dir} than ${party.shortName}${aims?.length ? `, which emphasises ${aims[0].toLowerCase()}.` : "."}`,
      icon: XCircle,
    });
  }

  // SOCIAL
  if (Math.abs(socDelta) < 2) {
    const aims = user.social > 0 ? partyAim.socialLib : partyAim.socialAuth;
    if (aims?.length) {
      reasons.push({
        type: "agreement",
        category: "Social",
        text: `Strong overlap on social issues and civil liberties. For instance: ${aims[0]}.`,
        icon: CheckCircle2,
      });
    } else {
      reasons.push({
        type: "agreement",
        category: "Social",
        text: "You and the party are closely aligned on social freedom vs social order.",
        icon: CheckCircle2,
      });
    }
  } else if (Math.abs(socDelta) < 5) {
    const dir = socDelta > 0 ? "more libertarian" : "more authoritarian";
    reasons.push({
      type: "partial",
      category: "Social",
      text: `Moderate differences on social policy — you are ${dir} than ${party.shortName}.`,
      icon: MinusCircle,
    });
  } else {
    const dir = socDelta > 0 ? "more libertarian (free speech, civil liberties)" : "more authoritarian (law-and-order, social cohesion)";
    const aims = socDelta > 0 ? partyAim.socialAuth : partyAim.socialLib;
    reasons.push({
      type: "disagreement",
      category: "Social",
      text: `Marked difference on social questions — you are ${dir}${aims?.length ? `, while ${party.shortName} prioritises ${aims[0].toLowerCase()}.` : "."}`,
      icon: XCircle,
    });
  }

  // OVERALL
  const alignment = calcAlignment(user, party);
  reasons.push({
    type: alignment > 70 ? "agreement" : alignment > 50 ? "partial" : "disagreement",
    category: "Overall",
    text:
      alignment > 80
        ? "This party closely represents your views across both dimensions."
        : alignment > 60
        ? "You share many core values, with some differences to consider."
        : alignment > 40
        ? "You have some common ground but also clear areas of disagreement."
        : "Your positions differ substantially from this party on key issues.",
    icon: TrendingUp,
  });

  return reasons;
}

/* ---------------------------------------
   The page
--------------------------------------- */
export default function PartyMatchPage() {
  const { answers } = useAnswers();
  const scores = useMemo(() => computeAxisScores(answers, QUESTIONS), [answers]);

  const userResults = useMemo(
    () => ({
      economic: Number(scores?.economic || 0),
      social: Number(scores?.social || 0),
      answers: answers || {},
    }),
    [scores, answers]
  );

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);

  const selectedCountryData = countries.find((c) => c.id === selectedCountry);
  const sortedParties = selectedCountryData
    ? selectedCountryData.parties
        .map((party) => ({
          ...party,
          alignment: calcAlignment(userResults, party),
        }))
        .sort((a, b) => b.alignment - a.alignment)
    : [];

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold">Party match</h1>
          </div>
          <p className="text-gray-600">Compare your political position with major parties.</p>
        </motion.div>

        {/* Country selection */}
        {!selectedCountry && (
          <motion.div
            className="grid md:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {countries.map((country, index) => (
              <motion.div
                key={country.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * index }}
              >
                <Card
                  className="cursor-pointer bg-white/70 backdrop-blur rounded-xl border hover:shadow-lg transition"
                  onClick={() => setSelectedCountry(country.id)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{country.flag}</div>
                      <div>
                        <CardTitle>{country.name}</CardTitle>
                        <CardDescription>
                          Compare with {country.parties.length} major parties
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {country.parties.map((p) => (
                        <Badge key={p.id} variant="outline" style={{ borderColor: p.color, color: p.color }}>
                          {p.shortName}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Party grid */}
        <AnimatePresence mode="wait">
          {selectedCountry && selectedCountryData && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedCountryData.flag}</span>
                  <div>
                    <h2 className="text-lg font-semibold">{selectedCountryData.name}</h2>
                    <p className="text-sm text-gray-600">Click a party to see detailed alignment</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setSelectedCountry(null)}>
                  Change country
                </Button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedParties.map((party, index) => (
                  <motion.div
                    key={party.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ y: -4 }}
                  >
                    <Card
                      className="cursor-pointer bg-white/70 backdrop-blur rounded-xl border hover:shadow-lg transition h-full"
                      onClick={() => setSelectedParty(party)}
                    >
                      <div className="h-1 w-full rounded-t-xl" style={{ backgroundColor: party.color }} />
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: party.color }}
                          />
                          <CardTitle className="text-base">{party.name}</CardTitle>
                        </div>
                        <CardDescription className="line-clamp-2">{party.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-3xl font-semibold" style={{ color: party.color }}>
                            {party.alignment.toFixed(0)}%
                          </div>
                          <Badge variant={party.alignment > 70 ? "default" : party.alignment > 50 ? "secondary" : "outline"}>
                            {matchStrength(party.alignment)}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 text-right">Click to view details →</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Details dialog */}
        <Dialog open={!!selectedParty} onOpenChange={(open) => !open && setSelectedParty(null)}>
          <DialogContent className="max-w-3xl bg-white/95 backdrop-blur border">
            {selectedParty && (
              <div className="space-y-6">
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selectedParty.color }}
                        />
                        <DialogTitle className="text-xl">{selectedParty.name}</DialogTitle>
                      </div>
                      <DialogDescription>{selectedParty.description}</DialogDescription>
                    </div>
                    <div className="flex flex-col items-center">
                      <div
                        className="text-2xl font-semibold"
                        style={{ color: selectedParty.color }}
                      >
                        {selectedParty.alignment.toFixed(0)}%
                      </div>
                      <Badge
                        className="mt-1"
                        style={{ backgroundColor: selectedParty.color, color: "white" }}
                      >
                        {matchStrength(selectedParty.alignment)}
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>

                <Separator />

                {/* Axis compares */}
                <div className="grid md:grid-cols-2 gap-6">
                  <AxisCompare
                    label="Economic axis (Left ↔ Right)"
                    userValue={userResults.economic}
                    partyValue={selectedParty.economic}
                    partyColor={selectedParty.color}
                  />
                  <AxisCompare
                    label="Social axis (Libertarian ↔ Authoritarian)"
                    userValue={userResults.social}
                    partyValue={selectedParty.social}
                    partyColor={selectedParty.color}
                  />
                </div>

                <Separator />

                {/* Reasons */}
                <div>
                  <h4 className="mb-3 font-medium">Why this alignment?</h4>
                  <div className="space-y-3">
                    {generateReasons(selectedParty, userResults).map((r, i) => {
                      const Icon = r.icon;
                      const bg =
                        r.type === "agreement"
                          ? "bg-green-50 border-green-200"
                          : r.type === "partial"
                          ? "bg-amber-50 border-amber-200"
                          : "bg-rose-50 border-rose-200";
                      return (
                        <div key={i} className={`flex gap-3 p-3 rounded-lg border ${bg}`}>
                          <div className="shrink-0">
                            <Icon className="w-5 h-5 text-gray-700" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-0.5">{r.category}</div>
                            <div className="text-sm text-gray-800">{r.text}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

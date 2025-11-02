// pages/party-match.js
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, MinusCircle, XCircle, Globe } from "lucide-react";

import Modal from "@/components/Modal";
import { useAnswers } from "@/lib/answers";
import { computeAxisScores } from "@/lib/scoring";
import { QUESTIONS } from "@/lib/questions";

// --- Party data on the same -100..+100 scale as your app ---
const COUNTRIES = [
  {
    id: "uk",
    flag: "🇬🇧",
    name: "United Kingdom",
    parties: [
      { id: "labour", name: "Labour Party", short: "Labour", color: "#E4003B", economic: -35, social: 20, desc: "Centre-left party supporting social democracy and workers' rights." },
      { id: "conservative", name: "Conservative Party", short: "Conservatives", color: "#0087DC", economic: 50, social: -25, desc: "Centre-right party supporting free markets and traditional values." },
      { id: "libdem", name: "Liberal Democrats", short: "Lib Dems", color: "#FAA61A", economic: 10, social: 55, desc: "Centrist party supporting social liberalism and civil liberties." },
      { id: "green", name: "Green Party", short: "Greens", color: "#6AB023", economic: -60, social: 65, desc: "Left-wing party focused on environmentalism and social justice." },
      { id: "reform", name: "Reform UK", short: "Reform", color: "#12B6CF", economic: 75, social: -10, desc: "Right-wing populist party supporting Brexit and economic freedom." },
    ],
  },
  {
    id: "usa",
    flag: "🇺🇸",
    name: "United States",
    parties: [
      { id: "democrat", name: "Democratic Party", short: "Democrats", color: "#0015BC", economic: -20, social: 35, desc: "Centre-left party supporting progressive taxation and social programs." },
      { id: "republican", name: "Republican Party", short: "Republicans", color: "#E81B23", economic: 65, social: -30, desc: "Centre-right party supporting free markets and traditional values." },
      { id: "libertarian", name: "Libertarian Party", short: "Libertarians", color: "#FED105", economic: 80, social: 70, desc: "Party supporting maximum individual freedom and minimal government." },
      { id: "green-us", name: "Green Party (US)", short: "Greens", color: "#17aa5c", economic: -70, social: 60, desc: "Left-wing party focused on environmentalism and grassroots democracy." },
    ],
  },
];

// Compute % alignment based on Euclidean distance in the same coordinate space
function alignmentPct(user, party) {
  const dE = Math.abs((user?.economic ?? 0) - party.economic);
  const dS = Math.abs((user?.social ?? 0) - party.social);
  const distance = Math.sqrt(dE * dE + dS * dS);
  // Max difference per axis = 200 (from -100..+100), so max diagonal:
  const maxDistance = Math.sqrt(200 * 200 + 200 * 200); // ~282.84
  const pct = ((maxDistance - distance) / maxDistance) * 100;
  return Math.max(0, Math.min(100, pct));
}

function matchBadge(pct) {
  if (pct >= 70) return { label: "Strong match", className: "bg-green-600 text-white" };
  if (pct >= 50) return { label: "Moderate match", className: "bg-amber-500 text-white" };
  return { label: "Weak match", className: "bg-gray-200 text-gray-800" };
}

function reasonsFor(selectedParty, user) {
  const reasons = [];
  const eDelta = (user?.economic ?? 0) - selectedParty.economic;
  const sDelta = (user?.social ?? 0) - selectedParty.social;

  // Economic
  if (Math.abs(eDelta) < 15) {
    reasons.push({ type: "agreement", category: "Economic", icon: CheckCircle2, text: "Very close on market regulation and government intervention." });
  } else if (Math.abs(eDelta) < 40) {
    reasons.push({ type: "partial", category: "Economic", icon: MinusCircle, text: `Some overlap; you lean ${eDelta > 0 ? "more right" : "more left"} economically.` });
  } else {
    reasons.push({ type: "disagreement", category: "Economic", icon: XCircle, text: `Different views; you're ${Math.abs(eDelta).toFixed(0)} points ${eDelta > 0 ? "more right-leaning" : "more left-leaning"}.` });
  }

  // Social
  if (Math.abs(sDelta) < 15) {
    reasons.push({ type: "agreement", category: "Social", icon: CheckCircle2, text: "Strong agreement on individual freedoms vs social order." });
  } else if (Math.abs(sDelta) < 40) {
    reasons.push({ type: "partial", category: "Social", icon: MinusCircle, text: `Moderate alignment; you are ${sDelta > 0 ? "more libertarian" : "more authoritarian"}.` });
  } else {
    reasons.push({ type: "disagreement", category: "Social", icon: XCircle, text: `Different stance; you're ${Math.abs(sDelta).toFixed(0)} points ${sDelta > 0 ? "more libertarian" : "more authoritarian"}.` });
  }

  return reasons;
}

export default function PartyMatchPage() {
  // Get the user's scores
  const { answers } = useAnswers();
  const scores = useMemo(() => computeAxisScores(answers || {}, QUESTIONS), [answers]);
  const user = { economic: Number(scores?.economic || 0), social: Number(scores?.social || 0) };

  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [openParty, setOpenParty] = useState(null); // party object with alignment

  const selectedCountry = COUNTRIES.find((c) => c.id === selectedCountryId) || null;

  const partiesSorted = useMemo(() => {
    if (!selectedCountry) return [];
    return selectedCountry.parties
      .map((p) => ({ ...p, alignment: alignmentPct(user, p) }))
      .sort((a, b) => b.alignment - a.alignment);
  }, [selectedCountry, user]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow">
            <Globe className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">Party match</h1>
        </div>
        <Link href="/profile" className="text-indigo-600 hover:underline text-sm">← Back to My Profile</Link>
      </div>

      {/* Show user coords */}
      <div className="mb-6 text-sm text-gray-600">
        Your coordinates — <span className="font-medium">Economic:</span> {user.economic} • <span className="font-medium">Social:</span> {user.social}
      </div>

      {/* Step 1: Pick a country */}
      {!selectedCountry && (
        <AnimatePresence>
          <motion.div
            key="country-grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid sm:grid-cols-2 gap-4"
          >
            {COUNTRIES.map((c, i) => (
              <motion.button
                key={c.id}
                onClick={() => setSelectedCountryId(c.id)}
                className="relative rounded-xl border bg-white p-5 text-left shadow hover:shadow-md transition flex items-center gap-4"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-4xl">{c.flag}</div>
                <div>
                  <div className="text-lg font-semibold">{c.name}</div>
                  <div className="text-gray-600 text-sm">{c.parties.length} major parties</div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Step 2: Party boxes */}
      {selectedCountry && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedCountry.flag}</span>
              <div>
                <div className="text-xl font-semibold">{selectedCountry.name}</div>
                <div className="text-gray-600 text-sm">Click a party to see detailed alignment</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedCountryId(null)}
              className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
            >
              Change country
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partiesSorted.map((p, idx) => {
              const badge = matchBadge(p.alignment);
              return (
                <motion.button
                  key={p.id}
                  onClick={() => setOpenParty(p)}
                  className="group relative rounded-xl border bg-white p-5 text-left shadow hover:shadow-md transition h-full"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  {/* top accent */}
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: p.color }} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        <div className="font-semibold">{p.name}</div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1 line-clamp-2">{p.desc}</div>
                    </div>
                    {/* percentage donut simplified -> just % number */}
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: p.color }}>
                        {p.alignment.toFixed(0)}%
                      </div>
                      <div className={`mt-1 inline-block text-xs px-2 py-0.5 rounded ${badge.className}`}>
                        {badge.label}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-3 opacity-0 group-hover:opacity-100 transition">Click to view details →</div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal with detailed reasons (no graphs) */}
      <Modal
        title={openParty ? openParty.name : ""}
        isOpen={!!openParty}
        onClose={() => setOpenParty(null)}
      >
        {openParty && (
          <div className="space-y-4">
            {/* Header summary */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: openParty.color }} />
                  <div className="font-semibold">{openParty.name}</div>
                </div>
                <div className="text-sm text-gray-600">{openParty.desc}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold" style={{ color: openParty.color }}>
                  {openParty.alignment.toFixed(0)}%
                </div>
                <div className={`mt-1 inline-block text-xs px-2 py-0.5 rounded ${matchBadge(openParty.alignment).className}`}>
                  {matchBadge(openParty.alignment).label}
                </div>
              </div>
            </div>

            {/* Coordinate comparison (numbers only) */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 bg-white">
                <div className="text-sm text-gray-500 mb-1">Economic axis</div>
                <div className="flex items-center gap-2">
                  <span className="inline-block text-xs px-2 py-0.5 rounded border bg-white">You: {user.economic}</span>
                  <span className="text-gray-500 text-sm">vs</span>
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded border"
                    style={{ backgroundColor: `${openParty.color}14`, color: openParty.color, borderColor: openParty.color }}
                  >
                    {openParty.short}: {openParty.economic}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border p-3 bg-white">
                <div className="text-sm text-gray-500 mb-1">Social axis</div>
                <div className="flex items-center gap-2">
                  <span className="inline-block text-xs px-2 py-0.5 rounded border bg-white">You: {user.social}</span>
                  <span className="text-gray-500 text-sm">vs</span>
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded border"
                    style={{ backgroundColor: `${openParty.color}14`, color: openParty.color, borderColor: openParty.color }}
                  >
                    {openParty.short}: {openParty.social}
                  </span>
                </div>
              </div>
            </div>

            {/* Reasons */}
            <div className="space-y-2">
              <div className="font-medium">Why this alignment?</div>
              <div className="space-y-2">
                {reasonsFor(openParty, user).map((r, i) => {
                  const Icon = r.icon;
                  const tone =
                    r.type === "agreement" ? "bg-green-50 border-green-200" :
                    r.type === "partial" ? "bg-amber-50 border-amber-200" :
                    "bg-rose-50 border-rose-200";
                  return (
                    <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 ${tone}`}>
                      <div className="mt-0.5">
                        <Icon className="w-4 h-4 text-gray-700" />
                      </div>
                      <div className="text-sm">
                        <div className="text-gray-800 font-medium">{r.category}</div>
                        <div className="text-gray-700">{r.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

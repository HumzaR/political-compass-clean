// components/PartyMatch.js
import React from "react";
import { useAnswers } from "@/lib/answers";
import { QUESTIONS } from "@/lib/questions";
import { computePartyMatches } from "@/lib/parties";

export default function PartyMatch() {
  const { answers } = useAnswers() || { answers: {} };
  const [open, setOpen] = React.useState(false);
  const [country, setCountry] = React.useState("UK"); // "UK" | "USA"
  const [results, setResults] = React.useState([]);

  const runMatch = React.useCallback(() => {
    try {
      const ranked = computePartyMatches(country, answers || {}, QUESTIONS);
      setResults(ranked);
      setOpen(true);
    } catch (e) {
      console.error("Party match failed:", e);
    }
  }, [country, answers]);

  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm text-gray-600 mb-1">Compare with parties</div>
          <h3 className="text-lg font-semibold">Party match</h3>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-gray-300 text-sm px-2 py-1"
          >
            <option value="UK">United Kingdom</option>
            <option value="USA">United States</option>
          </select>

          <button
            type="button"
            onClick={runMatch}
            className="rounded-lg bg-gray-900 text-white text-sm px-3 py-1.5 hover:bg-black"
          >
            Party match
          </button>
        </div>
      </div>

      {!open ? (
        <p className="mt-3 text-sm text-gray-600">
          Click <span className="font-medium">Party match</span> to see which parties you align with based on your answers.
        </p>
      ) : results.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">No results yet. Try answering more questions first.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {results.map(({ party, matchPercent, reasons }) => (
            <li key={party.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">{party.name}</div>
                  <div className="text-xs text-gray-500">{party.country}</div>
                </div>
                <div className="text-2xl font-bold tabular-nums">{matchPercent}%</div>
              </div>
              {party.blurb && <div className="mt-1 text-sm text-gray-600">{party.blurb}</div>}

              {reasons?.length ? (
                <div className="mt-3">
                  <div className="text-sm font-medium">Why this aligns</div>
                  <ul className="mt-1 list-disc ml-5 text-sm text-gray-700 space-y-1">
                    {reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

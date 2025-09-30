// components/AIInsightsRight.js
import { useEffect, useState } from "react";
import { loadAnswers } from "../lib/answers";
import { fetchAIInsights } from "../lib/ai";

function Pill({ children, tone = "default" }) {
  const tones = {
    default: "bg-gray-100 text-gray-800",
    warn: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    ok: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span className={`inline-block text-[11px] px-2 py-0.5 rounded ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
}

export default function AIInsightsRight({ finalScores }) {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const answersById = await loadAnswers(); // Firestore-first + local fallback
        const resp = await fetchAIInsights({ answersById, finalScores });
        if (!mounted) return;
        if (!resp.ok && resp.error) setState({ loading: false, error: resp.error, data: null });
        else setState({ loading: false, error: "", data: resp });
      } catch (e) {
        if (!mounted) return;
        setState({ loading: false, error: e.message || "Failed to load", data: null });
      }
    })();
    return () => { mounted = false; };
  }, [finalScores]);

  return (
    <aside className="lg:w-80 w-full lg:sticky lg:top-6 space-y-4">
      <div className="rounded border bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold">AI Summary</h3>
          <Pill tone="ok">Beta</Pill>
        </div>
        {state.loading ? (
          <p className="text-sm text-gray-600">Generating summary…</p>
        ) : state.error ? (
          <>
            <p className="text-sm text-red-700">Unavailable: {state.error}</p>
            <p className="text-xs text-gray-500 mt-1">Ensure <code>OPENAI_API_KEY</code> is set.</p>
          </>
        ) : (
          <p className="text-sm text-gray-800 leading-relaxed">
            {state.data?.summary || "No summary available."}
          </p>
        )}
      </div>

      <div className="rounded border bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Potential Contradictions</h3>
          {!state.loading && !state.error && (
            <Pill tone={(state.data?.contradictions?.length || 0) ? "warn" : "ok"}>
              {(state.data?.contradictions?.length || 0) ? `${state.data.contradictions.length} found` : "None"}
            </Pill>
          )}
        </div>
        {state.loading ? (
          <p className="text-sm text-gray-600">Checking answers…</p>
        ) : state.error ? (
          <p className="text-sm text-gray-600">—</p>
        ) : (state.data?.contradictions?.length || 0) === 0 ? (
          <p className="text-sm text-gray-700">No obvious tensions detected.</p>
        ) : (
          <ul className="space-y-3">
            {state.data.contradictions.slice(0, 5).map((c, i) => (
              <li key={i} className="border rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-medium">Q{c.qidA}</span> ↔ <span className="font-medium">Q{c.qidB}</span>
                  </div>
                  <Pill tone={c.severity === "high" ? "error" : c.severity === "medium" ? "warn" : "default"}>
                    {c.severity || "low"}
                  </Pill>
                </div>
                <div className="mt-1 text-xs text-gray-800">{c.reason}</div>
                {c.suggestion && (
                  <div className="mt-1 text-[11px] text-gray-600">
                    <span className="font-semibold">Consider:</span> {c.suggestion}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

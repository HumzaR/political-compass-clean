// components/AIInsightsRight.jsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function AIInsightsRight({ finalScores }) {
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ai, setAI] = useState({
    summary: null,
    contradictions: [],
    generatedAt: null,
    version: null,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid || null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) {
        setAI({ summary: null, contradictions: [], generatedAt: null, version: null });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // 1) read lastResultId from profile
        const profSnap = await getDoc(doc(db, "profiles", uid));
        const lastId = profSnap.exists() ? profSnap.data()?.lastResultId : null;
        if (!lastId) {
          if (alive) {
            setAI({ summary: null, contradictions: [], generatedAt: null, version: null });
          }
          return;
        }

        // 2) read cached AI from results/{lastResultId}
        const resSnap = await getDoc(doc(db, "results", lastId));
        if (!resSnap.exists()) {
          if (alive) {
            setAI({ summary: null, contradictions: [], generatedAt: null, version: null });
          }
          return;
        }

        const data = resSnap.data();
        const when =
          data.aiGeneratedAt?.toDate ? data.aiGeneratedAt.toDate() :
          typeof data.aiGeneratedAt === "string" ? new Date(data.aiGeneratedAt) :
          null;

        if (alive) {
          setAI({
            summary: data.aiSummary || null,
            contradictions: Array.isArray(data.aiContradictions) ? data.aiContradictions : [],
            generatedAt: when,
            version: data.aiVersion || null,
          });
        }
      } catch (e) {
        console.error("AIInsightsRight:", e);
        if (alive) {
          setAI({ summary: null, contradictions: [], generatedAt: null, version: null });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [uid]);

  const ScorePill = ({ label, value }) => (
    <div className="flex items-center justify-between px-3 py-1.5 rounded border bg-white">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-semibold">{Number.isFinite(value) ? value.toFixed(2) : "—"}</span>
    </div>
  );

  return (
    <aside className="w-full border rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold mb-3">AI Insights</h3>

      {/* Scores snapshot (unchanged, from props) */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <ScorePill label="Economic" value={finalScores?.economic} />
        <ScorePill label="Social"   value={finalScores?.social} />
        <ScorePill label="Global"   value={finalScores?.global} />
        <ScorePill label="Progress" value={finalScores?.progress} />
      </div>

      {/* AI summary / contradictions (cached) */}
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : ai.summary || (ai.contradictions?.length ?? 0) > 0 ? (
        <>
          {ai.summary && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-1">Summary</div>
              <p className="text-sm text-gray-800 whitespace-pre-line">{ai.summary}</p>
            </div>
          )}

          {ai.contradictions?.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-1">Potential Tensions</div>
              <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                {ai.contradictions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-400">
            {ai.generatedAt ? `Generated ${ai.generatedAt.toLocaleString()}` : "Generated recently"}
            {ai.version ? ` • ${ai.version}` : null}
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-500">
          No AI insights yet. Answer a few questions to see your summary here.
        </div>
      )}
    </aside>
  );
}

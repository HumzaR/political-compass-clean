// components/AxisCard.js
import { useMemo, useState } from "react";

/**
 * AxisCard
 *  - Mini graph for a single axis: horizontal bar from -scale..+scale with a dot.
 *  - Pastel background per axis; highlights on hover.
 *  - Shows top contributing answers in an overlay panel on hover.
 *
 * Props:
 *  - title, negLabel, posLabel
 *  - value (number), contributions: [{ qId, qText, answer, contrib }]
 *  - color: { bg, bar, dot }  (CSS colors)
 */
export default function AxisCard({
  title,
  negLabel,
  posLabel,
  value = 0,
  contributions = [],
  color = { bg: "#eef2ff", bar: "#c7d2fe", dot: "#6366f1" }, // indigo pastels
}) {
  const [hover, setHover] = useState(false);

  const scale = useMemo(() => Math.max(5, Math.ceil(Math.max( Math.abs(value), ...contributions.map(c => Math.abs(c.contrib||0)) ))), [value, contributions]);
  const pct = ((Math.max(-scale, Math.min(scale, Number(value)||0)) + scale) / (2*scale)) * 100;

  const top = useMemo(()=>{
    // sort by absolute contribution, top 5
    const sorted = [...contributions].sort((a,b)=>Math.abs(b.contrib||0)-Math.abs(a.contrib||0)).slice(0,5);
    return sorted.map(item=>{
      const v = Number(item.answer);
      const dir = item.contrib > 0 ? "→" : item.contrib < 0 ? "←" : "·";
      const why =
        item.contrib === 0 ? "Neutral effect."
        : item.contrib > 0
          ? `Pushed toward ${posLabel}`
          : `Pushed toward ${negLabel}`;
      const label = item.type === "yesno" ? (v >= 3 ? "Yes" : "No")
        : ({1:"Strongly Disagree",2:"Disagree",3:"Neutral",4:"Agree",5:"Strongly Agree"}[v] || String(v));
      return { ...item, label, dir, why };
    });
  },[contributions, negLabel, posLabel]);

  return (
    <div
      className="relative rounded-xl border bg-white shadow-sm overflow-hidden"
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-600">Score: <span className="font-semibold">{Number(value).toFixed(2)}</span></div>
      </div>

      <div className="p-4">
        {/* labels */}
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>{negLabel}</span>
          <span>{posLabel}</span>
        </div>

        {/* track */}
        <div className="relative h-8 rounded-full" style={{ backgroundColor: color.bg }}>
          {/* midline */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ backgroundColor: "#cbd5e1" }} />
          {/* fill from center to value */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 rounded-full transition-all"
            style={{
              backgroundColor: color.bar,
              left: value >= 0 ? "50%" : `${pct}%`,
              width: `${Math.abs(pct-50)}%`,
            }}
          />
          {/* dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border"
            style={{ left: `${pct}%`, backgroundColor: color.dot, borderColor: "#fff" }}
            title={`Value: ${Number(value).toFixed(2)} (scale ±${scale})`}
          />
        </div>
      </div>

      {/* hover panel */}
      <div
        className={`absolute inset-x-0 bottom-0 pointer-events-none transition-opacity ${hover ? "opacity-100" : "opacity-0"}`}
      >
        <div className="m-3 p-3 rounded-lg border bg-white shadow-lg pointer-events-auto">
          <div className="text-sm font-semibold mb-2">Why you&apos;re here</div>
          {top.length === 0 ? (
            <p className="text-sm text-gray-600">No detailed answers for this axis yet.</p>
          ) : (
            <ul className="space-y-2">
              {top.map((t) => (
                <li key={t.qId} className="text-sm">
                  <div className="font-medium">{t.qText}</div>
                  <div className="text-gray-600">
                    Your answer: <span className="font-semibold">{t.label}</span>{" "}
                    <span className="ml-2 text-xs text-gray-500">({t.answer})</span>
                    <span className="ml-2 text-xs">{t.dir}</span>
                    <span className="ml-2">{t.why}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

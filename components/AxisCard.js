// components/AxisCard.js
import { useMemo, useState } from "react";
import DriversModal from "./DriversModal";

/**
 * AxisCard — single-axis mini graph with hover highlight,
 * a Neutral badge for near-zero values, and a "Top drivers" modal.
 *
 * Props:
 *  - title, negLabel, posLabel
 *  - value: number
 *  - contributions: [{ qId, qText, type, answer, contrib }]
 *  - color: { bg, bar, dot }
 */
export default function AxisCard({
  title,
  negLabel,
  posLabel,
  value = 0,
  contributions = [],
  color = { bg: "#eef2ff", bar: "#c7d2fe", dot: "#6366f1" },
}) {
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);

  const scale = useMemo(
    () => Math.max(5, Math.ceil(Math.max(Math.abs(value), ...contributions.map((c) => Math.abs(c.contrib || 0))))),
    [value, contributions]
  );

  const pct = ((Math.max(-scale, Math.min(scale, Number(value) || 0)) + scale) / (2 * scale)) * 100;
  const neutral = Math.abs(Number(value) || 0) <= scale * 0.05; // within 5% of scale

  const top = useMemo(() => {
    const sorted = [...contributions].sort((a, b) => Math.abs(b.contrib || 0) - Math.abs(a.contrib || 0));
    return sorted.slice(0, 5).map((item) => {
      const v = Number(item.answer);
      const dir = item.contrib > 0 ? "→" : item.contrib < 0 ? "←" : "·";
      const why =
        item.contrib === 0
          ? "Neutral effect."
          : item.contrib > 0
          ? `Pushed toward ${posLabel}`
          : `Pushed toward ${negLabel}`;
      const label =
        item.type === "yesno"
          ? v >= 3
            ? "Yes"
            : "No"
          : ({ 1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree" }[v] || String(v));
      return { ...item, label, dir, why };
    });
  }, [contributions, negLabel, posLabel]);

  const fmt2 = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "0.00");

  return (
    <div
      className="relative rounded-xl border bg-white shadow-sm overflow-hidden"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* header */}
      <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="font-semibold">{title}</div>
          {neutral && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
              Neutral
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600">
            Score: <span className="font-semibold">{fmt2(value)}</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50"
            title="See which answers drove this score"
          >
            Top drivers
          </button>
        </div>
      </div>

      {/* body */}
      <div className="p-4">
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>{negLabel}</span>
          <span>{posLabel}</span>
        </div>

        <div className="relative h-8 rounded-full" style={{ backgroundColor: color.bg }}>
          {/* center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ backgroundColor: "#cbd5e1" }} />
          {/* filled bar from center */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 rounded-full transition-all"
            style={{
              backgroundColor: color.bar,
              left: value >= 0 ? "50%" : `${pct}%`,
              width: `${Math.abs(pct - 50)}%`,
            }}
          />
          {/* dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border"
            style={{ left: `${pct}%`, backgroundColor: color.dot, borderColor: "#fff" }}
            title={`Value: ${fmt2(value)} (scale ±${scale})`}
          />
        </div>
      </div>

      {/* hover overlay quick list */}
      <div
        className={`absolute inset-x-0 bottom-0 pointer-events-none transition-opacity ${hover ? "opacity-100" : "opacity-0"}`}
      >
        <div className="m-3 p-3 rounded-lg border bg-white shadow-lg pointer-events-auto">
          <div className="text-sm font-semibold mb-2">Why you’re here</div>
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

      {/* modal with full narrative */}
      <DriversModal
        title={title}
        axisLabel={`${negLabel} ↔ ${posLabel}`}
        value={value}
        contributions={contributions}
        negLabel={negLabel}
        posLabel={posLabel}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

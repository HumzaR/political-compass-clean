// components/DriversModal.js
import Modal from "./Modal";

/**
 * DriversModal
 * Shows a narrative explaining how answers drove the axis score.
 *
 * Props:
 *  - title, axisLabel: strings
 *  - value: number
 *  - contributions: [{ qId, qText, type, answer, contrib }]
 *  - negLabel, posLabel: strings for the axis ends
 *  - isOpen, onClose
 */
export default function DriversModal({
  title,
  axisLabel,
  value = 0,
  contributions = [],
  negLabel = "Negative",
  posLabel = "Positive",
  isOpen,
  onClose,
}) {
  // Build narratives: top positives and negatives (by absolute contribution)
  const sorted = [...contributions].sort(
    (a, b) => Math.abs(b.contrib || 0) - Math.abs(a.contrib || 0)
  );
  const top = sorted.slice(0, 10); // show up to 10 items

  const toLabel = (q) => {
    const v = Number(q.answer);
    if (q.type === "yesno") return v >= 3 ? "Yes" : "No";
    const lkp = { 1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree" };
    return lkp[v] || String(v);
  };

  const why = (c) => {
    if (!c || !Number.isFinite(c.contrib)) return "Neutral effect.";
    if (c.contrib > 0) return `pushed you toward ${posLabel}.`;
    if (c.contrib < 0) return `pushed you toward ${negLabel}.`;
    return "Neutral effect.";
  };

  const fmt = (n) => (Number.isFinite(+n) ? (+n).toFixed(2) : "0.00");

  return (
    <Modal title={`Top drivers — ${title}`} isOpen={isOpen} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          Your <strong>{axisLabel}</strong> score is <strong>{fmt(value)}</strong>. Below are the answers with the
          biggest influence on that score.
        </p>

        {top.length === 0 ? (
          <p className="text-sm text-gray-600">No answers on this axis yet.</p>
        ) : (
          <ul className="divide-y">
            {top.map((c) => (
              <li key={c.qId} className="py-3">
                <div className="text-sm text-gray-500 mb-1">Contribution: <span className="font-semibold">{fmt(c.contrib)}</span></div>
                <div className="font-medium">{c.qText}</div>
                <div className="text-sm text-gray-700 mt-0.5">
                  Because you <strong>{toLabel(c)}</strong> ({c.answer}),
                  this {why(c)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

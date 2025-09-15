// components/MiniBars.js
import React from 'react';

/**
 * Simple per-axis mini-bars centered at 0.
 * values: {economic: -1..1, social: -1..1, global?: -1..1, progress?: -1..1}
 */
export default function MiniBars({ values }) {
  const entries = Object.entries(values).filter(([, v]) => typeof v === 'number');

  return (
    <div className="grid gap-3">
      {entries.map(([axis, v]) => {
        const pct = ((v + 1) / 2) * 100; // -1..1 -> 0..100
        return (
          <div key={axis}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium capitalize">{axis}</span>
              <span>{v.toFixed(2)}</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-3 rounded-full"
                style={{ width: pct + '%' }}
                aria-label={`${axis} ${v.toFixed(2)}`}
                title={`${axis}: ${v.toFixed(2)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

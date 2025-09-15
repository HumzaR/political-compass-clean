// components/TopDrivers.js
import React from 'react';

/**
 * Show top contributors with their sign and axis.
 * drivers: [{qid, text, axis, contribution}, ...]
 */
export default function TopDrivers({ drivers = [] }) {
  if (!drivers.length) return null;
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Top drivers</h3>
      <ul className="space-y-2">
        {drivers.map((d) => (
          <li key={d.qid} className="p-3 border rounded bg-white">
            <div className="text-xs text-gray-600 uppercase tracking-wide">{d.axis}</div>
            <div className="font-medium">{d.text}</div>
            <div className="text-sm mt-1">
              Contribution:{' '}
              <span className={d.contribution >= 0 ? 'text-green-700' : 'text-red-700'}>
                {d.contribution.toFixed(3)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

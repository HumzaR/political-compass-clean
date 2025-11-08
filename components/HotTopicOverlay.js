// components/HotTopicOverlay.js
import { useState } from "react";

export default function HotTopicOverlay({ topic, onAnswer, onLater }) {
  const [submitting, setSubmitting] = useState(false);

  if (!topic) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-600">Hot Topic</div>
        <h2 className="mb-4 text-2xl font-semibold">{topic.title}</h2>

        <div className="space-y-2">
          {topic.options?.map((opt) => (
            <button
              key={opt.value}
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await onAnswer(opt.value);
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-60"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={onLater}
            className="rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Answer later
          </button>
          <div className="text-xs text-gray-400">
            Your choice updates your compass instantly.
          </div>
        </div>
      </div>
    </div>
  );
}

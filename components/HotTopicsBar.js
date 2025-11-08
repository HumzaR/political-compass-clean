// components/HotTopicsBar.js
export default function HotTopicsBar({ count, onOpen }) {
  if (!count) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
      <div className="text-sm font-medium text-indigo-900">
        You have <span className="font-semibold">{count}</span> hot topic{count > 1 ? "s" : ""} to answer
      </div>
      <button
        onClick={onOpen}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Hot Topics
      </button>
    </div>
  );
}

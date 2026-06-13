import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const LENGTH_OPTIONS = [
  { value: "short", minutes: 5, label: "5", subLabel: "MIN", archiveLabel: "Short" },
  { value: "medium", minutes: 20, label: "20", subLabel: "MIN", archiveLabel: "Medium" },
  { value: "long", minutes: 45, label: "45", subLabel: "MIN", archiveLabel: "Long" },
  { value: "custom", minutes: null, label: "∞", subLabel: "CUSTOM", archiveLabel: "Custom" },
];

const DOMAIN_OPTIONS = [
  { value: "politics", label: "Politics" },
  { value: "sports", label: "Sports" },
  { value: "general", label: "General" },
];

const DEFAULT_HISTORY_COUNT = 3;

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

function getDebateModeLabel(mode) {
  if (mode === "message") return "Text";
  return "Voice";
}

function getLengthLabel(debate) {
  if (debate?.format === "custom") {
    return `${debate?.durationMinutes || "Custom"} min`;
  }

  return (
    LENGTH_OPTIONS.find((option) => option.value === debate?.format)
      ?.archiveLabel || "Short"
  );
}

function getDomainLabel(domain) {
  return (
    DOMAIN_OPTIONS.find((option) => option.value === domain)?.label ||
    "Politics"
  );
}

function normaliseRounds(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.min(20, Math.floor(number)));
}

function normaliseDurationMinutes(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 10;
  return Math.max(1, Math.min(180, Math.floor(number)));
}

function StatusPill({ status }) {
  const isLive = status === "live";
  const isEnded = status === "ended";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
        isLive
          ? "bg-[#6847f5] text-white"
          : isEnded
            ? "bg-slate-100 text-slate-500"
            : "bg-lime-200 text-lime-800"
      }`}
    >
      {isLive ? "Live" : isEnded ? "Ended" : status || "Draft"}
    </span>
  );
}

function HistoryBadge({ children }) {
  return (
    <span className="rounded-full bg-[#eef0f7] px-3 py-1 text-xs font-semibold text-slate-600">
      {children}
    </span>
  );
}

function DebateHistoryCard({ debate }) {
  return (
    <div className="rounded-3xl border border-[#e5dfd4] bg-[#f7f4ee] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-slate-950">
            {debate.title || "Untitled debate"}
          </h3>

          <div className="mt-3 flex flex-wrap gap-2">
            <HistoryBadge>{getDebateModeLabel(debate.debateMode)}</HistoryBadge>
            <HistoryBadge>{getLengthLabel(debate)}</HistoryBadge>
            <HistoryBadge>{getDomainLabel(debate.domain)}</HistoryBadge>
          </div>
        </div>

        <StatusPill status={debate.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          className="rounded-2xl bg-[#eef2fb] px-4 py-3 text-center text-sm font-bold text-slate-800 transition hover:bg-[#e4e9f7]"
          href={`/debates/${debate.id}`}
        >
          ▷ Replay
        </Link>

        <Link
          className="rounded-2xl bg-[#ede6ff] px-4 py-3 text-center text-sm font-bold text-[#6847f5] transition hover:bg-[#e5dcff]"
          href={`/debates/${debate.id}`}
        >
          ▥ Analysis
        </Link>
      </div>
    </div>
  );
}

export default function DebatesIndexPage() {
  const router = useRouter();

  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState([]);

  const [title, setTitle] = useState("");
  const [debateMode, setDebateMode] = useState("video_voice");
  const [format, setFormat] = useState("medium");
  const [customDurationMinutes, setCustomDurationMinutes] = useState(10);
  const [domain, setDomain] = useState("politics");
  const [rounds, setRounds] = useState(1);
  const [roundSubtopics, setRoundSubtopics] = useState([]);
  const [creating, setCreating] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const roundCount = useMemo(() => normaliseRounds(rounds), [rounds]);
  const durationMinutes = useMemo(
    () => normaliseDurationMinutes(customDurationMinutes),
    [customDurationMinutes]
  );

  const showRoundSubtopics = roundCount > 1;
  const visibleHistory = items.slice(0, DEFAULT_HISTORY_COUNT);
  const liveCount = items.filter((item) => item.status === "live").length;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    setRoundSubtopics((current) => {
      if (roundCount <= 1) return [];

      return Array.from({ length: roundCount }, (_, index) => {
        return current[index] || "";
      });
    });
  }, [roundCount]);

  async function loadDebates() {
    try {
      setError("");
      setLoading(true);

      const headers = await getAuthHeaders();
      const res = await fetch("/api/debates?limit=50", { headers });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body?.error || "Failed to load debates");

      setItems(Array.isArray(body?.debates) ? body.debates : []);
    } catch (e) {
      setError(e.message || "Failed to load debates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadDebates();
    else if (user === null) setLoading(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function updateRoundSubtopic(index, value) {
    setRoundSubtopics((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function changeRounds(delta) {
    setRounds((current) => normaliseRounds(Number(current || 1) + delta));
  }

  async function onCreate(e) {
    e.preventDefault();

    try {
      setError("");
      setNotice("");
      setCreating(true);

      const cleanTitle = title.trim();

      if (!cleanTitle) {
        throw new Error("Motion is required.");
      }

      if (format === "custom" && !durationMinutes) {
        throw new Error("Enter a custom debate length.");
      }

      const cleanedSubtopics = showRoundSubtopics
        ? roundSubtopics.slice(0, roundCount).map((item) => item.trim())
        : [];

      if (
        showRoundSubtopics &&
        (cleanedSubtopics.length !== roundCount ||
          cleanedSubtopics.some((item) => !item))
      ) {
        throw new Error("Add a subtopic for every round.");
      }

      const headers = {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      };

      const res = await fetch("/api/debates", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: cleanTitle,
          motionText: cleanTitle,
          debateMode,
          format,
          durationMinutes: format === "custom" ? durationMinutes : null,
          domain,
          rounds: roundCount,
          roundSubtopics: cleanedSubtopics,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body?.error || "Failed to create debate");

      const debateId = body?.debate?.id;

      if (!debateId) throw new Error("Debate created but missing debate id");

      router.push(`/debates/${debateId}/invite`);
    } catch (e) {
      setError(e.message || "Failed to create debate");
    } finally {
      setCreating(false);
    }
  }

  if (user === undefined) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] px-6 py-10 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#e5dfd4] bg-white p-8 shadow-sm">
          <h1 className="text-4xl font-black">Debates</h1>

          <p className="mt-2 text-slate-500">
            Please sign in to create and manage debates.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-2xl bg-[#6847f5] px-5 py-3 font-bold text-white"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] px-4 py-5 text-slate-950 md:px-6">
      <div className="mx-auto grid max-w-[1480px] gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <main className="rounded-[2rem] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)] md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.42em] text-[#6847f5]">
                New Session
              </div>

              <h1 className="mt-2 text-5xl font-black tracking-[-0.06em] md:text-6xl">
                The Arena
              </h1>
            </div>

            <div className="rounded-full bg-lime-200 px-4 py-2 text-sm font-black text-lime-900">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-600" />
              {liveCount} live now
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {notice}
            </div>
          ) : null}

          <form onSubmit={onCreate} className="mt-8">
            <label className="block">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-slate-500">
                Motion
              </div>

              <input
                className="w-full rounded-3xl border border-[#ddd8cf] bg-[#f7f4ee] px-6 py-5 text-xl font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#6847f5] focus:ring-4 focus:ring-[#6847f5]/10"
                placeholder="This house would..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <div>
                <div className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-slate-500">
                  Format
                </div>

                <div className="grid grid-cols-2 rounded-3xl bg-[#edf0f6] p-1.5">
                  <button
                    type="button"
                    onClick={() => setDebateMode("video_voice")}
                    className={`rounded-2xl px-5 py-3 text-base font-black transition ${
                      debateMode === "video_voice"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    🎙 Voice
                  </button>

                  <button
                    type="button"
                    onClick={() => setDebateMode("message")}
                    className={`rounded-2xl px-5 py-3 text-base font-black transition ${
                      debateMode === "message"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    T&nbsp; Text
                  </button>
                </div>
              </div>

              <label className="block">
                <div className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-slate-500">
                  Topic
                </div>

                <select
                  className="w-full rounded-3xl border border-[#ddd8cf] bg-[#f7f4ee] px-5 py-4 text-base font-semibold text-slate-950 outline-none transition focus:border-[#6847f5] focus:ring-4 focus:ring-[#6847f5]/10"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                >
                  {DOMAIN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-10">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-slate-500">
                Length
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {LENGTH_OPTIONS.map((option) => {
                  const selected = format === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormat(option.value)}
                      className={`rounded-3xl border px-4 py-5 text-center transition ${
                        selected
                          ? "border-[#6847f5] bg-[#6847f5] text-white shadow-[0_18px_35px_rgba(104,71,245,0.28)]"
                          : "border-[#ddd8cf] bg-[#f7f4ee] text-slate-950 hover:border-[#6847f5]/40"
                      }`}
                    >
                      <div className="text-3xl font-black leading-none">
                        {option.label}
                      </div>

                      <div
                        className={`mt-2 text-xs font-black uppercase tracking-[0.25em] ${
                          selected ? "text-white/75" : "text-slate-500"
                        }`}
                      >
                        {option.subLabel}
                      </div>
                    </button>
                  );
                })}
              </div>

              {format === "custom" ? (
                <div className="mt-4 rounded-3xl border border-dashed border-[#c8bdfd] bg-[#f5f1ff] p-4">
                  <label className="block">
                    <div className="mb-2 text-sm font-bold text-slate-700">
                      Custom debate length in minutes
                    </div>

                    <input
                      className="w-40 rounded-2xl border border-[#ddd8cf] bg-white px-4 py-3 text-lg font-bold text-slate-950 outline-none focus:border-[#6847f5]"
                      type="number"
                      min={1}
                      max={180}
                      value={customDurationMinutes}
                      onChange={(e) => setCustomDurationMinutes(e.target.value)}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <div>
                <div className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-slate-500">
                  Rounds
                </div>

                <div className="flex items-center overflow-hidden rounded-3xl border border-[#ddd8cf] bg-[#f7f4ee]">
                  <button
                    type="button"
                    onClick={() => changeRounds(-1)}
                    className="w-20 px-5 py-4 text-2xl font-medium text-slate-500 hover:bg-white"
                  >
                    −
                  </button>

                  <input
                    className="min-w-0 flex-1 bg-transparent py-4 text-center text-2xl font-black text-slate-950 outline-none"
                    type="number"
                    min={1}
                    max={20}
                    value={rounds}
                    onChange={(e) => setRounds(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() => changeRounds(1)}
                    className="w-20 px-5 py-4 text-2xl font-medium text-slate-500 hover:bg-white"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-slate-500">
                  Status
                </div>

                <div className="rounded-3xl border border-dashed border-[#c8bdfd] bg-[#f5f1ff] px-5 py-4 text-sm font-semibold text-slate-700">
                  <span className="mr-3 inline-block h-2 w-2 rounded-full bg-[#6847f5]" />
                  {showRoundSubtopics
                    ? `${roundCount} rounds — add a subtopic for each round.`
                    : "One-round — title is the topic."}
                </div>
              </div>
            </div>

            {showRoundSubtopics ? (
              <div className="mt-8 rounded-[2rem] border border-[#ddd8cf] bg-[#f7f4ee] p-5">
                <h2 className="text-xl font-black">Round Topics</h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Subtopics are required when the debate has more than one round.
                </p>

                <div className="mt-5 space-y-4">
                  {Array.from({ length: roundCount }, (_, index) => (
                    <label key={index} className="block">
                      <div className="mb-2 text-sm font-black text-slate-700">
                        Round {index + 1}
                      </div>

                      <input
                        className="w-full rounded-2xl border border-[#ddd8cf] bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#6847f5] focus:ring-4 focus:ring-[#6847f5]/10"
                        placeholder={`Subtopic for round ${index + 1}`}
                        value={roundSubtopics[index] || ""}
                        onChange={(e) =>
                          updateRoundSubtopic(index, e.target.value)
                        }
                        required
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-16 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setNotice("Draft saving is not enabled yet.")}
                className="text-sm font-semibold text-slate-500 hover:text-slate-950"
              >
                Save as draft
              </button>

              <button
                disabled={creating}
                className="rounded-full bg-slate-950 px-8 py-4 text-base font-black text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-[#6847f5] disabled:opacity-50"
                type="submit"
              >
                {creating ? "Creating..." : "Create debate"} →
              </button>
            </div>
          </form>
        </main>

        <aside className="rounded-[2rem] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-[-0.03em]">History</h2>

            {items.length > DEFAULT_HISTORY_COUNT ? (
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 hover:text-[#6847f5]"
              >
                All
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="mt-5 rounded-3xl bg-[#f7f4ee] p-5 text-sm font-semibold text-slate-500">
              Loading debates...
            </div>
          ) : items.length === 0 ? (
            <div className="mt-5 rounded-3xl bg-[#f7f4ee] p-5 text-sm font-semibold text-slate-500">
              No debates yet.
            </div>
          ) : (
            <>
              <div className="mt-5 space-y-4">
                {visibleHistory.map((debate) => (
                  <DebateHistoryCard key={debate.id} debate={debate} />
                ))}
              </div>

              {items.length > DEFAULT_HISTORY_COUNT ? (
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="mt-5 w-full rounded-2xl bg-[#ede6ff] px-4 py-3 text-sm font-black text-[#6847f5] transition hover:bg-[#e5dcff]"
                >
                  See more
                </button>
              ) : null}
            </>
          )}
        </aside>
      </div>

      {showHistoryModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[2rem] bg-white text-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-3xl font-black">Debate History</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  All debates created on this workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
              {items.map((debate) => (
                <DebateHistoryCard key={debate.id} debate={debate} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
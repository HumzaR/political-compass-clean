import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const LENGTH_OPTIONS = [
  { value: "short", label: "5", subLabel: "Minutes", archiveLabel: "Short" },
  { value: "medium", label: "20", subLabel: "Minutes", archiveLabel: "Medium" },
  { value: "long", label: "45", subLabel: "Minutes", archiveLabel: "Long" },
  { value: "custom", label: "Custom", subLabel: "Time", archiveLabel: "Custom" },
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
  return "Video/Voice";
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

function DebateHistoryCard({ debate }) {
  return (
    <div className="rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-5 shadow-[0_0_24px_rgba(14,165,233,0.14)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-black">
            {debate.title || "Untitled debate"}
          </h3>

          <div className="mt-3 space-y-1 text-base text-white/65">
            <div>Format: {getDebateModeLabel(debate.debateMode)}</div>
            <div>Length: {getLengthLabel(debate)}</div>
            <div>Topic: {getDomainLabel(debate.domain)}</div>
            <div>
              Status:{" "}
              <span
                className={
                  debate.status === "ended"
                    ? "text-white/70"
                    : debate.status === "live"
                      ? "text-green-300"
                      : "text-cyan-300"
                }
              >
                {debate.status}
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm text-white/60">
          {debate.debateMode === "message" ? "Text" : "Live"}
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <Link
          className="rounded-lg border border-cyan-200/20 px-5 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
          href={`/debates/${debate.id}`}
        >
          Replay
        </Link>

        <Link
          className="rounded-lg border border-cyan-200/20 px-5 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
          href={`/debates/${debate.id}`}
        >
          View Analysis
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
  const [items, setItems] = useState([]);

  const [title, setTitle] = useState("");
  const [debateMode, setDebateMode] = useState("video_voice");
  const [format, setFormat] = useState("short");
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

  async function onCreate(e) {
    e.preventDefault();

    try {
      setError("");
      setCreating(true);

      const cleanTitle = title.trim();

      if (!cleanTitle) {
        throw new Error("Title is required.");
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
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-black">Debates</h1>

          <p className="mt-2 text-white/60">
            Please sign in to create and manage debates.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-cyan-500 px-5 py-3 font-medium text-slate-950"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_left,_rgba(14,165,233,0.28),_transparent_32%),linear-gradient(135deg,#020617,#07111f_45%,#020617)] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black tracking-tight">Debate Hub</h1>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.58fr)]">
          <section>
            <h2 className="text-2xl font-black">The Arena</h2>

            <form
              onSubmit={onCreate}
              className="mt-4 rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-6 shadow-[0_0_35px_rgba(14,165,233,0.12)] backdrop-blur"
            >
              <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-black text-cyan-200">
                  1
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-black">Craft the Motion</h3>

                  <label className="mt-5 block">
                    <div className="mb-2 text-sm font-semibold text-white/80">
                      Title
                    </div>

                    <input
                      className="w-full rounded-lg border border-white/15 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-300"
                      placeholder="Enter debate title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-cyan-100">
                  2
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-black">Configure Rules</h3>

                  <div className="mt-6 grid gap-5">
                    <div className="grid gap-3 md:grid-cols-[110px_1fr] md:items-center">
                      <div className="text-sm font-semibold text-white/80">
                        Format
                      </div>

                      <div className="flex w-fit rounded-full border border-white/10 bg-slate-900/80 p-1">
                        <button
                          type="button"
                          onClick={() => setDebateMode("video_voice")}
                          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                            debateMode === "video_voice"
                              ? "bg-white/15 text-white shadow"
                              : "text-white/50 hover:text-white"
                          }`}
                        >
                          Video/Voice
                        </button>

                        <button
                          type="button"
                          onClick={() => setDebateMode("message")}
                          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                            debateMode === "message"
                              ? "bg-white/15 text-white shadow"
                              : "text-white/50 hover:text-white"
                          }`}
                        >
                          Text
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[110px_1fr] md:items-center">
                      <div className="text-sm font-semibold text-white/80">
                        Length
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4">
                        {LENGTH_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormat(option.value)}
                            className={`rounded-xl border px-3 py-4 text-center transition ${
                              format === option.value
                                ? "border-cyan-300 bg-cyan-400/15 shadow-[0_0_25px_rgba(14,165,233,0.25)]"
                                : "border-white/15 bg-slate-950/50 hover:border-white/30"
                            }`}
                          >
                            <div
                              className={
                                option.value === "custom"
                                  ? "text-base font-black leading-tight"
                                  : "text-2xl font-black"
                              }
                            >
                              {option.label}
                            </div>
                            <div className="text-sm text-white/65">
                              {option.subLabel}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {format === "custom" ? (
                      <div className="grid gap-3 md:grid-cols-[110px_1fr] md:items-center">
                        <div className="text-sm font-semibold text-white/80">
                          Minutes
                        </div>

                        <input
                          className="w-36 rounded-lg border border-white/15 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-300"
                          type="number"
                          min={1}
                          max={180}
                          value={customDurationMinutes}
                          onChange={(e) =>
                            setCustomDurationMinutes(e.target.value)
                          }
                        />
                      </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-[110px_1fr] md:items-center">
                      <div className="text-sm font-semibold text-white/80">
                        Topic
                      </div>

                      <select
                        className="w-full max-w-sm rounded-lg border border-white/15 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-300"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                      >
                        {DOMAIN_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[110px_1fr] md:items-center">
                      <div className="text-sm font-semibold text-white/80">
                        Rounds
                      </div>

                      <input
                        className="w-28 rounded-lg border border-white/15 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-300"
                        type="number"
                        min={1}
                        max={20}
                        value={rounds}
                        onChange={(e) => setRounds(e.target.value)}
                      />
                    </div>
                  </div>

                  {showRoundSubtopics ? (
                    <div className="mt-8 border-t border-white/10 pt-7">
                      <h3 className="text-2xl font-black">Round Settings</h3>

                      <p className="mt-1 text-sm text-white/50">
                        Because this debate has more than one round, every round
                        needs a required subtopic.
                      </p>

                      <div className="mt-5 space-y-4">
                        {Array.from({ length: roundCount }, (_, index) => (
                          <label key={index} className="block">
                            <div className="mb-2 text-sm font-semibold text-white/80">
                              Round {index + 1}: Subtopic
                            </div>

                            <input
                              className="w-full rounded-lg border border-white/15 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-300"
                              placeholder={`Enter subtopic for round ${index + 1}`}
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
                  ) : (
                    <div className="mt-7 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                      This is a one-round debate, so the debate title will be
                      used as the topic.
                    </div>
                  )}

                  <button
                    disabled={creating}
                    className="mt-7 rounded-xl bg-cyan-400 px-6 py-3 font-medium text-slate-950 shadow-[0_0_28px_rgba(14,165,233,0.35)] disabled:opacity-50"
                    type="submit"
                  >
                    {creating ? "Creating..." : "Create debate"}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <section>
            <h2 className="text-2xl font-black">History</h2>

            {loading ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/50">
                Loading debates...
              </div>
            ) : items.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/50">
                No debates yet.
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-5">
                  {visibleHistory.map((debate) => (
                    <DebateHistoryCard key={debate.id} debate={debate} />
                  ))}
                </div>

                {items.length > DEFAULT_HISTORY_COUNT ? (
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="mt-5 w-full rounded-xl border border-cyan-200/20 px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10"
                  >
                    See more
                  </button>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>

      {showHistoryModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-3xl rounded-2xl border border-cyan-200/20 bg-slate-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h2 className="text-2xl font-black">Debate History</h2>
                <p className="mt-1 text-sm text-white/50">
                  All debates you have created or opened recently.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
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
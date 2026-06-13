import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  BarChart3,
  ChevronDown,
  Mic,
  Minus,
  Play,
  Plus,
  Radio,
  Type,
} from "lucide-react";

const LENGTH_OPTIONS = [
  {
    value: "short",
    minutes: 5,
    label: "5",
    subLabel: "min",
    archiveLabel: "Short",
  },
  {
    value: "medium",
    minutes: 20,
    label: "20",
    subLabel: "min",
    archiveLabel: "Medium",
  },
  {
    value: "long",
    minutes: 45,
    label: "45",
    subLabel: "min",
    archiveLabel: "Long",
  },
  {
    value: "custom",
    minutes: null,
    label: "∞",
    subLabel: "custom",
    archiveLabel: "Custom",
  },
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

function Label({ children }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </span>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SegmentButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all",
        active
          ? "bg-surface text-foreground shadow-[0_2px_8px_-2px_rgba(15,23,42,0.18)]"
          : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function LengthButton({ option, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "focus-ring flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 transition-all",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_var(--primary)]"
          : "border-hairline bg-surface-2 text-foreground hover:border-primary/40",
      ].join(" ")}
    >
      <span className="font-display text-xl font-bold leading-none">
        {option.label}
      </span>

      <span
        className={[
          "mt-1 text-[10px] uppercase tracking-[0.12em]",
          selected ? "text-primary-foreground/80" : "text-muted-foreground",
        ].join(" ")}
      >
        {option.subLabel}
      </span>
    </button>
  );
}

function Tag({ children }) {
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function StatusChip({ status }) {
  if (status === "live") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
        <Radio className="h-2.5 w-2.5" />
        Live
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
      {status === "ended" ? "Ended" : status || "Draft"}
    </span>
  );
}

function DebateHistoryCard({ debate }) {
  return (
    <article className="group rounded-xl border border-hairline bg-surface-2 p-3 transition-all hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_var(--primary)]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-sm font-bold leading-tight">
          {debate.title || "Untitled debate"}
        </h3>

        <StatusChip status={debate.status} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Tag>{getDebateModeLabel(debate.debateMode)}</Tag>
        <Tag>{getLengthLabel(debate)}</Tag>
        <Tag>{getDomainLabel(debate.domain)}</Tag>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        <Link
          className="focus-ring inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted px-2 py-1.5 text-[11px] font-semibold text-foreground hover:bg-foreground hover:text-background"
          href={`/debates/${debate.id}`}
        >
          <Play className="h-3 w-3" />
          Replay
        </Link>

        <Link
          className="focus-ring inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
          href={`/debates/${debate.id}`}
        >
          <BarChart3 className="h-3 w-3" />
          Analysis
        </Link>
      </div>
    </article>
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
      <div className="min-h-screen p-3 lg:p-4">
        <div className="surface-card mx-auto max-w-3xl rounded-2xl p-5 lg:p-7">
          <h1 className="font-display text-4xl font-bold leading-[1] tracking-tight">
            Debates
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in to create and manage debates.
          </p>

          <Link
            href="/login"
            className="focus-ring mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-3 lg:p-4">
      <div className="grid min-h-[calc(100vh-2rem)] w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-4">
        <main className="surface-card flex min-h-0 flex-col overflow-hidden rounded-2xl p-5 lg:p-7">
          <header className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                New Session
              </div>

              <h1 className="mt-1 font-display text-4xl font-bold leading-[1] tracking-tight lg:text-5xl">
                The Arena
              </h1>
            </div>

            <div className="hidden items-center gap-1.5 rounded-full bg-lime-200 px-3 py-1 text-[11px] font-semibold text-foreground md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              {liveCount} live now
            </div>
          </header>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {notice}
            </div>
          ) : null}

          <form onSubmit={onCreate} className="flex min-h-0 flex-1 flex-col">
            <div className="mb-5">
              <Label>Motion</Label>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="This house would…"
                className="focus-ring mt-1.5 w-full rounded-xl border border-hairline bg-surface-2 px-4 py-3 font-display text-lg font-medium placeholder:font-normal placeholder:text-muted-foreground/50"
                required
              />
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Format">
                <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted p-1">
                  <SegmentButton
                    active={debateMode === "video_voice"}
                    onClick={() => setDebateMode("video_voice")}
                  >
                    <Mic className="h-3.5 w-3.5" />
                    Voice
                  </SegmentButton>

                  <SegmentButton
                    active={debateMode === "message"}
                    onClick={() => setDebateMode("message")}
                  >
                    <Type className="h-3.5 w-3.5" />
                    Text
                  </SegmentButton>
                </div>
              </Field>

              <Field label="Topic">
                <div className="relative">
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="focus-ring w-full appearance-none rounded-xl border border-hairline bg-surface-2 px-4 py-2.5 pr-10 text-sm font-medium"
                  >
                    {DOMAIN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </Field>

              <Field label="Length" className="sm:col-span-2">
                <div className="grid grid-cols-4 gap-2">
                  {LENGTH_OPTIONS.map((option) => (
                    <LengthButton
                      key={option.value}
                      option={option}
                      selected={format === option.value}
                      onClick={() => setFormat(option.value)}
                    />
                  ))}
                </div>

                {format === "custom" ? (
                  <div className="mt-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                    <label className="block">
                      <div className="mb-1.5 text-xs font-semibold text-foreground">
                        Custom length in minutes
                      </div>

                      <input
                        className="focus-ring w-32 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm font-semibold"
                        type="number"
                        min={1}
                        max={180}
                        value={customDurationMinutes}
                        onChange={(e) =>
                          setCustomDurationMinutes(e.target.value)
                        }
                      />
                    </label>
                  </div>
                ) : null}
              </Field>

              <Field label="Rounds">
                <div className="flex items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-1">
                  <button
                    type="button"
                    onClick={() => changeRounds(-1)}
                    className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <input
                    className="min-w-0 flex-1 bg-transparent text-center font-display text-xl font-bold outline-none"
                    type="number"
                    min={1}
                    max={20}
                    value={rounds}
                    onChange={(e) => setRounds(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() => changeRounds(1)}
                    className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </Field>

              <Field label="Status">
                <div className="flex h-[46px] items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 text-xs text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {roundCount === 1
                    ? "One-round — title is the topic."
                    : `${roundCount} rounds — add subtopics below.`}
                </div>
              </Field>

              {showRoundSubtopics ? (
                <div className="sm:col-span-2">
                  <div className="rounded-xl border border-hairline bg-surface-2 p-4">
                    <h2 className="font-display text-base font-bold">
                      Round Topics
                    </h2>

                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      Subtopics are required when the debate has more than one
                      round.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {Array.from({ length: roundCount }, (_, index) => (
                        <label key={index} className="block">
                          <div className="mb-1.5 text-xs font-semibold text-foreground">
                            Round {index + 1}
                          </div>

                          <input
                            className="focus-ring w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm"
                            placeholder={`Subtopic ${index + 1}`}
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
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setNotice("Draft saving is not enabled yet.")}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Save as draft
              </button>

              <button
                disabled={creating}
                className="focus-ring group inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_18px_40px_-12px_var(--primary)] disabled:opacity-50"
                type="submit"
              >
                {creating ? "Creating..." : "Create debate"}
                <span className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </button>
            </div>
          </form>
        </main>

        <aside className="surface-card flex min-h-0 flex-col overflow-hidden rounded-2xl p-4">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-xl font-bold tracking-tight">
              History
            </h2>

            {items.length > DEFAULT_HISTORY_COUNT ? (
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
              >
                All
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="rounded-xl bg-surface-2 p-3 text-sm font-medium text-muted-foreground">
              Loading debates...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl bg-surface-2 p-3 text-sm font-medium text-muted-foreground">
              No debates yet.
            </div>
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                {visibleHistory.map((debate) => (
                  <DebateHistoryCard key={debate.id} debate={debate} />
                ))}
              </div>

              {items.length > DEFAULT_HISTORY_COUNT ? (
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="focus-ring mt-3 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
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
          <div className="surface-card w-full max-w-3xl rounded-2xl text-foreground">
            <div className="flex items-center justify-between border-b border-hairline p-5">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  Debate History
                </h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  All debates created on this workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="focus-ring rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-foreground hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
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
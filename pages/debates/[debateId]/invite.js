import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Check, Copy, Gavel, LogIn, Send, Users } from "lucide-react";

export default function DebateInvitePage() {
  const router = useRouter();
  const { debateId } = router.query;

  const [user, setUser] = useState(undefined);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
    });

    return () => unsub();
  }, []);

  const inviteLink = useMemo(() => {
    if (!origin || !debateId) {
      return "";
    }

    return `${origin}/debates/${debateId}/join`;
  }, [origin, debateId]);

  async function copyInviteLink() {
    try {
      setError("");

      if (!inviteLink) {
        throw new Error("Invite link is not ready yet.");
      }

      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (e) {
      setError(e.message || "Could not copy invite link.");
    }
  }

  function jumpToDebate() {
    router.push(`/debates/${debateId}`);
  }

  if (user === undefined) {
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full p-3 lg:p-4">
        <div className="surface-card mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl flex-col justify-center rounded-2xl p-5 lg:p-7">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Gavel className="h-5 w-5" />
          </div>

          <div className="mt-5 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              Debate Invite
            </div>

            <h1 className="mt-1 font-display text-4xl font-bold leading-[1] tracking-tight lg:text-5xl">
              Sign in first
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm font-medium text-muted-foreground">
              Please sign in before sharing or opening this debate invite.
            </p>

            <button
              onClick={() => router.push("/login")}
              className="focus-ring mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_18px_40px_-12px_var(--primary)]"
            >
              <LogIn className="h-4 w-4" />
              Go to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-3 lg:p-4">
      <div className="grid min-h-[calc(100vh-2rem)] w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-4">
        <main className="surface-card flex min-h-0 flex-col overflow-hidden rounded-2xl p-5 lg:p-7">
          <header className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                Invite Opponent
              </div>

              <h1 className="mt-1 font-display text-4xl font-bold leading-[1] tracking-tight lg:text-5xl">
                Share the Arena
              </h1>
            </div>

            <div className="hidden items-center gap-1.5 rounded-full bg-lime-200 px-3 py-1 text-[11px] font-semibold text-foreground md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Invite ready
            </div>
          </header>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {copied ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Invite link copied.
            </div>
          ) : null}

          <section className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="rounded-2xl border border-hairline bg-surface-2 p-4 lg:p-5">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Joining Link
              </div>

              <div className="rounded-xl border border-hairline bg-surface p-3">
                <input
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
                  value={inviteLink}
                  readOnly
                  placeholder="Generating invite link..."
                />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={copyInviteLink}
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-slate-200"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy link"}
                </button>

                <button
                  onClick={jumpToDebate}
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_var(--primary)]"
                >
                  <Send className="h-4 w-4" />
                  Jump to debate
                </button>
              </div>

              <p className="mt-4 text-sm font-medium leading-6 text-muted-foreground">
                Send this link to your opponent. Once they join, go to the debate
                room and start the session when both participants are ready.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 lg:p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Users className="h-5 w-5" />
              </div>

              <h2 className="mt-4 font-display text-xl font-bold">
                Next step
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                Wait for your opponent to open the invite link. The workspace
                will show when they have joined.
              </p>

              <button
                onClick={jumpToDebate}
                className="focus-ring mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_18px_40px_-12px_var(--primary)]"
              >
                Open workspace →
              </button>
            </div>
          </section>
        </main>

        <aside className="surface-card flex min-h-0 flex-col overflow-hidden rounded-2xl p-4">
          <div className="mb-3">
            <h2 className="font-display text-xl font-bold tracking-tight">
              Invite checklist
            </h2>

            <p className="mt-1 text-sm font-medium text-muted-foreground">
              A quick check before starting.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <ChecklistItem done={Boolean(inviteLink)}>
              Invite link generated
            </ChecklistItem>

            <ChecklistItem done={copied}>
              Copy and send the link
            </ChecklistItem>

            <ChecklistItem done={false}>
              Opponent joins the debate
            </ChecklistItem>

            <ChecklistItem done={false}>
              Host starts the session
            </ChecklistItem>
          </div>

          <Link
            href="/debates"
            className="focus-ring mt-auto inline-flex items-center justify-center rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-slate-200"
          >
            Back to Arena
          </Link>
        </aside>
      </div>
    </div>
  );
}

function ChecklistItem({ done, children }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2 p-3">
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
          done
            ? "bg-lime-200 text-lime-900"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
      </div>

      <div className="text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}
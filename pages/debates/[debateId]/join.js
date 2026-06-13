import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowRight, Gavel, LogIn, ShieldCheck, Sparkles, Users } from "lucide-react";

async function getAuthHeaders() {
  const user = auth.currentUser;

  if (!user) {
    return {};
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

function JoinStep({ icon, title, body }) {
  return (
    <div className="flex gap-3 rounded-xl border border-hairline bg-surface-2 p-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs font-medium leading-5 text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}

export default function DebateJoinPage() {
  const router = useRouter();
  const { debateId } = router.query;

  const [user, setUser] = useState(undefined);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
    });

    return () => unsub();
  }, []);

  async function joinDebate() {
    try {
      setError("");
      setJoining(true);

      const res = await fetch(`/api/debates/${debateId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          displayName: user?.displayName || user?.email || "Guest",
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.error || "Could not join debate.");
      }

      router.push(`/debates/${debateId}`);
    } catch (e) {
      setError(e.message || "Could not join debate.");
    } finally {
      setJoining(false);
    }
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
              Sign in to join
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm font-medium text-muted-foreground">
              Please sign in first, then open the invite link again to join the
              debate.
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
        <main className="surface-card flex min-h-0 flex-col justify-center overflow-hidden rounded-2xl p-5 lg:p-7">
          <div className="mx-auto w-full max-w-2xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              Arena Invite
            </div>

            <h1 className="mt-1 font-display text-4xl font-bold leading-[1] tracking-tight lg:text-5xl">
              Join the debate
            </h1>

            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-muted-foreground">
              You have been invited to take the second seat in this debate.
              Once you join, the host will be able to start the session.
            </p>

            {error ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-hairline bg-surface-2 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Users className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold">
                    Ready to enter?
                  </h2>

                  <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">
                    You will join as the opponent. The workspace opens next, and
                    the host controls when the debate begins.
                  </p>
                </div>
              </div>

              <button
                onClick={joinDebate}
                disabled={joining || !debateId}
                className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_18px_40px_-12px_var(--primary)] disabled:opacity-50"
              >
                {joining ? "Joining..." : "Join debate"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <Link
                href="/debates"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Back to Arena
              </Link>
            </div>
          </div>
        </main>

        <aside className="surface-card flex min-h-0 flex-col overflow-hidden rounded-2xl p-4">
          <div className="mb-3">
            <h2 className="font-display text-xl font-bold tracking-tight">
              What happens next?
            </h2>

            <p className="mt-1 text-sm font-medium text-muted-foreground">
              The invite flow is simple.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <JoinStep
              icon={<ShieldCheck className="h-4 w-4" />}
              title="You take a seat"
              body="Joining links your account to the debate as a participant."
            />

            <JoinStep
              icon={<Users className="h-4 w-4" />}
              title="The host starts"
              body="The debate begins when the host presses start."
            />

            <JoinStep
              icon={<Sparkles className="h-4 w-4" />}
              title="AI judge scores"
              body="After the debate ends, the transcript is judged and scored."
            />
          </div>

          <div className="mt-auto rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
            <div className="text-xs font-semibold text-foreground">
              Debate ID
            </div>
            <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
              {debateId || "Loading..."}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
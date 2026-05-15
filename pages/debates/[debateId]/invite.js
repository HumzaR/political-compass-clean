import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold mb-2">
          Invite someone to debate
        </h1>

        <p className="text-gray-600 mb-5">
          Please sign in first before sharing a debate invite.
        </p>

        <button
          onClick={() => router.push("/login")}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          Go to login
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">
          Invite someone to debate
        </h1>

        <p className="text-gray-600">
          Share this link with the person you want to debate. Once they have the
          link, click Jump to debate and wait for them to join.
        </p>
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      ) : null}

      {copied ? (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-green-700">
          Invite link copied.
        </div>
      ) : null}

      <div className="rounded-xl border p-4 space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Joining link
        </label>

        <input
          className="w-full rounded border p-3"
          value={inviteLink}
          readOnly
          placeholder="Generating invite link..."
        />

        <div className="flex flex-wrap gap-3">
          <button
            onClick={copyInviteLink}
            className="rounded-lg border px-4 py-2 font-medium"
          >
            Copy joining link
          </button>

          <button
            onClick={jumpToDebate}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
          >
            Jump to debate
          </button>
        </div>
      </div>
    </div>
  );
}
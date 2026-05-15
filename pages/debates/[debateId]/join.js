import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold mb-2">Join debate</h1>
        <p className="text-gray-600">
          Please sign in first, then open the invite link again.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-5">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Join debate</h1>
        <p className="text-gray-600">
          You have been invited to join this debate.
        </p>
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      ) : null}

      <button
        onClick={joinDebate}
        disabled={joining}
        className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        {joining ? "Joining..." : "Join debate"}
      </button>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

const buttonStyle = {
  border: "1px solid #ddd",
  padding: "8px 12px",
  borderRadius: 8,
  background: "#fff",
  cursor: "pointer",
};

export default function DebateWorkspacePage() {
  const router = useRouter();
  const { debateId } = router.query;
  const [workspace, setWorkspace] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [segmentSpeaker, setSegmentSpeaker] = useState("speakerA");
  const [segmentText, setSegmentText] = useState("");
  const [roundIdInput, setRoundIdInput] = useState("");
  const [speakersInput, setSpeakersInput] = useState(
    JSON.stringify(
      {
        speakerA: {
          dimensions: {
            argumentQuality: 70,
            factualAccuracy: 70,
            rebuttalEffectiveness: 70,
            rhetoricDelivery: 70,
            topicConsistency: 70,
          },
          penalties: 0,
          bonuses: 0,
        },
      },
      null,
      2
    )
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadWorkspace = async () => {
    if (!debateId) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/debates/${debateId}/workspace`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to load workspace");
      setWorkspace(payload);
      setScorecard(null);
    } catch (err) {
      setError(err.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [debateId]);

  useEffect(() => {
    if (workspace?.debate?.status !== "live") return;
    const interval = setInterval(() => {
      loadWorkspace();
    }, 15000);
    return () => clearInterval(interval);
  }, [workspace?.debate?.status, debateId]);

  const transcriptPreview = useMemo(() => {
    return (workspace?.transcriptSegments || []).slice(-8).reverse();
  }, [workspace]);

  useEffect(() => {
    if (!workspace?.debate?.rounds?.length) return;
    const firstOpenRound = workspace.debate.rounds.find((round) => round.status !== "closed");
    if (firstOpenRound?.id) setRoundIdInput(firstOpenRound.id);
  }, [workspace]);

  const runAction = async (path) => {
    if (!debateId) return;
    setActionLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/debates/${debateId}/${path}`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Action failed");
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const loadScorecard = async () => {
    if (!debateId) return;
    setActionLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/debates/${debateId}/scorecard`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to load scorecard");
      setScorecard(payload);
    } catch (err) {
      setError(err.message || "Failed to load scorecard");
    } finally {
      setActionLoading(false);
    }
  };

  const closeRound = async () => {
    if (!debateId || !roundIdInput) return;
    setActionLoading(true);
    setError("");
    setNotice("");
    try {
      let parsedSpeakers;
      try {
        parsedSpeakers = JSON.parse(speakersInput);
      } catch {
        throw new Error("Invalid speakers JSON. Please fix formatting before closing the round.");
      }
      const response = await fetch(`/api/debates/${debateId}/rounds/${roundIdInput}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speakers: parsedSpeakers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to close round");
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to close round");
    } finally {
      setActionLoading(false);
    }
  };

  const formatSpeakersJson = () => {
    setError("");
    try {
      const parsed = JSON.parse(speakersInput);
      setSpeakersInput(JSON.stringify(parsed, null, 2));
    } catch {
      setError("Cannot format speakers JSON because it is invalid.");
    }
  };

  const addSegment = async () => {
    if (!debateId || !segmentText.trim()) return;
    setActionLoading(true);
    setError("");
    setNotice("");
    try {
      const now = Date.now();
      const response = await fetch(`/api/debates/${debateId}/transcript/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: [
            {
              speakerUserId: segmentSpeaker,
              text: segmentText.trim(),
              startMs: now,
              endMs: now + 2000,
              confidence: 0.9,
            },
          ],
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to add transcript segment");
      setSegmentText("");
      await loadWorkspace();
      setNotice("Transcript segment added.");
    } catch (err) {
      setError(err.message || "Failed to add transcript segment");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setNotice(`${label} copied.`);
      setError("");
    } catch {
      setError(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1>Debate Workspace</h1>
      <p style={{ opacity: 0.75 }}>Debate ID: {debateId || "..."}</p>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {notice ? <p style={{ color: "#047857" }}>{notice}</p> : null}
      {loading ? <p>Loading workspace...</p> : null}

      {workspace?.debate ? (
        <>
          <section style={{ marginBottom: 24 }}>
            <h2>{workspace.debate.title}</h2>
            <p>{workspace.debate.motionText}</p>
            <p>
              Status: <strong>{workspace.debate.status}</strong> · Rounds:{" "}
              <strong>{workspace.meta.roundCount}</strong> · Closed:{" "}
              <strong>{workspace.meta.closedRoundCount}</strong>
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button style={buttonStyle} disabled={actionLoading} onClick={() => runAction("start")}>
                Start debate
              </button>
              <button style={buttonStyle} disabled={actionLoading} onClick={() => runAction("end")}>
                End debate
              </button>
              <button style={buttonStyle} disabled={actionLoading} onClick={() => runAction("live/session")}>
                Create live session
              </button>
              <button style={buttonStyle} disabled={actionLoading} onClick={() => runAction("score/final")}>
                Compute final score
              </button>
              <button style={buttonStyle} disabled={actionLoading} onClick={loadScorecard}>
                Load scorecard
              </button>
              <button style={buttonStyle} disabled={loading || actionLoading} onClick={loadWorkspace}>
                Refresh
              </button>
              <button style={buttonStyle} disabled={!debateId} onClick={() => copyToClipboard(debateId, "Debate ID")}>
                Copy debate ID
              </button>
              <button
                style={buttonStyle}
                disabled={!roundIdInput}
                onClick={() => copyToClipboard(roundIdInput, "Round ID")}
              >
                Copy round ID
              </button>
            </div>
          </section>

          {scorecard ? (
            <section style={{ marginBottom: 24 }}>
              <h3>Scorecard</h3>
              <p>
                Status: <strong>{scorecard.status}</strong>
              </p>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  background: "#f8fafc",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                {JSON.stringify(scorecard.finalScore, null, 2)}
              </pre>
            </section>
          ) : null}

          <section>
            <h3>Round scoring</h3>
            <p style={{ opacity: 0.8 }}>Provide round scores as JSON and close a round.</p>
            <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
              <input
                value={roundIdInput}
                onChange={(event) => setRoundIdInput(event.target.value)}
                placeholder="Round ID"
                style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 10 }}
              />
              <textarea
                value={speakersInput}
                onChange={(event) => setSpeakersInput(event.target.value)}
                style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 10, minHeight: 160 }}
              />
              <button style={buttonStyle} disabled={actionLoading} onClick={closeRound}>
                Close round
              </button>
              <button style={buttonStyle} disabled={actionLoading} onClick={formatSpeakersJson}>
                Format JSON
              </button>
            </div>

            <h3>Latest transcript segments</h3>
            <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              <input
                value={segmentSpeaker}
                onChange={(event) => setSegmentSpeaker(event.target.value)}
                placeholder="Speaker ID"
                style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 10 }}
              />
              <textarea
                value={segmentText}
                onChange={(event) => setSegmentText(event.target.value)}
                placeholder="Add transcript text..."
                style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 10, minHeight: 80 }}
              />
              <button style={buttonStyle} disabled={actionLoading || !segmentText.trim()} onClick={addSegment}>
                Add transcript segment
              </button>
            </div>
            {transcriptPreview.length === 0 ? <p>No segments yet.</p> : null}
            <ul>
              {transcriptPreview.map((segment) => (
                <li key={segment.id} style={{ marginBottom: 8 }}>
                  <strong>{segment.speakerUserId || "Unknown speaker"}:</strong> {segment.text}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}

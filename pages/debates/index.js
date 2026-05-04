import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 14,
  marginBottom: 12,
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "8px 10px",
};

export default function DebatesPage() {
  const router = useRouter();
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    motionText: "",
    format: "short",
    domain: "politics",
    rounds: 3,
  });

  const loadDebates = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/debates?limit=25");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to load debates");
      setDebates(payload.debates || []);
    } catch (err) {
      setError(err.message || "Failed to load debates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebates();
  }, []);

  const onCreateDebate = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/debates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rounds: Number(form.rounds),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to create debate");
      if (payload?.debate?.id) {
        await router.push(`/debates/${payload.debate.id}`);
        return;
      }
      await loadDebates();
    } catch (err) {
      setError(err.message || "Failed to create debate");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1>Debates</h1>
      <p style={{ opacity: 0.75 }}>Create a debate and jump into the workspace.</p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      <section style={{ ...cardStyle, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Create Debate</h2>
        <form onSubmit={onCreateDebate} style={{ display: "grid", gap: 10 }}>
          <input
            required
            placeholder="Debate title"
            style={inputStyle}
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <textarea
            required
            placeholder="Motion text"
            style={{ ...inputStyle, minHeight: 90 }}
            value={form.motionText}
            onChange={(event) => setForm((prev) => ({ ...prev, motionText: event.target.value }))}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <select
              style={inputStyle}
              value={form.format}
              onChange={(event) => setForm((prev) => ({ ...prev, format: event.target.value }))}
            >
              <option value="short">short</option>
              <option value="long">long</option>
            </select>
            <select
              style={inputStyle}
              value={form.domain}
              onChange={(event) => setForm((prev) => ({ ...prev, domain: event.target.value }))}
            >
              <option value="politics">politics</option>
              <option value="sports">sports</option>
              <option value="general">general</option>
            </select>
            <input
              type="number"
              min={1}
              max={12}
              style={inputStyle}
              value={form.rounds}
              onChange={(event) => setForm((prev) => ({ ...prev, rounds: event.target.value }))}
            />
          </div>
          <button type="submit" disabled={submitting} style={{ ...inputStyle, cursor: "pointer", width: 180 }}>
            {submitting ? "Creating..." : "Create debate"}
          </button>
        </form>
      </section>

      <section>
        <h2>Recent debates</h2>
        {debates[0]?.id ? (
          <p style={{ marginBottom: 12 }}>
            <Link href={`/debates/${debates[0].id}`} style={{ textDecoration: "underline" }}>
              Resume latest debate
            </Link>
          </p>
        ) : null}
        {loading ? <p>Loading...</p> : null}
        {debates.length === 0 && !loading ? <p>No debates yet.</p> : null}
        {debates.map((debate) => (
          <article key={debate.id} style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>{debate.title}</h3>
            <p style={{ marginBottom: 8 }}>{debate.motionText}</p>
            <p style={{ opacity: 0.8 }}>
              Status: <strong>{debate.status}</strong> · Format: <strong>{debate.format}</strong> · Domain:{" "}
              <strong>{debate.domain}</strong>
            </p>
            <Link href={`/debates/${debate.id}`}>Open workspace</Link>
          </article>
        ))}
      </section>
    </main>
  );
}

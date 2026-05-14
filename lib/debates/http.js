export function allowMethods(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader("Allow", methods.join(", "));
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  return true;
}

export function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

export function notFound(res, message = "Resource not found") {
  return res.status(404).json({ error: message });
}

export function handleError(res, error) {
  const message = error?.message || "Internal server error";

  if (message === "Debate not found" || message === "Round not found") {
    return notFound(res, message);
  }

  const conflictMessages = [
    "Debate cannot be started from current status",
    "Debate can only be ended when live",
    "Round can only be closed while debate is live",
    "Rounds can only be closed while debate is live",
    "Round already closed",
    "Final score can only be set after debate has ended",
    "Final score can only be saved after debate has ended",
  ];

  if (conflictMessages.includes(message)) {
    return res.status(409).json({ error: message });
  }

  return res.status(500).json({ error: message });
}

async function verifyIdTokenWithFirebase(idToken) {
  const apiKey = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) return null;
  const payload = await response.json();
  return payload?.users?.[0]?.localId || null;
}

export async function getActorUid(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const idToken = authHeader.slice("Bearer ".length).trim();
    if (idToken) {
      const verifiedUid = await verifyIdTokenWithFirebase(idToken);
      if (verifiedUid) return verifiedUid;
    }
  }

  const headerUid =
    req.headers["x-user-id"] ||
    req.headers["x-user-uid"] ||
    req.headers["x-actor-uid"];
  const allowDevHeaderAuth =
    process.env.ALLOW_DEV_HEADER_AUTH === "true" || process.env.NODE_ENV !== "production";
  if (!allowDevHeaderAuth) return null;
  if (Array.isArray(headerUid)) return headerUid[0] || null;
  return headerUid || null; // local/dev fallback
}

export async function requireActor(req, res) {
  const actorUid = await getActorUid(req);
  if (!actorUid) {
    res.status(401).json({
      error: "Unauthorized. Provide Firebase Bearer token (or x-user-id header in dev).",
    });
    return null;
  }
  return actorUid;
}

export async function requireDebateOwner(req, res, debate) {
  if (!debate) {
    res.status(404).json({ error: "Debate not found." });
    return null;
  }
  const actorUid = await requireActor(req, res);
  if (!actorUid) return null;
  if (!debate.createdByUid) {
    res.status(409).json({ error: "Debate ownership is not set for this record." });
    return null;
  }
  if (debate.createdByUid !== actorUid) {
    res.status(403).json({ error: "Only the debate owner can perform this action." });
    return null;
  }
  return actorUid;
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const env = {
    // Admin SDK vars
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,

    // Client SDK vars
    NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,

    // Debate provider config
    DAILY_DOMAIN: !!process.env.DAILY_DOMAIN,
    NEXT_PUBLIC_DAILY_DOMAIN: !!process.env.NEXT_PUBLIC_DAILY_DOMAIN,
  };

  const missing = Object.entries(env)
    .filter(([, present]) => !present)
    .map(([k]) => k);

  const ok = missing.length === 0;

  return res.status(ok ? 200 : 500).json({
    ok,
    service: "debates-health",
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || "unknown",
    env,
    missing,
  });
}
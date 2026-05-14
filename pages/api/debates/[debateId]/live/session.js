import { allowMethods, handleError, requireDebateOwner } from "@/lib/debates/http";
import { buildDailyRoomUrl, getConfiguredDailyDomain } from "@/lib/debates/live";
import { getDebate, setLiveSession } from "@/lib/debates/store";

const DAILY_API_BASE = "https://api.daily.co/v1";

async function callDailyApi(path, body) {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    const error = new Error("Daily API key is missing. Set DAILY_API_KEY in Vercel.");
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`${DAILY_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      json?.error ||
      json?.info ||
      json?.message ||
      `Daily API request failed with status ${response.status}`;

    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return json;
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const { debateId } = req.query;

    const debate = await getDebate(debateId);
    if (!(await requireDebateOwner(req, res, debate))) return;

    if (debate.live?.roomUrl) {
      return res.status(200).json({ session: debate.live });
    }

    const dailyDomain = getConfiguredDailyDomain(process.env);

    if (!dailyDomain) {
      return res.status(503).json({
        error: "Live provider is not configured. Set DAILY_DOMAIN in Vercel.",
      });
    }

    const roomName = `debate-${debate.id}`;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = nowSeconds + 60 * 60 * 2; // 2 hours

    const room = await callDailyApi("/rooms", {
      name: roomName,
      privacy: "private",
      properties: {
        exp: expiresAt,
        enable_prejoin_ui: true,
        start_video_off: false,
        start_audio_off: false,
      },
    });

    const tokenPayload = await callDailyApi("/meeting-tokens", {
      properties: {
        room_name: roomName,
        is_owner: true,
        user_name: "Debater",
        exp: expiresAt,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false,
      },
    });

    const roomUrl = room?.url || buildDailyRoomUrl(dailyDomain, debate.id);
    const token = tokenPayload.token;
    const joinUrl = `${roomUrl}?t=${token}`;

    const session = {
      provider: "daily",
      roomName,
      roomUrl,
      joinUrl,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    await setLiveSession(debateId, session);

    return res.status(200).json({ session });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return handleError(res, error);
  }
}
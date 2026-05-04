import test from "node:test";
import assert from "node:assert/strict";

import { getActorUid } from "../lib/debates/http.js";

test("getActorUid returns uid from verified bearer token", async () => {
  const previousFetch = global.fetch;
  const previousApiKey = process.env.FIREBASE_API_KEY;
  try {
    process.env.FIREBASE_API_KEY = "test-key";
    global.fetch = async () => ({
      ok: true,
      async json() {
        return { users: [{ localId: "uid-from-token" }] };
      },
    });

    const req = {
      headers: {
        authorization: "Bearer token-123",
      },
    };

    const actorUid = await getActorUid(req);
    assert.equal(actorUid, "uid-from-token");
  } finally {
    global.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.FIREBASE_API_KEY;
    else process.env.FIREBASE_API_KEY = previousApiKey;
  }
});

test("getActorUid falls back to header uid in non-production", async () => {
  const req = {
    headers: {
      "x-user-id": "uid-from-header",
    },
  };

  const actorUid = await getActorUid(req);
  assert.equal(actorUid, "uid-from-header");
});

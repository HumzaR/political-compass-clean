import test from "node:test";
import assert from "node:assert/strict";

import { buildDailyRoomUrl, getConfiguredDailyDomain } from "../lib/debates/live.js";

test("buildDailyRoomUrl normalizes protocol and trailing slashes", () => {
  assert.equal(
    buildDailyRoomUrl("https://acme.daily.co/", "abc123"),
    "https://acme.daily.co/debate-abc123"
  );
  assert.equal(
    buildDailyRoomUrl("http://acme.daily.co///", "abc123"),
    "https://acme.daily.co/debate-abc123"
  );
  assert.equal(
    buildDailyRoomUrl("acme.daily.co", "abc123"),
    "https://acme.daily.co/debate-abc123"
  );
});

test("getConfiguredDailyDomain normalizes env values and handles missing config", () => {
  assert.equal(getConfiguredDailyDomain({ DAILY_DOMAIN: "https://acme.daily.co/" }), "acme.daily.co");
  assert.equal(
    getConfiguredDailyDomain({ NEXT_PUBLIC_DAILY_DOMAIN: "http://acme.daily.co///" }),
    "acme.daily.co"
  );
  assert.equal(getConfiguredDailyDomain({ DAILY_DOMAIN: "   " }), null);
  assert.equal(getConfiguredDailyDomain({}), null);
});

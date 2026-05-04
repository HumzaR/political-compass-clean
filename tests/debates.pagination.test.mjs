import test from "node:test";
import assert from "node:assert/strict";

import { normalizeLimit } from "../lib/debates/pagination.js";

test("normalizeLimit uses fallback for non-numeric input", () => {
  assert.equal(normalizeLimit(undefined), 50);
  assert.equal(normalizeLimit("foo"), 50);
});

test("normalizeLimit clamps to configured bounds", () => {
  assert.equal(normalizeLimit(0), 1);
  assert.equal(normalizeLimit(500), 100);
});

test("normalizeLimit truncates decimals", () => {
  assert.equal(normalizeLimit(12.9), 12);
});

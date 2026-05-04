import test from "node:test";
import assert from "node:assert/strict";

import { handleError } from "../lib/debates/http.js";

function createMockRes() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test("handleError maps not-found debate/round errors to 404", () => {
  const res = createMockRes();
  handleError(res, new Error("Debate not found"));
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.payload, { error: "Debate not found" });
});

test("handleError maps lifecycle state violations to 409", () => {
  const res = createMockRes();
  handleError(res, new Error("Round already closed"));
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.payload, { error: "Round already closed" });
});

test("handleError falls back to 500 for unknown errors", () => {
  const res = createMockRes();
  handleError(res, new Error("Unexpected"));
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.payload, { error: "Internal server error" });
});

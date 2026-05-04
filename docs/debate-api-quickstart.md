# Debate API Quickstart (Sprint 1)

This quickstart explains the initial API routes implemented for the debate MVP.

## Implemented endpoints

1. `POST /api/debates`
2. `GET /api/debates`
3. `POST /api/debates/:debateId/live/session`
4. `POST /api/debates/:debateId/start`
5. `POST /api/debates/:debateId/transcript/segments`
6. `POST /api/debates/:debateId/rounds/:roundId/close`
7. `POST /api/debates/:debateId/end`
8. `POST /api/debates/:debateId/score/final`
9. `GET /api/debates/:debateId/scorecard`

## Notes

- Current implementation uses an in-memory store (`lib/debates/store.js`) so data resets when the server restarts.
- This is intentional for fast iteration before wiring persistent storage.
- The scoring helper (`lib/debates/scoring.js`) already supports short/long and domain-specific weights.

# Debate API Quickstart (Sprint 1)

This quickstart explains the initial API routes implemented for the debate MVP.

## Implemented endpoints

1. `POST /api/debates`
2. `GET /api/debates`
3. `GET /api/debates/:debateId`
4. `POST /api/debates/:debateId/live/session`
5. `POST /api/debates/:debateId/start`
6. `POST /api/debates/:debateId/transcript/segments`
7. `GET /api/debates/:debateId/transcript/segments`
8. `POST /api/debates/:debateId/rounds/:roundId/close`
9. `POST /api/debates/:debateId/end`
10. `POST /api/debates/:debateId/score/final`
11. `GET /api/debates/:debateId/scorecard`
12. `GET /api/debates/:debateId/workspace`

## Notes

- Current implementation persists debate data in Firestore via `lib/debates/store.js`.
- `GET /api/debates` supports optional query param `limit` (clamped to `1..100`, default `50`).
- API owner checks expect a Firebase Bearer token by default.
- Detail and scorecard endpoints are owner-protected (`GET /api/debates/:debateId`, `GET /api/debates/:debateId/scorecard`).
- Local header-based identity (`x-user-id`, `x-user-uid`, `x-actor-uid`) can be enabled with `ALLOW_DEV_HEADER_AUTH=true` for local development workflows.
- Live-session creation expects `DAILY_DOMAIN` (or `NEXT_PUBLIC_DAILY_DOMAIN`) to be configured.
- The scoring helper (`lib/debates/scoring.js`) supports short/long formats and domain-specific weights.

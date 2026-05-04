# Daily Fast-Launch Plan (MVP)

## Recommendation
Use **Daily** for the MVP live layer because it offers:
- prebuilt and custom SDK options,
- live transcription support,
- recording options (including raw tracks),
- predictable integration speed.

## Product modes
1. **Short form**
   - 2 debaters
   - 3 rounds
   - 45-60 second turns
2. **Long form**
   - 2 debaters
   - 6 rounds
   - 2-3 minute turns

## Integration architecture
- Frontend: join Daily room + timer + round controls
- Backend API: debate state machine + score endpoints
- Worker queue: transcript processing, claim extraction, fact checks, scoring
- Database: schema in `docs/debate-db-schema.sql`
- Object storage: uploaded video/audio + generated artifacts

## Implementation sequence

### Week 1
- Create debates + rounds
- Create Daily room/token via provider adapter
- Capture and store transcript segments
- Build live status updates

### Week 2
- Implement round scoring service
- Implement penalties + tie-break logic
- Publish explainable scorecard endpoint

### Week 3
- Add overlays package (lower thirds, round banners, score ribbon)
- Add upload-processing pipeline
- Add share-card endpoint for virality

## Overlay package v1
- Speaker lower-third
- Round banner (Opening/Rebuttal/Closing)
- Running mini-score ribbon
- Final winner card

## Trust requirements
- Show why scores changed (with transcript excerpts)
- Show penalties with timestamps
- Show confidence indicator on factual scoring
- Show scoring version label

## Provider abstraction (avoid lock-in)
Define an adapter contract now:
- `createSession(debateId)`
- `startTranscription(sessionId)`
- `stopTranscription(sessionId)`
- `startRecording(sessionId)`
- `stopRecording(sessionId)`
- `terminateSession(sessionId)`

This allows future migration to LiveKit or Twilio without API redesign.

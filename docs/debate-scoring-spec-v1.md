# Debate Scoring Spec v1 (MVP)

## Purpose
This spec defines a transparent scoring system for live and uploaded debates across politics, sports, and general topics.

## Core dimensions
Each speaker receives a 0-100 score per round for five universal dimensions:

1. **Argument quality**
2. **Factual accuracy**
3. **Rebuttal effectiveness**
4. **Rhetoric & delivery**
5. **Topic consistency**

## Round scoring formula
For each round `r` and speaker `s`:

`round_score[r,s] = sum(weight[d] * dimension_score[r,s,d]) - penalties[r,s] + bonuses[r,s]`

Where:
- `dimension_score` is 0-100.
- `penalties` are explicit point deductions (ad hominem, strawman, evasion, fabricated stats).
- `bonuses` reward high-impact successful rebuttals.

Normalize final per-round score into 0-100.

## Final debate score
`final_score[s] = sum(round_weight[r] * round_score[r,s]) * confidence_factor[s]`

Where:
- `round_weight` defaults to equal distribution.
- `confidence_factor` (0.90-1.00) downweights uncertain factual analysis.

## Default weight profiles

### Long-form politics
- Argument quality: 30%
- Factual accuracy: 30%
- Rebuttal effectiveness: 20%
- Rhetoric & delivery: 10%
- Topic consistency: 10%

### Long-form sports
- Argument quality: 25%
- Factual accuracy: 20%
- Rebuttal effectiveness: 25%
- Rhetoric & delivery: 20%
- Topic consistency: 10%

### Short-form (all domains)
- Rebuttal effectiveness: 30%
- Rhetoric & delivery: 25%
- Argument quality: 20%
- Topic consistency: 15%
- Factual accuracy: 10%

## Penalty definitions (v1)
- `ad_hominem`: -4
- `strawman`: -5
- `topic_evasion`: -3
- `fabricated_stat`: -8

## Tie-break sequence
1. Argument quality
2. Factual accuracy
3. Rebuttal effectiveness
4. Rhetoric & delivery
5. Topic consistency

If still tied, result is "Split decision".

## Explainability requirements
Every final result must expose:
- round-by-round dimension breakdown,
- penalty and bonus ledger with timestamps,
- evidence links for factual claims,
- short excerpts explaining major score changes,
- scoring model version (e.g., `v1.0`).

## Claim graph requirements (MVP)
Each extracted claim should include:
- speaker,
- timestamp,
- topic tag,
- impact score,
- edges to supported/rebutted claims.

This graph is required for rebuttal scoring and dropped-argument detection.

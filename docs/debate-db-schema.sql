-- Debate platform MVP schema

create table if not exists debates (
  id uuid primary key,
  title text not null,
  motion_text text not null,
  format text not null check (format in ('short','long')),
  domain text not null check (domain in ('politics','sports','general')),
  status text not null check (status in ('scheduled','live','ended','processing','published')),
  live_provider text,
  live_room_id text,
  video_asset_url text,
  created_by text not null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists debate_participants (
  id uuid primary key,
  debate_id uuid not null references debates(id) on delete cascade,
  user_id text not null,
  side text,
  seat int,
  joined_at timestamptz,
  left_at timestamptz
);

create table if not exists rounds (
  id uuid primary key,
  debate_id uuid not null references debates(id) on delete cascade,
  round_number int not null,
  round_type text not null,
  started_at timestamptz,
  ended_at timestamptz,
  unique (debate_id, round_number)
);

create table if not exists transcript_segments (
  id uuid primary key,
  debate_id uuid not null references debates(id) on delete cascade,
  round_id uuid references rounds(id) on delete set null,
  speaker_user_id text,
  start_ms bigint not null,
  end_ms bigint not null,
  text text not null,
  source text not null check (source in ('live','upload')),
  stt_confidence numeric(5,4),
  raw_payload_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists claims (
  id uuid primary key,
  debate_id uuid not null references debates(id) on delete cascade,
  round_id uuid references rounds(id) on delete set null,
  speaker_user_id text not null,
  segment_id uuid references transcript_segments(id) on delete set null,
  claim_text text not null,
  topic_tag text,
  impact_score numeric(5,4),
  extract_confidence numeric(5,4),
  created_at timestamptz not null default now()
);

create table if not exists claim_edges (
  id uuid primary key,
  debate_id uuid not null references debates(id) on delete cascade,
  from_claim_id uuid not null references claims(id) on delete cascade,
  to_claim_id uuid not null references claims(id) on delete cascade,
  edge_type text not null check (edge_type in ('supports','rebuts','clarifies','evades')),
  edge_confidence numeric(5,4)
);

create table if not exists evidence_links (
  id uuid primary key,
  claim_id uuid not null references claims(id) on delete cascade,
  source_url text not null,
  source_type text,
  verdict text not null check (verdict in ('supported','disputed','unverifiable')),
  confidence numeric(5,4),
  notes text
);

create table if not exists dimension_scores (
  id uuid primary key,
  debate_id uuid not null references debates(id) on delete cascade,
  round_id uuid references rounds(id) on delete set null,
  speaker_user_id text not null,
  argument_quality numeric(5,2) not null,
  factual_accuracy numeric(5,2) not null,
  rebuttal_effectiveness numeric(5,2) not null,
  rhetoric_delivery numeric(5,2) not null,
  topic_consistency numeric(5,2) not null,
  confidence_factor numeric(5,4) not null default 1.0,
  model_version text not null,
  computed_at timestamptz not null default now()
);

create table if not exists penalty_events (
  id uuid primary key,
  debate_id uuid not null references debates(id) on delete cascade,
  round_id uuid references rounds(id) on delete set null,
  speaker_user_id text not null,
  penalty_type text not null,
  points int not null,
  trigger_segment_id uuid references transcript_segments(id) on delete set null,
  reason_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists round_results (
  id uuid primary key,
  debate_id uuid not null references debates(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  speaker_user_id text not null,
  base_score numeric(5,2) not null,
  penalty_total numeric(5,2) not null,
  bonus_total numeric(5,2) not null,
  round_score numeric(5,2) not null,
  computed_at timestamptz not null default now(),
  unique (debate_id, round_id, speaker_user_id)
);

create table if not exists debate_results (
  debate_id uuid primary key references debates(id) on delete cascade,
  speaker_a_user_id text not null,
  speaker_b_user_id text not null,
  speaker_a_score numeric(6,2) not null,
  speaker_b_score numeric(6,2) not null,
  winner_user_id text,
  tie_break_used boolean not null default false,
  result_explanation_json jsonb,
  published_at timestamptz
);

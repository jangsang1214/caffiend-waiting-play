-- CAFFIEND MOMENTS — RISE
-- Production leaderboard / reward storage for Supabase Postgres.
-- The browser must NOT receive the service-role key. Writes are intended to go through the Edge Function.

create extension if not exists pgcrypto;

create table if not exists public.rise_scores (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  season_id text not null check (season_id in ('spring','summer','autumn','winter')),
  day_key date not null,
  score integer not null check (score between 0 and 20000),
  play_id text not null,
  device_hash text not null,
  session_id text,
  perfect_rate integer check (perfect_rate between 0 and 100),
  max_combo integer check (max_combo between 0 and 100),
  tap_count integer check (tap_count between 0 and 200),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (store_id, play_id)
);

create index if not exists rise_scores_daily_rank_idx
  on public.rise_scores (store_id, season_id, day_key, score desc, created_at asc);

create index if not exists rise_scores_device_idx
  on public.rise_scores (store_id, device_hash, created_at desc);

create table if not exists public.rise_reward_claims (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  season_id text not null check (season_id in ('spring','summer','autumn','winter')),
  day_key date not null,
  score_id uuid not null references public.rise_scores(id) on delete cascade,
  device_hash text not null,
  claim_code text not null unique,
  status text not null default 'issued' check (status in ('issued','redeemed','void')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  unique (store_id, day_key, device_hash)
);

alter table public.rise_scores enable row level security;
alter table public.rise_reward_claims enable row level security;

-- No anon insert/update policies are intentionally defined.
-- The Edge Function uses SUPABASE_SERVICE_ROLE_KEY on the server side.

comment on table public.rise_scores is 'Verified submissions for CAFFIEND MOMENTS RISE.';
comment on table public.rise_reward_claims is 'One-per-device daily reward issuance. Benefit policy is controlled outside this schema.';

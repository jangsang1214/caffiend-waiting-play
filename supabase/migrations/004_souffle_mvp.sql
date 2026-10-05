-- CAFFIEND soufflé maker MVP analytics + validated run storage
-- Browser clients never receive the service-role key. All writes go through souffle-api.

create table if not exists public.souffle_runs (
  session_id text primary key,
  store_id text not null,
  player_hash text not null,
  nickname text not null check (char_length(nickname) between 2 and 10),
  menu_id text not null check (menu_id in ('lotus','chestnut','sesame','peach','dubai','injeolmi','brulee')),
  season text not null check (season in ('spring','summer','autumn','winter')),
  elapsed_ms integer not null check (elapsed_ms between 30000 and 1800000),
  overtime_ms integer not null default 0 check (overtime_ms between 0 and 1800000),
  score integer not null check (score between 0 and 5000),
  timing_score integer not null check (timing_score between 0 and 100),
  step_results jsonb not null,
  completed_at timestamptz not null default now()
);

create index if not exists souffle_runs_store_completed_idx
  on public.souffle_runs (store_id, completed_at desc);

create index if not exists souffle_runs_player_idx
  on public.souffle_runs (store_id, player_hash, completed_at desc);

create table if not exists public.souffle_feedback (
  session_id text primary key references public.souffle_runs(session_id) on delete cascade,
  store_id text not null,
  player_hash text not null,
  fun_rating smallint not null check (fun_rating between 1 and 5),
  wait_rating smallint not null check (wait_rating between 1 and 5),
  anticipation_rating smallint not null check (anticipation_rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists souffle_feedback_store_created_idx
  on public.souffle_feedback (store_id, created_at desc);

alter table public.souffle_runs enable row level security;
alter table public.souffle_feedback enable row level security;

comment on table public.souffle_runs is 'Validated CAFFIEND souffle-maker completions. No anonymous table policy; souffle-api writes with service role.';
comment on table public.souffle_feedback is 'Three-question MVP validation feedback linked to a completed souffle run.';

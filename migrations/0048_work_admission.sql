-- Bounded admission across Node/VPS processes. This table never replaces a financial ledger.
create table if not exists work_admissions (
  id text primary key,
  user_id text not null,
  provider text not null,
  model text not null,
  lane text not null,
  status text not null default 'running',
  heartbeat_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists work_admissions_running_idx on work_admissions (lane, user_id, provider, model, heartbeat_at) where status = 'running';

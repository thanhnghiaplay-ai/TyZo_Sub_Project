-- Per-attempt numeric evidence survives lease reaping. No audio/transcript or customer ledger is copied.
create table if not exists run_modal_settlements (
  attempt text primary key,
  ticket_id text not null references run_tickets(id) on delete cascade,
  part_hash text not null,
  status text not null default 'running',
  actual_tokens bigint not null default 0,
  charged_tokens bigint not null default 0,
  short_tokens bigint not null default 0,
  observed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists run_modal_settlements_reconcile_idx on run_modal_settlements(ticket_id, status);

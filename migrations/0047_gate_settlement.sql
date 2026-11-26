-- RE2-002: additive per-call settlement evidence; no historical ledger rewrite.
alter table run_gate_calls add column if not exists observed_at timestamptz;
alter table run_gate_calls add column if not exists actual_units numeric not null default 0;
alter table run_gate_calls add column if not exists charged_units numeric not null default 0;
alter table run_gate_calls add column if not exists short_units numeric not null default 0;
alter table run_gate_calls add column if not exists base_vnd numeric not null default 0;
alter table run_gate_calls add column if not exists provider text not null default '';
alter table run_gate_calls add column if not exists model text not null default '';
create index if not exists run_gate_calls_reconcile_idx on run_gate_calls (ticket_id, created_at)
  where status in ('mat-phan-hoi', 'can-doi-soat');

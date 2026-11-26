-- Bind room-key asynchronous ASR jobs to the verified owner and reservation.
-- Existing upstream jobs have no trustworthy ownership data to backfill automatically.
create table if not exists run_async_asr_jobs (
  id text primary key,
  user_id text not null,
  ticket_id text not null references run_tickets(id) on delete cascade,
  request_hash text not null,
  call_id text not null references run_gate_calls(id),
  provider text not null,
  model text not null,
  task_id text,
  state text not null default 'pending',
  price_book text not null,
  unit_book text not null,
  deadline_at timestamptz not null default now() + interval '6 hours',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists run_async_asr_jobs_request_idx on run_async_asr_jobs(ticket_id,request_hash) where state <> 'failed';
create unique index if not exists run_async_asr_jobs_task_idx on run_async_asr_jobs(provider,task_id) where task_id is not null;
create index if not exists run_async_asr_jobs_call_idx on run_async_asr_jobs(call_id);
create index if not exists run_async_asr_jobs_active_idx on run_async_asr_jobs(provider,model,deadline_at) where state in ('pending','running','unknown');

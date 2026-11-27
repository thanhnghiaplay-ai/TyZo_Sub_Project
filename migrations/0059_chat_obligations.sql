-- RE6-001: giữ hồ sơ đối soát độc lập để đóng hoặc xóa phiếu không xóa nghĩa vụ.
-- Bản ghi cũ có thể là ASR hoặc chat, và tổng hợp chi phí cũ có thể đã chứa ước tính.
create table if not exists run_chat_obligations (
  call_id text primary key,
  ticket_id text not null,
  user_id text not null,
  provider text not null,
  model text not null,
  created_at timestamptz not null default clock_timestamp(),
  legacy boolean not null default false,
  estimated_units numeric check (estimated_units > 0),
  rate_vnd numeric check (rate_vnd > 0),
  status text not null default 'active' check (status in ('active', 'pending', 'reviewed')),
  reported_usd_micro bigint check (reported_usd_micro >= 0),
  verified_usd_micro bigint check (verified_usd_micro >= 0),
  reviewed_at timestamptz,
  reviewed_by text,
  evidence text,
  check (
    (status = 'reviewed' and reviewed_at is not null and reviewed_by is not null and evidence is not null and verified_usd_micro is not null)
    or (status <> 'reviewed' and reviewed_at is null and reviewed_by is null and evidence is null and verified_usd_micro is null)
  ),
  check (status <> 'active' or (not legacy and estimated_units is not null)),
  check (legacy or rate_vnd is not null)
);

create index if not exists run_chat_obligations_exposure_idx
  on run_chat_obligations (user_id) include (estimated_units)
  where status in ('active', 'pending');
create index if not exists run_chat_obligations_queue_idx
  on run_chat_obligations (created_at, call_id) where status in ('active', 'pending');

insert into run_chat_obligations (call_id, ticket_id, user_id, provider, model, created_at, legacy, estimated_units, status)
select c.id, c.ticket_id, t.user_id, c.provider, c.model, c.created_at, true,
  case when c.short_units > 0 then c.short_units end, 'pending'
from run_gate_calls c join run_tickets t on t.id = c.ticket_id
where t.unit = 'token' and c.status in ('can-doi-soat', 'mat-phan-hoi') and c.charged_units = 0
  and not exists (select 1 from run_async_asr_jobs j where j.call_id = c.id)
on conflict (call_id) do nothing;

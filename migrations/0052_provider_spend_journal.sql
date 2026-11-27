-- Durable numeric supplier-cost observations. No audio, transcript or API credential.
-- Pending observations remain in reports if posting the daily aggregate fails.
-- Preserve every existing integer; allow pre-rounding supplier expense without changing customer debits.
alter table provider_spend alter column base_vnd type numeric using base_vnd::numeric;
create table if not exists provider_spend_events (
  id text primary key,
  day date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  provider text not null,
  model text not null,
  base_vnd numeric not null check (base_vnd >= 0),
  usd_micro bigint not null check (usd_micro >= 0),
  posted_at timestamptz,
  tries integer not null default 0,
  last_error_code text not null default '',
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists provider_spend_events_pending_idx on provider_spend_events(created_at) where posted_at is null;
create index if not exists provider_spend_events_pending_day_idx on provider_spend_events(day,provider,model) where posted_at is null;

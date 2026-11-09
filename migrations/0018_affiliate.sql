create table if not exists affiliates (
  user_id text primary key,
  code text not null unique,
  status text not null default 'cho-duyet',
  rate_plan_bp integer not null default 0,
  rate_run_bp integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  user_id text primary key,
  affiliate_id text not null references affiliates (user_id),
  attached_at timestamptz not null default now()
);

create table if not exists commission_events (
  id bigserial primary key,
  affiliate_id text not null,
  referred_user_id text not null,
  source_kind text not null,
  source_ref text not null,
  base_amount integer not null,
  rate_bp integer not null,
  amount integer not null,
  status text not null default 'treo',
  available_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (source_kind, source_ref)
);

create table if not exists affiliate_payouts (
  id bigserial primary key,
  affiliate_id text not null,
  amount integer not null check (amount > 0),
  status text not null default 'cho-chi',
  paid_ref text not null default '',
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);

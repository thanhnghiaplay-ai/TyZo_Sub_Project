create table if not exists room_accounts (
  user_id text primary key,
  balance integer not null default 0,
  plan text,
  plan_until timestamptz
);

create table if not exists room_ledger (
  id serial primary key,
  user_id text not null,
  kind text not null,
  amount integer not null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists room_ledger_user_idx on room_ledger (user_id, id desc);

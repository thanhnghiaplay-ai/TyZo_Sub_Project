create table if not exists run_tickets (
  id text primary key,
  user_id text not null,
  file_name text not null default '',
  seconds integer not null default 0,
  rate integer not null default 0,
  held integer not null default 0,
  charged integer not null default 0,
  released integer not null default 0,
  refunded integer not null default 0,
  status text not null,
  created_at timestamptz not null default now()
);

create index if not exists run_tickets_user_idx on run_tickets (user_id, created_at desc);
create index if not exists run_tickets_time_idx on run_tickets (created_at desc);

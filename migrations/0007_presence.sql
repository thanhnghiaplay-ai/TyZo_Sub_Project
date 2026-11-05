create table if not exists room_presence (
  user_id text primary key,
  seen_at timestamptz not null default now()
);

create index if not exists room_presence_seen_idx on room_presence (seen_at desc);

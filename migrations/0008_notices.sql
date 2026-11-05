create table if not exists room_notices (
  id serial primary key,
  user_id text,
  kind text not null,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists room_notices_user_idx on room_notices (user_id, id desc);
create index if not exists room_notices_kind_idx on room_notices (kind, id desc);

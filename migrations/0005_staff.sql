alter table room_accounts add column if not exists status text not null default 'open';
alter table room_accounts add column if not exists status_reason text not null default '';
alter table room_accounts add column if not exists staff_note text not null default '';

create table if not exists room_staff (
  user_id text primary key,
  role text not null,
  created_at timestamptz not null default now()
);

create table if not exists room_appeals (
  id serial primary key,
  user_id text,
  email text not null,
  body text not null,
  status text not null default 'cho',
  reply text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists room_appeals_email_idx on room_appeals (email, id desc);

create table if not exists room_audit (
  id serial primary key,
  actor_id text not null,
  action text not null,
  target_id text,
  note text not null default '',
  created_at timestamptz not null default now()
);

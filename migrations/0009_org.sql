alter table room_audit add column if not exists actor_email text not null default '';
alter table room_audit add column if not exists actor_role text not null default '';
alter table room_audit add column if not exists target_email text not null default '';

alter table room_staff add column if not exists nickname text not null default '';

alter table room_appeals add column if not exists hold_role text not null default 'ho-tro';
alter table room_appeals add column if not exists touched_at timestamptz not null default now();

alter table room_notices add column if not exists appeal_id integer;

create table if not exists room_costs (
  id serial primary key,
  spent_on date not null,
  label text not null,
  amount integer not null,
  created_at timestamptz not null default now()
);

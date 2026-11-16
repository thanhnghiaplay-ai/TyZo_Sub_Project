alter table run_tickets add column if not exists unit text not null default 'vnd';

create table if not exists token_grants (
  id text primary key,
  user_id text not null,
  tokens integer not null,
  left_tokens integer not null,
  price_vnd integer not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists token_grants_user_idx on token_grants (user_id, expires_at);

create table if not exists token_slices (
  ticket_id text not null references run_tickets (id) on delete cascade deferrable initially deferred,
  grant_id text not null references token_grants (id),
  left_tokens integer not null,
  charged integer not null default 0,
  primary key (ticket_id, grant_id)
);

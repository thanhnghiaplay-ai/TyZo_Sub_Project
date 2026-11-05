create table if not exists pay_settings (
  id integer primary key default 1,
  sepay_key text not null default '',
  sepay_bank text not null default '',
  sepay_account text not null default '',
  sepay_name text not null default '',
  casso_token text not null default '',
  casso_key text not null default '',
  casso_bank text not null default '',
  casso_account text not null default '',
  casso_name text not null default '',
  constraint pay_settings_one check (id = 1)
);

create table if not exists pay_orders (
  id text primary key,
  user_id text not null,
  provider text not null,
  amount integer not null,
  code text not null unique,
  status text not null default 'pending',
  provider_ref text,
  created_at timestamptz not null default now()
);

create table if not exists pay_seen (
  provider text not null,
  provider_ref text not null,
  primary key (provider, provider_ref)
);

create table if not exists glossary_meta (
  id int primary key,
  seeded boolean not null default false
);

insert into glossary_meta (id, seeded) values (1, false)
on conflict (id) do nothing;

create table if not exists glossary_packs (
  lang text not null,
  genre text not null,
  hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (lang, genre)
);

create table if not exists glossary_terms (
  id bigserial primary key,
  lang text not null,
  genre text not null,
  source text not null,
  target text not null,
  renders jsonb,
  note text not null default '',
  whole_word boolean,
  case_sensitive boolean,
  hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  foreign key (lang, genre) references glossary_packs (lang, genre)
);

create unique index if not exists glossary_terms_key
  on glossary_terms (lang, genre, lower(source));

create table if not exists glossary_suggestions (
  id bigserial primary key,
  user_id text not null,
  lang text not null,
  genre text not null,
  source text not null,
  target text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  unique (user_id, lang, genre, source)
);

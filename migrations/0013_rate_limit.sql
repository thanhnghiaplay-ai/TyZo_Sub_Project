create table if not exists rate_hits (
  bucket text not null,
  window_start bigint not null,
  hits int not null default 0,
  primary key (bucket, window_start)
);

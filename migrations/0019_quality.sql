-- Số liệu chất lượng nhận dạng, một dòng mỗi lần chạy. Chỉ có số.
-- Không có chữ phụ đề, tên tệp, video, âm thanh, khóa hay mã tài khoản.
create table if not exists quality_runs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  app_version text not null,
  key_source text not null,
  asr_model text not null,
  source_lang text not null,
  seconds integer not null default 0,
  segments integer not null default 0,
  band_high integer not null default 0,
  band_check integer not null default 0,
  band_low integer not null default 0,
  band_unknown integer not null default 0,
  conf_mean double precision,
  parts_total integer not null default 0,
  parts_whisper integer not null default 0,
  parts_empty integer not null default 0,
  parts_silence integer not null default 0,
  parts_decode_fail integer not null default 0,
  app_filtered integer not null default 0,
  kept_cues integer not null default 0,
  health text not null default 'unknown',
  lang_check boolean not null default false,
  lang_suspect integer not null default 0,
  lang_resent integer not null default 0,
  lang_swapped integer not null default 0,
  lang_before double precision,
  lang_after double precision
);

create index if not exists quality_runs_time_idx on quality_runs (created_at desc);

-- v5.42.0: số đo độ trễ Dịch trực tiếp, cầu nối ghi một dòng khi mỗi phiên đóng.
-- Không có tài khoản, không có chữ hay tiếng: chỉ model, thời gian (mili giây) và lý do dừng. Giữ 30 ngày.
create table if not exists live_latency (
  id bigserial primary key,
  at timestamptz not null default now(),
  model text not null,
  ready_ms integer,
  first_text_ms integer,
  tam_ms integer[] not null default '{}',
  chot_ms integer[] not null default '{}',
  audio_seconds integer not null default 0,
  reconnects integer not null default 0,
  end_reason text not null default ''
);
create index if not exists live_latency_at_idx on live_latency (at);

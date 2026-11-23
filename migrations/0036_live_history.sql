-- v5.44.0: lịch sử Dịch trực tiếp đồng bộ giữa web và ứng dụng Android (Chủ yêu cầu 23/11/2026).
-- Mỗi tài khoản giữ tối đa 30 phiên, mỗi phiên tối đa 30 ngày (live-history.ts). Xóa tài khoản thì xóa hết.
-- client_id do máy khách sinh để gửi lại không tạo bản trùng.
create table if not exists live_history (
  id text primary key,
  user_id text not null,
  client_id text not null,
  via text not null default 'web',
  model text not null default '',
  target text not null default '',
  started_at timestamptz not null,
  duration_ms integer not null default 0,
  line_count integer not null default 0,
  preview text not null default '',
  cues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index if not exists live_history_user_idx on live_history (user_id, started_at desc);

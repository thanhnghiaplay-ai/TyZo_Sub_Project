-- v5.41.0: phát hiện tài khoản có dấu hiệu vi phạm điều khoản. Ghi dữ kiện từ lúc xảy ra (phiên đăng nhập bị xóa khi thoát,
-- trạng thái «đã báo chuyển» bị ghi đè khi đơn hết hạn) để khi dựng cờ có bằng chứng cụ thể. Giữ 180 ngày.
create table if not exists account_events (
  id bigserial primary key,
  user_id text not null,
  kind text not null,
  ip text not null default '',
  ua text not null default '',
  device text not null default '',
  ref text not null default '',
  at timestamptz not null default now()
);
create index if not exists account_events_user_idx on account_events (user_id, at desc);
create index if not exists account_events_ip_idx on account_events (ip, at desc);
create index if not exists account_events_device_idx on account_events (device, at desc);

-- Mỗi lần một bucket giới hạn tần suất bị vượt (ghi một dòng cho mỗi khung thời gian).
create table if not exists rate_blocks (
  id bigserial primary key,
  bucket text not null,
  at timestamptz not null default now()
);
create index if not exists rate_blocks_bucket_idx on rate_blocks (bucket, at desc);

-- Địa chỉ mạng mỗi máy ứng dụng Android đã dùng.
create table if not exists app_device_ips (
  device_id text not null,
  ip text not null,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  uses integer not null default 1,
  primary key (device_id, ip)
);

-- Cờ kèm hồ sơ bằng chứng chụp lúc phát hiện (evidence) và mã băm SHA-256 của hồ sơ.
create table if not exists risk_flags (
  id bigserial primary key,
  user_id text not null,
  rule text not null,
  recommend text not null default 'khoa',
  score integer not null default 0,
  status text not null default 'mo',
  summary text not null default '',
  evidence text not null default '',
  evidence_hash text not null default '',
  auto_action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  decision_note text not null default ''
);
create unique index if not exists risk_flags_open_idx on risk_flags (user_id, rule) where status = 'mo';
create index if not exists risk_flags_user_idx on risk_flags (user_id, created_at desc);

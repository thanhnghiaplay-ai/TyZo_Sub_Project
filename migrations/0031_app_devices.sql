-- v5.37.0: ứng dụng Android liên kết với tài khoản bằng mã ngắn lấy ở trang Tài khoản.
-- Chỉ lưu băm SHA-256 của mã và của khóa máy, không lưu bản gốc.
create table if not exists app_link_codes (
  code_hash text primary key,
  user_id text not null,
  expires_at timestamptz not null
);
create index if not exists app_link_codes_user_idx on app_link_codes (user_id);

create table if not exists app_devices (
  id text primary key,
  user_id text not null,
  token_hash text not null unique,
  name text not null default '',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists app_devices_user_idx on app_devices (user_id);

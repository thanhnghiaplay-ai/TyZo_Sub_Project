-- Hồ sơ sửa triệt để v5.49.1, AZ-006: mã dùng một lần của lệnh quét đêm (chống gửi lại chữ ký đã thu được). Chỉ THÊM bảng.
create table if not exists sweep_nonces (
  nonce text primary key,
  created_at timestamptz not null default now()
);

-- Hồ sơ sửa triệt để v5.49.1, R5-006: việc ghi hoa hồng của đơn đã trả được xếp hàng TRONG CÙNG câu lệnh đánh dấu đã trả
-- (không còn «đơn đã trả mà hoa hồng lỗi thì mất»). Hàng đợi được xử lý ngay sau đó và thử lại về sau; mỗi nguồn chỉ một
-- khoản (commission_events unique (source_kind, source_ref)). Chỉ THÊM bảng.
create table if not exists commission_outbox (
  source_kind text not null,
  source_ref text not null,
  user_id text not null,
  revenue integer not null,
  tokens integer not null default 0,
  tries integer not null default 0,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  done_at timestamptz,
  primary key (source_kind, source_ref)
);
create index if not exists commission_outbox_pending on commission_outbox (created_at) where done_at is null;

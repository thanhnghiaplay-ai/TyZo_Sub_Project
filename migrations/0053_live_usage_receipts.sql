-- RE3-001: biên nhận bền cho từng quan sát usage của Dịch trực tiếp.
-- Một giao dịch ghi biên nhận + quan sát chi phí nhà cung cấp + khoản trừ phiếu; lặp lại cùng mã trả đúng kết quả đã lưu.
-- Chỉ thêm bảng mới. Không đổi giá, quy Token hay số liệu cũ. Không chứa audio, bản dịch hay key.
create table if not exists live_usage_receipts (
  id text primary key,
  user_id text not null,
  session_id text not null,
  connection_id text not null,
  model text not null,
  cost integer not null check (cost >= 0),
  base_vnd numeric not null check (base_vnd >= 0),
  supplier_vnd numeric not null check (supplier_vnd >= 0),
  taken integer not null default 0 check (taken >= 0),
  shortfall integer not null default 0 check (shortfall >= 0),
  allocation jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists live_usage_receipts_session_idx on live_usage_receipts(session_id);
create index if not exists live_usage_receipts_shortfall_idx on live_usage_receipts(created_at) where shortfall > 0;

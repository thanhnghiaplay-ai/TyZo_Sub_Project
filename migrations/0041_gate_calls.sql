-- Hồ sơ sửa triệt để v5.49.1, RE-002: mỗi lệnh gọi Groq/Alibaba qua cửa trả theo lượt giữ riêng phần ước tính trên
-- phiếu TRƯỚC khi gọi nhà cung cấp (cộng vào run_tickets.modal_reserved, cột giữ chung cho mọi việc đang chạy).
-- Bảng chỉ THÊM, không đụng dữ liệu cũ. Dòng quá 24 giờ được dọn.
create table if not exists run_gate_calls (
  id text primary key,
  ticket_id text not null references run_tickets(id) on delete cascade,
  reserved numeric not null default 0,
  -- dang-chay: đang gọi nhà; xong: đã trừ; loi: nhà báo lỗi, đã nhả; mat-phan-hoi: không nhận được trả lời (cần đối soát)
  status text not null default 'dang-chay',
  heartbeat_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists run_gate_calls_ticket_idx on run_gate_calls (ticket_id, status);

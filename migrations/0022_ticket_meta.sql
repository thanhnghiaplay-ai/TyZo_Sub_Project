-- Phiếu trả theo lượt ghi thêm model đã dùng và giờ xử lý xong, để Admin lọc và xem thời gian xử lý.
-- Phiếu cũ để trống: cột Model và Thời gian xử lý hiện «—».
alter table run_tickets add column if not exists asr_model text not null default '';
alter table run_tickets add column if not exists chat_model text not null default '';
alter table run_tickets add column if not exists closed_at timestamptz;

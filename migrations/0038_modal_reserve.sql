-- Kiểm toán v5.49 (MAIN-023/024/036): giữ riêng phần ước tính của từng đoạn TyZo Modal đang chạy.
-- Chỉ THÊM, giá trị mặc định 0/false: dữ liệu và phiếu cũ đọc như trước, quay về bản cũ không cần gỡ cột.

-- Trước tiên dựng lại phần của 0037 nếu thiếu (gặp 27/11/2026 trên VPS: CSDL chép từ Neon có ghi 0037 đã chạy nhưng
-- thiếu bảng run_modal_parts). Mọi lệnh đều «if not exists», CSDL đủ rồi thì không đổi gì.
alter table run_tickets add column if not exists modal_price text;
alter table run_tickets add column if not exists modal_seconds numeric not null default 0;
-- Token phải thu theo số thực nhưng phiếu không còn giữ đủ (ghi để Chủ đối soát, không trừ thêm của khách).
alter table run_tickets add column if not exists modal_short integer not null default 0;

-- Mỗi đoạn âm thanh gửi TyZo Modal trong một phiếu: chống trừ hai lần khi trình duyệt gửi lại cùng đoạn.
create table if not exists run_modal_parts (
  ticket_id text not null references run_tickets(id) on delete cascade,
  part_hash text not null,
  seconds numeric not null,
  status text not null default 'dang-chay',
  tokens integer not null default 0,
  segments text,
  created_at timestamptz not null default now(),
  primary key (ticket_id, part_hash)
);

alter table run_tickets add column if not exists modal_reserved numeric not null default 0;
-- Khách đóng phiếu lúc còn đoạn đang chạy: chờ đoạn cuối quyết toán rồi mới đóng (không mất tiền đoạn đó).
alter table run_tickets add column if not exists close_wanted boolean not null default false;
alter table run_tickets add column if not exists close_failed boolean not null default false;
alter table run_modal_parts add column if not exists reserved numeric not null default 0;

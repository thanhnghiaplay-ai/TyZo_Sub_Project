-- Kiểm toán v5.49 (MAIN-023/024/036): giữ riêng phần ước tính của từng đoạn TyZo Modal đang chạy.
-- Chỉ THÊM cột, giá trị mặc định 0/false: dữ liệu và phiếu cũ đọc như trước, quay về bản cũ không cần gỡ cột.
alter table run_tickets add column if not exists modal_reserved numeric not null default 0;
-- Khách đóng phiếu lúc còn đoạn đang chạy: chờ đoạn cuối quyết toán rồi mới đóng (không mất tiền đoạn đó).
alter table run_tickets add column if not exists close_wanted boolean not null default false;
alter table run_tickets add column if not exists close_failed boolean not null default false;
alter table run_modal_parts add column if not exists reserved numeric not null default 0;

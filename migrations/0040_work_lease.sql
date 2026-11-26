-- Hồ sơ sửa triệt để v5.49.1, RE-001: đoạn TyZo Modal «đang chạy» được tính theo nhịp sống (heartbeat), không theo
-- 15 phút cố định kể từ lúc gửi. Mỗi lần chạy một đoạn có mã lượt (attempt): chỉ lượt đang giữ mã mới được quyết toán.
-- Chỉ THÊM cột, có giá trị mặc định; mã cũ không đọc các cột này nên quay về bản cũ không cần gỡ.
alter table run_modal_parts add column if not exists heartbeat_at timestamptz not null default now();
alter table run_modal_parts add column if not exists attempt text not null default '';

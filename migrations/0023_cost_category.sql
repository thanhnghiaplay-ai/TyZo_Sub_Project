-- Phân loại khoản chi ghi tay. Chỉ thêm cột, khoản cũ rơi vào "khac".
-- Không đụng dữ liệu khách.
alter table room_costs add column if not exists category text not null default 'khac';

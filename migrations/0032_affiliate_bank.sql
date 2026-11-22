-- v5.40.0: cộng tác viên nhập tài khoản ngân hàng để nhận tiền; hoa hồng ghi rõ giá vốn và lời gộp của đơn.
alter table affiliates add column if not exists bank_name text not null default '';
alter table affiliates add column if not exists bank_account text not null default '';
alter table affiliates add column if not exists bank_holder text not null default '';
alter table affiliates add column if not exists bank_updated_at timestamptz;
alter table commission_events add column if not exists cost_amount integer not null default 0;
alter table commission_events add column if not exists profit_amount integer not null default 0;
-- Lúc rút, chép lại tài khoản nhận để Admin chuyển đúng chỗ dù CTV sửa sau đó.
alter table affiliate_payouts add column if not exists bank_info text not null default '';
alter table affiliate_payouts add column if not exists note text not null default '';

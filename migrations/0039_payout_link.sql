-- Kiểm toán v5.49 (R5-001/002/003): mỗi khoản hoa hồng gắn đúng lệnh rút của nó. Chỉ THÊM cột (để trống = khoản cũ).
alter table commission_events add column if not exists payout_id bigint;
create index if not exists commission_events_payout_idx on commission_events (payout_id) where payout_id is not null;
-- Mỗi CTV chỉ một lệnh đang chờ chuyển. Dữ liệu cũ lỡ có hai lệnh mở thì KHÔNG tạo (không làm hỏng lần dựng); app vẫn chặn bằng khóa dòng.
-- Viết trên một dòng bắt đầu bằng «do»: scripts/migrate.mjs từ chối dòng mở đầu bằng begin/commit/rollback.
do $$ begin if not exists (select 1 from affiliate_payouts where status = 'cho-chi' group by affiliate_id having count(*) > 1) then create unique index if not exists affiliate_payouts_one_open on affiliate_payouts (affiliate_id) where status = 'cho-chi'; else raise notice 'affiliate_payouts: có CTV đang có hơn một lệnh chờ chuyển, chưa tạo chỉ mục một-lệnh-mở. Admin xem lại.'; end if; end $$;

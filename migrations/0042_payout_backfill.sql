-- Hồ sơ sửa triệt để v5.49.1, RE-006: gắn khoản hoa hồng CŨ (chưa có payout_id) vào lệnh rút, CHỈ khi chắc chắn:
-- CTV có đúng MỘT lệnh đang chờ chuyển, lệnh đó chưa có khoản nào gắn, và tổng các khoản cũ đang «cho-rut» bằng đúng số
-- tiền lệnh. Không đụng khoản đã chi (da-chi) hay lệnh đã chi/hủy. Trường hợp khác để nguyên cho Chủ đối soát
-- (app chặn xác nhận/hủy lệnh chưa khớp và liệt kê ở trang Cộng tác).
update commission_events e set payout_id = p.id from affiliate_payouts p where e.payout_id is null and e.status = 'cho-rut' and p.affiliate_id = e.affiliate_id and p.status = 'cho-chi' and (select count(*) from affiliate_payouts p2 where p2.affiliate_id = p.affiliate_id and p2.status = 'cho-chi') = 1 and not exists (select 1 from commission_events x where x.payout_id = p.id) and (select coalesce(sum(y.amount), 0) from commission_events y where y.affiliate_id = p.affiliate_id and y.status = 'cho-rut' and y.payout_id is null) = p.amount;

-- MAIN-040-B (v5.49.6): chi phí GPU Modal thật của từng lượt, ghi TRƯỚC chứng từ chi phí bền.
-- Nếu ghi chứng từ lỗi (lượt thành «mat-phan-hoi»), đối soát vẫn biết số tiền nhà cung cấp đã tính. Chỉ thêm cột.
alter table run_modal_settlements add column if not exists provider_usd numeric;

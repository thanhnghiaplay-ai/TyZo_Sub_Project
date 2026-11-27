# Tiếp v5.49.6 ở mức MEDIUM

Nhánh `audit/v5.49.6-claude-re5`. RE5-001 đã sửa cục bộ. RE5-004: A và B đã sửa; C và D còn mở, cần HIGH và staging. Kiểm `git ls-remote` khớp với `git log`; đọc `docs/kiem-toan/v5.49.6/STATE.json` và `HANDOFF.md`.

Mức MEDIUM, theo thứ tự:
1. RE5-002: XONG (xem HANDOFF.md).
2. MAIN-040 (`src/lib/tyzo-modal-call.ts`, `billing/tyzo-modal-charge.ts`): test hành vi ghi chi phí Modal (success, failure, retry, duplicate, unknown).
3. RE5-003 (0056 trên PG thật): A đến liên tục, B chờ; nhiều model/provider/lane, live reserve, waiter hết hạn. Không sửa migration đã áp dụng.
4. RE5-005: đo admission theo lane và cửa sổ; không nới cap.

Gặp invariant tài chính không rõ hoặc race khó thì dừng, xin HIGH. Xong thì LOW: RE5-006 tài liệu, graph từ SHA sạch, đóng gói ZIP.
Không push main, không deploy, không gọi API trả phí, không đổi giá.

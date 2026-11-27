# Tiếp v5.49.6 ở mức HIGH (RE5-003)

Nhánh `audit/v5.49.6-claude-re5`. Kiểm `git ls-remote` khớp với `git log`; đọc `docs/kiem-toan/v5.49.6/STATE.json`, `HANDOFF.md`, `BACKLOG.json` (mục RE5-003, phần `fixProposal`).

Đã xong: RE5-001, RE5-002, MAIN-040 (cục bộ); RE5-004 phần A và B. Còn mở: RE5-004 C/D, MAIN-040-B.

1. HIGH: viết `migrations/0057_*.sql` (create or replace `tyzo_admit`, giữ chữ ký; không sửa 0056). Bỏ `todo` của hai test RE5-003 trong `src/lib/billing/work-admission-pg.test.ts`. Thêm test: khách chờ bị chặn bởi tài nguyên khác thì không giữ suất; không vượt trần; không bỏ đói. Diễn tập migration: nâng từ 0056, chạy lặp. Chạy toàn bộ test PG (55439, UID tyzo).
2. Checkpoint, đẩy nhánh, rồi xin MEDIUM cho RE5-005 (đo lại admission theo lane/cửa sổ sau khi sửa).
3. LOW: RE5-006 tài liệu rollback, graph từ SHA sạch, đóng gói ZIP.

Không push main, không deploy, không gọi API trả phí, không đổi giá.

# Tiếp v5.49.6

Nhánh `audit/v5.49.6-claude-re5`. RE5-001 đã sửa cục bộ (xem HANDOFF.md). Kiểm `git ls-remote` khớp với `git log`.

Mức HIGH: RE5-004. Đọc `deploy/vps/tyzo.sh` quanh đoạn đổi env Vercel và chuyển nguồn, cùng `scripts/re3-restore-pg.test.mjs`. Thêm test giả lập lỗi từng bước: xóa env xong nhưng thêm env lỗi, mất mạng, kill/restart, không rõ kết quả deploy, đích đã nhận ghi. Cả hai chiều Neon↔VPS. Dùng Docker/Vercel giả, PG 55439. Staging thật cần Chủ duyệt.

Sau đó xin MEDIUM cho RE5-002, MAIN-040, RE5-003, RE5-005; LOW cho RE5-006 tài liệu, graph và đóng gói.
Không push main, không deploy, không gọi API trả phí, không đổi giá.

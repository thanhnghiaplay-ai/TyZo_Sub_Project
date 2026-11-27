# Tiếp v5.49.6 ở mức LOW (RE5-005 đã xong)

Nhánh `audit/v5.49.6-claude-re5`. Kiểm `git ls-remote` khớp với `git log`; đọc `docs/kiem-toan/v5.49.6/STATE.json` và `HANDOFF.md`.

Đã sửa cục bộ: RE5-001, RE5-002, RE5-003 (0057), MAIN-040 (test); RE5-004 phần A và B. Còn mở: RE5-004 C/D (HIGH + staging), MAIN-040-B.

1. MEDIUM, RE5-005: đo admission trên 0057 theo lane và theo cửa sổ (3 s, 10 s), mức 25/50/100/200 khách và đợt 300; nếu đủ thời gian chạy mixed soak 60–120 phút bằng `docs/kiem-toan/codex/integration-load-soak/mixed-soak.sh` (bản Node build riêng, cổng 17750; PG 55439). Không nới trần. Upstream giả, ghi rõ.
2. LOW: RE5-006 tài liệu rollback và tương thích 0056/0057; Graphify từ SHA mã sạch kèm provenance; manifest; ZIP kết quả.
3. Cuối phiên: full test, tsc, lint, build Node và Vercel, Semgrep, Gitleaks, dependency-cruiser.

Không push main, không deploy, không gọi API trả phí, không đổi giá.

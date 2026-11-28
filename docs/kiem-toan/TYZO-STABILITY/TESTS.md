# TESTS
Môi trường: Node v22.23.5, chạy root, không DATABASE_URL (PG test bị skip). Mức: PASS_LOCAL.
Baseline nhánh fix/tyzo-stability = main f73e02d.
- tsc --noEmit: OK.
- eslint: 0 lỗi, 24 cảnh báo (unused var trong test).
- npm test nhóm 1 (scripts/**/*.test.mjs): 291 test, 244 pass, 1 fail, 46 skip. Fail duy nhất: `R8-002 unreadable migrations directory` (scripts/migration-read-permission.test.mjs) vì chạy root nên chmod 000 không chặn đọc. Do môi trường, không phải lỗi mã; chạy lại bằng user thường để xác nhận.
- npm test nhóm 2 (src/**, 197 file, chạy theo 5 đợt): 1519 test, 1478 pass, 0 fail, 41 skip.
- npm test nhóm 3 (mock modules: billing/pipeline/work-lease...): 121 test, 70 pass, 0 fail, 51 skip (cần Postgres).
- Chưa chạy: test PG (cần Postgres cô lập), build, check:auth, check:layout.
- Lưu ý: `npm test` chạy nối && nên nhóm 1 fail sẽ chặn nhóm 2, 3; nhóm 2 mất >5 phút nếu chạy một lệnh (dùng --test-concurrency=4 theo đợt).
- tyzo-modal-race.test.ts chạy trên PGlite (Postgres nhúng): 14/14 pass, 0 skip. Bao phủ TZ-003 (hàng đợi 429, giới hạn thử lại, hủy chờ), 409 không phát lại, đóng phiếu giữa ghi đoạn và giữ ngân sách, quyết toán sau khi kết quả tạm hết hạn (một phần TZ-002/005). Mức PASS_LOCAL.
- TZ-002: tyzo-modal-race.test.ts nay 17 test, 17 pass trên PGlite (thêm 3 test TZ-002: nhả suất chưa gửi, giữ khóa khi mới mất lease hoặc đã có ref chưa có bằng chứng, fencing tag). Các file chạm admission (8 file): 92 test, 61 pass, 0 fail, 31 skip (cần PG thật, gồm work-admission-pg). tsc OK. PASS_LOCAL; chưa PASS_CI.
- TZ-004: src/lib/sub/re8-010.test.ts nay 29 test, 29 pass (thêm 17: POST 409/5xx chưa rõ, POST 4xx dứt khoát, 303 sang host lạ không gửi header, Location sai/thiếu, hủy giữa GET, JSON sai). PASS_LOCAL (fetch giả, không gọi Modal).
- TZ-005: tyzo-modal-race.test.ts nay 29 test (thêm 12 test bất biến hạt giống 1–12: số dư + đã trừ = số ban đầu, không phần giữ treo, không trừ trùng; hạt lẻ kiểm trước khi đóng phiếu). 8 file billing: 120 test, 100 pass, 0 fail, 20 skip (PG thật). Đột biến releasePart bị bắt. PASS_LOCAL.
- TZ-006: saved-runs.test.ts nay 24 test cùng review-continue (24/24 pass); pipeline/*.test.ts 7/7 pass (cần cờ mock module). eslint thay đổi: 0 lỗi. tsc OK. Không có test trình duyệt thật cho IndexedDB/reload/mất mạng. PASS_LOCAL một phần.

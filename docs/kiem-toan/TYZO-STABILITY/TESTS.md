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

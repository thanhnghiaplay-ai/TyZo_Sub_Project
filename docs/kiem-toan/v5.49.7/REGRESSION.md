# Hồi quy toàn phần sau RE6-003 → RE6-007

Mã ở `b2cadf0`, Node v22.23.5. PostgreSQL 18.7 (Docker, loopback, dữ liệu tổng hợp, CSDL tạo bằng migrate 59 mục).

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` | đạt |
| `node --test 'scripts/**/*.test.mjs'` | 231 đạt · 1 lỗi · 46 bỏ qua (cần Docker/PG CLI riêng) |
| Nhóm `src/lib/**` (strip-types) | 1483/1483 đạt |
| Nhóm module-mocks, có `TYZO_TEST_PG_URL` PG18.7 (gồm work-admission-pg, work-lease-pg) | 101/101 đạt |
| `scripts/re6-migrations-pg.test.mjs` trên PG18.7 | 1/1 đạt |
| `scripts/re6-007-admission-pg.test.mjs` trên PG18.7 | 7/7 đạt |

Lỗi duy nhất là `R8-002: unreadable migrations directory…` (`scripts/migration-read-permission.test.mjs`). Môi trường chạy bằng root (uid 0) nên `chmod 000` không chặn được việc đọc. Lỗi này không do thay đổi trong phiên: `scripts/migrate.mjs` và `migrations/` không đổi kể từ `c0bcf6f`. Chạy bằng user thường thì sẽ đạt.

Chưa chạy `npm run build`, vì phiên không sửa mã ứng dụng trong `src/`, chỉ thêm test và công cụ VPS. Bộ hồi quy khôi phục RE6-002 (`re3-restore-pg`) cần pg_dump 18 trên máy chạy test nên không chạy lại. Phần `tyzo.sh` RE6-002 dùng không bị sửa, chỉ đổi khối Vercel.

## Lượt RE7 (mã ở `1b1a0e6`)

PostgreSQL 18.7 (Docker loopback), `TYZO_TEST_PG_URL` trỏ CSDL thử đã chạy migrate 59 mục.

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` | đạt |
| `node --test 'scripts/**/*.test.mjs'` (root) | 242 đạt · 1 lỗi · 38 bỏ qua |
| Nhóm `src/lib/**` (strip-types, có `leftover-policy.test.ts`) | 1487/1487 |
| Nhóm module-mocks (PG18.7) | 101/101 |
| R8-002 bằng user thường uid 30033 | 1/1 đạt (`RE7/test-summary.txt`) |

Lỗi duy nhất khi chạy bằng root là R8-002, và test này đạt khi chạy bằng user thường. Không còn lỗi nào khác.

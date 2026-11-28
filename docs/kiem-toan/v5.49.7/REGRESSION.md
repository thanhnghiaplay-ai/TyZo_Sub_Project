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

## Lượt RE7-004 (mã ở `386660a`)

PostgreSQL 18.7 (Docker loopback). Lần chạy đầu bị lỗi kết nối vì container PG đã dừng (`ECONNREFUSED`). Đã bật lại và chạy lại toàn bộ.

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` | đạt |
| `node --test 'scripts/**/*.test.mjs'` (root) | 242 đạt · 1 lỗi (R8-002, do chạy bằng root) · 38 bỏ qua |
| Nhóm `src/lib/**` (có name-policy, leftover-script) | 1489/1489 |
| Nhóm module-mocks (PG18.7) | 101/101 |

## Lượt RE6-008 (mã ở `fe80761`)

PostgreSQL 18.7 (Docker loopback), `TYZO_TEST_PG_URL` trỏ vào cụm thử.

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` | đạt |
| `node --test 'scripts/**/*.test.mjs'` (root) | 242 đạt · 1 lỗi · 38 bỏ qua |
| Nhóm `src/lib/**` (strip-types) | 1489/1489 |
| Nhóm module-mocks (PG18.7, có `re6-008.test.ts`) | 118/118 |
| `npm run build:dev` (không có `DATABASE_URL`) | đạt |

Lỗi duy nhất là R8-002, do máy thử chạy bằng root; test này đạt khi chạy bằng user thường (`RE7/test-summary.txt`).

## Lượt RE6-009 (mã ở `a344532`)

PostgreSQL 18.7 (Docker loopback).

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` | đạt |
| `node --test 'scripts/**/*.test.mjs'` (root) | 242 đạt · 1 lỗi · 38 bỏ qua |
| Nhóm `src/lib/**` (có `re6-009.test.ts`) | 1498/1498 |
| Nhóm module-mocks (PG18.7) | 118/118 |
| `npm run build:dev` (không có `DATABASE_URL`) | đạt |
| Android JVM: `check-session.sh` + `CaptionLayoutCheck` + `VoiceFilterCheck` | 28/28 (giả lập, không phải thiết bị thật) |

Lỗi duy nhất là R8-002, do chạy bằng root; test này đạt khi chạy bằng user thường.

## Lượt RE8 (mã ở `1202352`)

PostgreSQL 18.7 (Docker loopback).

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` | đạt |
| `node --test 'scripts/**/*.test.mjs'` (root; có re8-008-gpu-limits, re8-001-gpu-sim) | 248 đạt · 1 lỗi · 38 bỏ qua |
| Nhóm `src/lib/**` (có re6-009 11 ca) | 1500/1500 |
| Nhóm module-mocks (PG18.7, re6-008 18 ca) | 119/119 |
| `npm run build:dev` (không có `DATABASE_URL`) | đạt |
| Android JVM (`check-session.sh`: Session/Api 10 + UpdateFlow 19) | 29/29 (giả lập) |
| CI «Android thử» run 46113317257 | `assembleRelease` đạt, APK 0.14 ký khóa cố định, không phát hành |

Lỗi duy nhất là R8-002, do chạy bằng root; test này đạt khi chạy bằng user thường.

## Lượt RE8-010/011 (mã ở `752ea26`, chỉ đổi workflow sau đó)

PostgreSQL 18.7 (Docker loopback).

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` | đạt |
| `node --test 'scripts/**/*.test.mjs'` (root; có re8-010, re8-011) | 249 đạt · 1 lỗi · 38 bỏ qua |
| Nhóm `src/lib/**` (có `re8-010.test.ts`) | 1506/1506 |
| Nhóm module-mocks (PG18.7) | 119/119 |
| `npm run build:dev` (không có `DATABASE_URL`) | đạt |
| CI «Android thử» run 46115051993 | `assembleRelease` đạt; chữ ký v2 hợp lệ; cùng khóa ký với 0.13; không phát hành |

Lỗi duy nhất là R8-002, do chạy bằng root; test này đạt khi chạy bằng user thường.

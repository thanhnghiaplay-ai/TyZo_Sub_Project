# Tiến độ v5.49.4 (Claude) — đọc đầu tiên khi tiếp tục

Nhánh `ccr-20605d15-2nil6k`, gốc `6d906ba` (khớp 1468/1468 hash manifest ZIP bàn giao). Không merge main, không deploy, không thuê GPU, không DB khách.

## Môi trường phiên
- `npm ci`; Postgres 16 riêng: `initdb` + `pg_ctl -o '-p 55439 -c max_connections=400'`, `create database tyzo_test`.
- Chạy bằng chứng: `docs/kiem-toan/v5.49.4/run.sh <nhãn-mới> <lệnh>` (env sạch, chỉ `TYZO_TEST_PG_URL`; từ chối nhãn trùng).

## Checkpoint
| # | Mục | Trạng thái | Commit |
|---|---|---|---|
| 1 | RE3-001 quyết toán live nguyên tử | PASS fixture/PG thật; PARTIAL staging | 0caa1c9 |
| 2 | RE3-002 dò độ dài audio, fail closed | PASS fixture + bộ mã hóa thật; PARTIAL nhà thật | (checkpoint 2) |

## Việc tiếp theo
RE3-003/006 → RE3-005 → RE3-004 benchmark → RE3-007 → RE2 ×6 → 80 lịch sử → scanner → gates → Graphify → hồ sơ cuối.

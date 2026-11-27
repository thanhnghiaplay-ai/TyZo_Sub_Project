# Tiến độ v5.49.4 (Claude) — đọc đầu tiên khi tiếp tục

Nhánh `ccr-20605d15-2nil6k`, gốc `6d906ba` (khớp 1468/1468 hash manifest ZIP bàn giao). Không merge main, không deploy, không thuê GPU, không DB khách.

## Môi trường phiên
- `npm ci`; Postgres 16 riêng: `initdb` + `pg_ctl -o '-p 55439 -c max_connections=400'`, `create database tyzo_test`.
- Chạy bằng chứng: `docs/kiem-toan/v5.49.4/run.sh <nhãn-mới> <lệnh>` (env sạch, chỉ `TYZO_TEST_PG_URL`; từ chối nhãn trùng).

## Checkpoint
| # | Mục | Trạng thái | Commit |
|---|---|---|---|
| 1 | RE3-001 quyết toán live nguyên tử | PASS fixture/PG thật; PARTIAL staging | 0caa1c9 |
| 2 | RE3-002 dò độ dài audio, fail closed | PASS fixture + bộ mã hóa thật; PARTIAL nhà thật | dc8cf4e |
| 3 | RE3-003 nhịp lease single-flight, timeout máy chủ, mất lease | PASS fixture/PG thật; PARTIAL staging | a65d0e7 |
| 4 | RE3-004/005/006 nhân admission, cap mọi lane, đối soát unknown theo bằng chứng, Admin phân trang | PASS PG thật + benchmark; PARTIAL Neon/UI | 5341d35 |
| 5 | RE3-007 bảng kê + khóa ghi + cổng chuyển; sửa Neon→VPS «schema public» | PASS PG thật + docker giả; PARTIAL VPS thật | (checkpoint 5) |

## Việc tiếp theo
RE2 ×6 → 80 lịch sử → scanner → gates → Graphify → hồ sơ cuối.

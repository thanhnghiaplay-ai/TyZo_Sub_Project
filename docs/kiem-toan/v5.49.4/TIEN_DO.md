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
| 5 | RE3-007 bảng kê + khóa ghi + cổng chuyển; sửa Neon→VPS «schema public» | PASS PG thật + docker giả; PARTIAL VPS thật | 42a6cf2 |
| 6 | Sửa 0054 (dòng `begin` bị migrate.mjs từ chối — phát hiện bởi cổng toàn bộ); diễn tập migration; số đo công bằng RE2-004 | PASS; RE2-004 PARTIAL (2/200 đói 8 s) | (checkpoint 6) |

## Cổng toàn bộ lần 1 (HEAD 42a6cf2)
typecheck 0; lint 0 lỗi/23 cảnh báo có sẵn; test 209/218 pass, 7 skip, **2 fail**: (a) migration-files: 0054 có dòng `begin` → đã sửa ở checkpoint 6; (b) R8-002 chmod 0 không chặn được root (phiên chạy bằng root, `env-r8-002-as-root.log`) — giới hạn môi trường, không sửa mã. check:auth cần dev server (chạy ở đợt UI). build mặc định 0.

## Việc tiếp theo
RE2 ×6 → 80 lịch sử → scanner → gates → Graphify → hồ sơ cuối.

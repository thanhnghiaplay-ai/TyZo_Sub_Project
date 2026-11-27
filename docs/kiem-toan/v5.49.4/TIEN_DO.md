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
| 6 | Sửa 0054 (dòng `begin` bị migrate.mjs từ chối — phát hiện bởi cổng toàn bộ); diễn tập migration; số đo công bằng RE2-004 | PASS; RE2-004 PARTIAL (2/200 đói 8 s) | eaadb21 |
| 7 | Đối chiếu 80 mục (DOI_CHIEU_80.json: 68 PASS/8 PARTIAL/2 BLOCKED/2 BY_DESIGN), Android JVM 10/10, gitleaks/semgrep/depcruise triage, UI Admin RE3-006 (ảnh), check:auth, log bằng chứng vào git | xem từng mục | c5c39c7 |
| 8 | RE3-008 Graphify dựng lại từ c5c39c7 (0 token) | PASS | c5e6dc6 |
| 9 | Cổng cuối: build Node + smoke 4/4; báo cáo BAO_CAO_KET_QUA.md, RE2/RE3_KET_QUA.json; soak 3600 s đang chạy (`soak/soak-3600-1`) | xem báo cáo | b4a053a |
| 10 | RE2-004 hàng đợi công bằng (Chủ duyệt), migration 0055; cổng: test 210+1439+87 (1 lỗi root R8-002), build Vercel+Node, diễn tập migration; soak-3600-1 PASS trên c5c39c7; soak-3600-2 chạy trên mã mới | PASS cục bộ | (checkpoint 10) |

## Cổng toàn bộ lần 1 (HEAD 42a6cf2)
typecheck 0; lint 0 lỗi/23 cảnh báo có sẵn; test 209/218 pass, 7 skip, **2 fail**: (a) migration-files: 0054 có dòng `begin` → đã sửa ở checkpoint 6; (b) R8-002 chmod 0 không chặn được root (phiên chạy bằng root, `env-r8-002-as-root.log`) — giới hạn môi trường, không sửa mã. check:auth cần dev server (chạy ở đợt UI). build mặc định 0.

## Việc tiếp theo
1. Đọc soak `soak/soak-3600-2/result.json` (mã có hàng đợi). FAILED/ngắt → giữ nguyên thư mục, chạy lại nhãn mới từ 0. soak-3600-1 PASS (mã c5c39c7).
2. Chủ đã quyết (27/11): giới hạn theo hạn mức Groq/Alibaba/Modal, Chủ báo khi nâng gói thì chỉnh trong Admin; liveReserve = 0 (live dùng mọi suất trống); làm hàng đợi công bằng (đã làm). Còn: phiếu live khi quyết toán chưa rõ (6 giờ tự nhả).
3. Ngoài máy này: Android máy thật (AZ-002/003/004/008, R3-006), staging Neon/VPS cho RE3-004/007, nhà cung cấp thật cho RE3-001/002, R8-002 chạy bằng user thường.
4. Khi phát hành: APP_VERSION/ADMIN_LOG theo quy trình; migration 0053/0054 chạy khi build (chỉ thêm).

# Bàn giao giữa chừng TyZo ứng viên 5.49.3

**PARTIAL — DỪNG THEO YÊU CẦU NGƯỜI DÙNG do gần hết giới hạn phiên. CHƯA NGHIỆM THU.** Không push, merge main, deploy, thuê GPU, gọi AI trả phí hoặc truy cập dữ liệu khách thật. Phiên bản 5.49.3 chỉ là ứng viên cục bộ.

## Nguồn và nhánh

- Checkout `/workspace/TyZo_Sub_Project`, nhánh `fix/v5.49.2-re2`.
- Baseline chính xác `552eab1f9122cdc04bee11c242a2d5eadf607dd7`. Đã fetch từ GitHub và xác minh **1402/1402 SHA-256 khớp manifest** (`evidence/source-verification.json`).
- Môi trường ban đầu ở `93bee64682593867dbd00e0312522a11918261e6`; đã giữ nhánh `backup/pre-re2-93bee64`. Không dùng checkout ban đầu thay baseline này.
- Hồ sơ gốc giải nén ở `/workspace/tyzo-handoff`, gồm các ZIP lịch sử lồng nhau. Source ứng dụng lấy theo SHA, không nằm trong ZIP đầu vào.
- SHA bản lưu WIP và danh sách file đổi nằm trong STATE.json của gói bàn giao. WIP không đồng nghĩa các gate đã đạt.
- Đọc BANG_DIEU.md, huongdan.txt, AGENTS.project.md, 00_README/04_PROMPT gốc trước khi tiếp tục; yêu cầu user mới nhất đứng trên quy tắc audit-only cũ. Không reset/clean hoặc bỏ các thay đổi đang làm.

## Phần đã sửa trong mã

1. **RE2-001:** gate-reserve không còn giữ min(estimate, available) rồi trả ok; từ chối dự toán không hữu hạn/không dương, giữ đủ số nguyên trong transaction khóa phiếu. 100 request cạnh tranh 100/30 chỉ nhận 3 call.
2. **RE2-002:** settleGateCall khóa phiếu → call, kiểm owner/status/lease, giới hạn debit theo phần giữ riêng; quan sát chi phí provider và debit cùng transaction; replay không trừ/ghi spend lần hai. Migration 0047 lưu actual/charged/short/provider/model/observed_at.
3. **Ảnh hưởng liên module:** Modal quyết toán cũng giới hạn phần giữ riêng; migration 0049 giữ bằng chứng số liệu từng attempt kể cả khi part đã bị reaper xóa. Phản hồi muộn không trừ khách nhưng ghi thiếu. Hàm trừ chung chargeTokenWith/chargeTicketWith chỉ tiêu phần tự do, trừ khi caller truyền phần giữ mình sở hữu. Thay đổi hàm chung là phần mới cần full regression cuối.
4. **RE2-003:** heartbeat qua body và settlement, finally dọn timer; deadline/cancel stream/body cap 16 MiB; lỗi body có dấu đối soát. Lease đã hết không được hồi sinh bởi heartbeat muộn. Gateway kết hợp request.signal và timeout gửi upstream.
5. **RE2-004:** bỏ polling 300 ms; backpressure 429 + Retry-After 2. Migration 0048/work-admission dùng PostgreSQL làm chốt liên tiến trình, quota batch/Modal/live riêng và theo user/provider/model. Giới hạn 32 request chờ admission mỗi process/mỗi lane, không giữ DB connection trong lúc gọi mạng. Mặc định batch48/Modal8/live48, user2/lane, Modal3/user, provider40/lane, model24/lane; đây là cấu hình bảo vệ tải ban đầu, không phải benchmark GPU.
6. **Bridge/Admin:** scripts/live-bridge có Sql.query/begin thật; script bridge nối admission, slot giữ đến khi debit/close xong, giới hạn cửa upgrade 300 socket. Admin Cấu hình → Trạng thái có kill switch nhận mới/limits/counters; chỉ chu đọc/lưu, settings+audit cùng transaction. Không polling Admin.
7. **RE2-005:** chep_len_neon fail closed trên exit khác0, --exit-on-error --single-transaction, mktemp riêng/dump0600; giữ dump/log khi lỗi, không tự cutover. Đã thử PostgreSQL thật: FK sai rollback đích, nguồn nguyên vẹn; dump tốt khớp sổ/constraints/sequence; đích có dữ liệu bị từ chối.
8. **RE2-006:** chặn close_wanted trong cấp phát; close khóa phiếu trước kiểm việc sống; drain cả token và vnd cũ. Một vòng import mới token-flow→run-ticket đã làm build fail; đã bỏ cạnh gọi ngược, đặt closePending ở run-gate. Không tắt import protection. Các thử tách token-unit/giay-room đã hoàn lại, không còn trong patch.
9. **ASYNC-P0 bổ sung, mới nhất:** baseline Alibaba filetrans hỏi cùng status thành công hai lần trừ 8→16 Token. Migration 0050 + async-asr.ts ghi owner/ticket/hash yêu cầu/call giữ trước/task ID/snapshot giá, không lưu URL media, transcript hay key. Submit trùng dùng lại task; mất phản hồi ghi unknown, không tự submit lại. Status kiểm owner/ticket/task trước gọi nhà; 20 status song song chỉ một debit/spend. Async job được tính vào admission/reaper/close/force-audit/Admin counters, không coi hết HTTP lease là job provider đã chết. Chính sách force 6 giờ cũ giữ nguyên.

**Rào chắn triển khai async:** task Alibaba còn chạy từ bản cũ chưa có mapping tin cậy. Code mới từ chối task không có hồ sơ; không tự gán chủ. Trước deploy cần drain task cũ hoặc kế hoạch nhập mapping có chứng cứ/Chủ duyệt. Chưa động task thật. Chưa có worker nền đối soát unknown hoàn chỉnh; không gọi đây là queue durable/exactly-once cho mọi API.

## Bằng chứng đã chạy và độ mới

- `baseline-stable`: npm test đầy đủ trên bản source baseline đóng băng PASS. Lần baseline-unit đầu bị sửa source trong khi chạy, không dùng chứng nhận baseline.
- `re2-before-valid`: 8 fail/1 pass tái hiện sản phẩm. Lần re2-before đầu fixture thiếu số dư là lỗi harness, không dùng làm before sản phẩm.
- `billing-after`, `re2-extended`, `scale-regressions`, `root-protection-after`: regression cục bộ PASS, xem JSON exit/log. `async-replay-before` ghi 8→16 và assertion fail; `async-after` PASS.
- **`async-final-check`: 33 test PASS**, không skip, gồm async transport giả + PostgreSQL thật + finance + Admin fixture. Đây là bộ test gần bản cuối nhất.
- **`gate-unit` PASS nhưng trước thay đổi hàm trừ chung cuối và ASYNC-P0/0050; phải chạy lại npm test trên WIP cuối.** `handoff-typecheck`/`handoff-lint` nếu có là kiểm tra cuối đóng gói; đọc exit thực tế. 23 lint warning cũ không có nghĩa scan sạch.
- Default/Vercel và node-server build đã PASS trước nhóm async mới nhất. **Chưa build bản cuối có0050**. Build không DATABASE_URL nên migration CLI skip; không deploy.
- Migration drill nâng fixture synthetic từ0046, idempotency, rollback DDL/bookkeeping đã thử trước0050; cần chạy lại0046→0050. Chưa có anonymous backup thật từ Chủ.
- Gitleaks history exit1:2 finding synthetic test; không thêm allowlist để làm xanh. Semgrep full:192 finding/2 analysis error ở snapshot trung gian; scan src/scripts sau đó vẫn giữ exit1. Chưa triage hết và chưa quét async cuối. dependency-cruiser0error ở snapshot trước async; warnings còn mở. Graphify đóng gói nếu chạy xong phải có provenance, nếu chưa xong giữ BLOCKED/PARTIAL.
- Context7/OpenAI Docs MCP initialize+tools/list+query PASS qua lệnh có quyền mạng; không có nghĩa mọi phiên tự đăng ký tool. Playwright MCP initialize+navigate app local PASS sau đặt XDG_CACHE_HOME. Không nối Postgres MCP vào DB thật.
- Browser Admin desktop/mobile: đăng nhập user fixture, save/reload kill switch PASS, không pageerror/consoleerror trong fixture chặn font/extension ngoài. Ảnh cho thấy input bị tràn nội bộ; class đã sửa nhưng **chưa chụp lại bản cuối**. DOM overflow=false không chứng minh bố cục đúng. Không chứng nhận font/extension thật.
- Load1/5/25/50/100/200/300 batch/live-admission-simulation/mixed: ledger không sai; ghi riêng p95 accepted/rejected và429. Một lần mixed accepted p95 khoảng183–245ms ở burst200–300, nhiều request429; KHÔNG phải300AIjob cùng chạy. Web SSR local300/300HTTP200, p95≈859ms, không phải300browser session.
- **Soak60phút CHƯA đạt:** lần khởi động dừng sau~60giây vì fingerprint source đổi; soak-results.json ghi FAILED_OR_INTERRUPTED đúng. Không có soak đang chạy để chờ tiếp.

## Thứ tự tiếp tục

1. Review diff WIP và `async-asr.ts`, các caller chargeTokenWith/chargeTicketWith; kiểm unknown/failed/late/forceclose, khóa phiếu→job/call, mapping legacy và giá snapshot. Không tự nới rào sở hữu task cũ.
2. Typecheck, lint, **npm test đầy đủ**, build default rồi node-server trên cùng snapshot; không dùng log cũ chứng nhận source mới. Test mới async đã đăng ký ở phase module-mocks của npm test.
3. Chạy lại migration/restore/rollback/fault injection kể cả0050, DB restart trên cluster riêng; không restart DB đang phục vụ test khác.
4. Dựng lại node-server preview đúng source, kiểm/chụp Admin desktop/mobile/sáng-tối sau sửa layout, quyền thường, các negative transport. Preview đang tồn tại có thể là build cũ.
5. Quét và triage Semgrep/Gitleaks/dependency-cruiser bản cuối; không che exit/analysis errors, không allowlist rộng. Đồng bộ Graphify đúng commit/code hash.
6. Hoàn thiện `DOI_CHIEU_80_DANG_DO.json`: đủ80dòng, chưa tái nghiệm thu đủ. Kết quả lịch sử giữ riêng, không suy ra mọi NEEDS_OWNER cũ còn mở hoặc mọi FIXED cũ đã kiểm lại.
7. Đóng băng source rồi load/soak60phút. Còn thiếu: retry/dead-letter/reconcile/worker, fairness, GPU budget giờ/ngày, Faster-Whisper/vLLM/chất lượng, DB pool/QPS/VRAM/RTF/TTFT/audio latency thật, E2E account switch/active chunk/polish corpus, ingress và Android.
8. Cần staging, cấu hình VPS/Vercel thật, anonymous backup, SDK/thiết bị Android, ngân sách provider/GPU được duyệt cho phần phụ thuộc. Không load production, không tự thuê GPU/merge/deploy. Không tuyên bố phục vụ ổn định100–200khách trước đủ gate.
9. Khi đạt gate mới xuất bộ hồ sơ kết quả cuối cho kiểm toán độc lập. Gói này là **WIP chuyển phiên**.

## Môi trường có thể tái dùng

- `/workspace/tyzo-tools/STATUS.md`, `skills/tyzo-audit/SKILL.md`, `activate.sh`; hướng dẫn audit-only cũ nhường yêu cầu sửa trực tiếp, nhưng bảo vệ DB thật vẫn giữ. Không dùng Postgres fallback trong .mcp.json.
- PG17.12 `/workspace/tyzo-pg/data`, binaries `/workspace/tyzo-pg/usr/lib/postgresql/17/bin`, loopback127.0.0.1:55439. Role `tyzo_test` NOSUPERUSER/NOCREATEDB/NOCREATEROLE, DB `tyzo_test`; helper tự tạo/drop schema thu_*.
- Runner `/workspace/tyzo-results/run.py` lọc env và đặt TYZO_TEST_PG_URL loopback. Ví dụ `python /workspace/tyzo-results/run.py next-full npm test`; build node dùng `TYZO_AUDIT_PRESET=node-server`. Cần quyền mạng của exec cho socket/PG cục bộ.
- PG nếu dừng: `pg_ctl -D /workspace/tyzo-pg/data -l /workspace/tyzo-pg/server.log -o '-h 127.0.0.1 -p 55439 -k /workspace/tyzo-pg' start` bằng binary trên. Không initdb đè data.
- DB browser `tyzo_browser_re2` chỉ có user giả. Credentials/cookies/PG data/runtime không đóng gói. Harness tham chiếu /workspace: đọc/chỉnh đường trước khi chạy ở máy mới.
- Không mặc định process/tooling đã khôi phục sau khi chuyển phiên. Phiên đóng gói bị rớt kết nối một lần; kiểm trạng thái thực tế.

## Rollback

Chưa thay production. Giữ WIP/patch/source baseline trước revert. 0047–0050 chỉ thêm cấu trúc; không drop ledger/bảng/cột khi rollback code. Baseline có lỗi tài chính đã tái hiện, không tự deploy baseline làm rollback. Nếu về sau rollout lỗi: ngừng nhận mới, drain, backup/audit, chọn forward-fix hoặc revert kiểm chứng staging. Rollback cấu hình qua Admin có audit; không xóa lịch sử cho khớp số.

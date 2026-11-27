# Bàn giao theo yêu cầu dừng — 27/11/2026

**CHƯA NGHIỆM THU.** Người dùng yêu cầu làm xong một bước nhỏ rồi dừng để phiên khác tiếp tục. Không khởi động lại soak hoặc mở nhiệm vụ mới sau khi xuất bàn giao.

## Kho và phạm vi

- Repo `/workspace/TyZo_Sub_Project`, nhánh `fix/v5.49.2-re2`, PR nháp https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/pull/5.
- Baseline `552eab1f9122cdc04bee11c242a2d5eadf607dd7`; nguồn gói gốc đã đối chiếu1402/1402 hash. Không reset/clean hoặc dùng checkout cũ93bee64.
- Các commit đã lên GitHub trước bước cuối:8860a38,9218e4f,20f3cc8,c36ae80,a43fb41,aa834af,01b4a64,47f27ca (R07),c4ccdbf (R08). HEAD bàn giao được ghi trong STATE.json của bộ ZIP để tránh ghi SHA tự tham chiếu.
- Không merge main, deploy, dùng DB khách thật hoặc thuê GPU. Không đổi giá/điều khoản/quy Token/package-lock, không xóa chức năng/provider theo ý riêng. Nhánh main vẫn phải kiểm lại từ remote trước khi tiếp tục.

## Những gì đã làm

Đọc R01_ADMISSION…R09_CUMULATIVE_LIVE trong thư mục này. R01–R06: reservation/settlement/fencing, admission chia lane và quản lý unknown của Chủ; Alibaba owned task/uncertain submission; pool PostgreSQL phục hồi disconnect; regex model tránh bậc hai; Android0.12 tách tài khoản/sync/receipt, có JVM và debugAPK; ingress lazy stream bounded trước parser, ưu tiên control/webhook.

R07 (`47f27ca`): TTS nhận đủ audio rồi quyết toán nguyên tử cùng chi phí; mất phản hồi giữ unknown; không tự gửi lại paid request/Modal5xx; unknown trả409 cần đối soát, bận thật429/Retry-After2; metadata provider/model lưu trước gửi. Migration0051 thêm active index.

R08 (`c4ccdbf`): journal chi phí bền, pending vẫn được tính trong báo cáo, replay hữu hạn/idempotent; live chờ ghi trước đóng, lỗi lưu quan sát dừng/unknown; tách chi phí nhà cung cấp thô khỏi làm tròn Token; migration0052 chỉ thêm journal và mở rộng bigint→numeric giữ giá trị cũ; sandbox reset xóa journal cùng aggregate trong giao dịch. Chưa chỉnh khoản lịch sử.

R09 (commit bàn giao): usage LiveTranslate cộng dồn lấy delta theo từng WebSocket; bỏ fixed system prompt không tính phí; nhận video_tokens; thiếu/malformed usage cần đối soát. Thêm native WebSocket benchmark với PostgreSQL thật, upstream giả lập.

## Kết quả và giới hạn bằng chứng

- Full R07:1666 pass/0 fail/7 skip; full R08:1675/0/7; R09 full:1680/0/7. Typecheck/lint/build mặc định+Node pass. **Các full/build/scanner R09 dùng fingerprint trước lần sửa benchmark cuối**, không gọi là cổng cuối của toàn bộ HEAD bàn giao.
- Fingerprint ứng dụng cuối: `2d036c766f5491156577c45cccc7d52f0af33b9eae780e8705698646420a31b3`. Khác snapshot full gần nhất (`b258f10…`) ở bộ benchmark native; mã sản phẩm không đổi ở bước nhỏ cuối. Có5 vòng native-stability cuối PASS và typecheck/lint bàn giao; đọc JSON thực tế.
- HTTP built Node:413 trước body lớn;32 upload giữ chỗ thì lượt tiếp429; webhook401 và Web200 vẫn tới được; đóng socket nhả chỗ, ledger không đổi. UI Chủ/khách thường desktop/mobile sáng/tối PASS (`r09-browser-admin`); ảnh có trong hồ sơ. UI mới về chi phí pending **chưa** kiểm trực tiếp trên trình duyệt.
- PostgreSQL riêng17.12: race tài chính/owner transfer, DB restart idle/giữa giao dịch, trigger fault, migration0046→0052, idempotence và rollback fault0053 PASS trên dữ liệu tổng hợp. Không thay cho backup khách cũ ẩn danh.
- Android: JVM/session/API receipt, compile SDK thật và debugAPK0.12 đã PASS trước R07–R09; mã Android không đổi sau đó. Chưa máy thật/lifecycle/permission/DownloadManager; R3-006 updater vẫn OPEN/P2.
- Semgrep R09:120 findings+2 parse errors, infra61+1 parse error; có taint timeout. Gitleaks tracked snapshot4 phát hiện redacted (1 cấu hình preview nền tảng có sẵn,3 fixture); dependency-cruiser0 errors/10 warnings. **Triage từng cảnh báo chưa hoàn tất**, không suppress để xanh. Không có provider key thật trong DB thử.
- MCP GitHub dùng thật; Context7/OpenAI Docs initialize/list/query và Playwright MCP built navigation PASS; không đồng nhất protocol smoke với toàn bộ công cụ đã đăng ký trong phiên. Postgres MCP chưa kết nối; DB thử dùng driver trực tiếp. Không dùng tracked `.mcp.json` fallback.
- Graphify còn ở snapshot trước Android/ingress/R07–R09 (graph timestamp03:37UTC); phải resync cuối bằng wrapper no-cluster/noLLM, chạy parser compatibility rồi ghi provenance commit/hash. Không dùng graph cũ như chứng cứ source mới.
- `DOI_CHIEU_80_DANG_DO.json` giữ đủ80 lịch sử nhưng current review phần lớn còn generic PARTIAL; **chưa** đối chiếu cập nhật hết. Không sửa lại mục lịch sử đã đúng. RE2_DANG_DO.json cũng cần cập nhật bằng chứng cụ thể.

## Soak: không có bài nào đạt60phút

Không có soak/resource monitor đang chạy ở thời điểm dừng. Canonical evidence/soak-results.json là FAILED_OR_INTERRUPTED sau26giây, vòng3 fail do fixture trả finished trước usage. Các lần cũ38phút,14phút,80giây đều bị ngắt và để riêng; không cộng dồn. Sau sửa fixture, timer-lag kiểm200ms PASS. Stress chẩn đoán cho thấy số receipt có thể1 hoặc2 theo thứ tự báo cáo cộng dồn; tổng chi phí/Token mới là bất biến. Năm ladder native cuối PASS nhưng chưa phải soak.

Một log lỗi stability235/256 bị ghi đè do tái dùng nhãn; trường hợp độc lập debug-stress-3 (259/260, tổng tiền980,20 đúng) còn nguyên. Phải ghi rõ hạn chế, không dựng lại log và gọi là bản gốc. Khi chạy tiếp, dùng nhãn mới và chặn ghi đè trong runner trước khi bắt đầu.

## Thứ tự tiếp tục

1. Xác minh git status/HEAD/remote; đọc STATE.json và manifest ZIP; giữ nguyên mọi thay đổi bàn giao.
2. Đọc00_README/04_PROMPT/03_SCALE gốc và R01…R09. Source hiện tại không phải release đã nghiệm thu.
3. Khóa snapshot ứng dụng cuối; rerun full/typecheck/lint/auth/build mặc định rồi Node, các scanner và kiểm UI pending chi phí. Không chạy build song song với một build khác. `npm run build` có migrate: runner phải bỏ DATABASE_URL thật; chỉ fixture riêng được migrate.
4. Start preview fixture đúng bản Node; ingress/admin E2E; chụp và nhìn ảnh sáng/tối desktop/mobile. Không tạo/giả cookie từ secret tiến trình. Có một lần auto-review từ chối đọc secret `/proc`; phương án đó đã bỏ. Chỉ đăng nhập hợp lệ qua API local, tôn trọng rate limit3/phút.
5. Start mới `/workspace/tyzo-results/soak.py` và resource-monitor.py sau khi mọi mã ứng dụng đã khóa; liên tục3600giây, DB billing+native WebSocket+Web SSR,1..300. Nếu source đổi/fail thì archive và tính lại từ0. Latency synthetic p95 có lúc vượt300ms, chưa chứng nhận API/GPU/audio SLO.
6. Triage scanner theo từng finding+parser/timeout; cập nhật đủ80 và6RE2, bảo toàn lịch sử. Xác nhận lại những mục NEEDS_OWNER/DEFERRED đã được sửa đúng ở baseline (MAIN-038,R3-003,R4-003,R5-005/006,AZ-006,DEEP-003…), không hỏi lại hoặc đổi chính sách chỉ vì nhãn cũ.
7. Còn thực tế: thiết bị Android, ingress deployment, corpus chất lượng, active-job browser reload, backup ẩn danh; Alibaba legacy task phải drain hoặc có ánh xạ sở hữu đáng tin trước cutover; chưa có budget/approval staging GPU. Không gọi phần thiếu là đã xong.
8. Resync Graphify đúng commit, cập nhật tài liệu và xuất **một bộ kết quả mới** cho kiểm toán độc lập. Giữ PR draft; không merge/deploy/thuê GPU.

## Công cụ và đường dẫn

- Activate `/workspace/tyzo-tools/activate.sh`; skill `/workspace/tyzo-tools/skills/tyzo-audit/SKILL.md` (user đã cho sửa trực tiếp, không áp audit-only để dừng nhiệm vụ). Graph chỉ wrapper `tyzo-graphify update /workspace/TyZo_Sub_Project --no-cluster`, không upload/label/LLM.
- Runner `/workspace/tyzo-results/run.py <nhãn-mới> <command...>` sạch env, chỉ `TYZO_TEST_PG_URL=127.0.0.1:55439/tyzo_test`; khi sandbox cần mạng loopback dùng quyền network bổ sung. Evidence gồm exit/time/fingerprint.
- Build Node: `TYZO_AUDIT_PRESET=node-server python /workspace/tyzo-results/run.py <nhãn> npm run build` sau build mặc định.
- Preview fixture: `/workspace/tyzo-results/browser-server.py`; restart cũ có zombie false-positive: chỉ sau khi xác minh cổng đã trống mới chạy lại. Không kill dịch vụ khác.
- Soak/fingerprint/resource monitor/native-stability/migration/fault scripts ở `/workspace/tyzo-results/`, không chứa trong mã sản phẩm. Runtime credentials dưới runtime/ không được đưa vào ZIP/Git.
- Kotlin/JDK17/Gradle/SDK đã cài riêng trong tyzo-tools; gradle-build.py dùng proxy cấu hình sẵn, không tắt TLS. Không biến lỗi harness Robolectric thành sửa mã Android không liên quan.

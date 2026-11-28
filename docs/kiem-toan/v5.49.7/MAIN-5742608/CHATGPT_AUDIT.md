# TyZo v5.49.7 · Báo cáo cho ChatGPT kiểm toán sau khi đẩy lên `main` (`5742608`) và cập nhật Graphify

Người nhận: ChatGPT (kiểm toán độc lập). Người thực hiện: Claude Code. Ngày: 28/11/2026.

Hãy kiểm toán trên **mã và bằng chứng trên GitHub**, không dựa vào lời tóm tắt này. Mỗi kết luận đều kèm tệp hoặc lệnh để kiểm lại. Kết quả «giả lập» và kết quả «thật» được ghi tách riêng.

## 1. Định danh và việc đã làm trên `main`

| Mục | Giá trị |
|---|---|
| Kho | `thanhnghiaplay-ai/TyZo_Sub_Project` |
| `main` trước | `ea38bcd448d0a728c42dc1e18d40b721f2a09e04` |
| `main` sau | **`5742608e2efca0e3f1194dfc19e1e58d3543fd15`**, fast-forward, không merge commit, không force; SHA remote đã xác minh |
| Nhánh làm việc | `ccr-654dbe0e-978ok7`, cùng SHA với `main` khi đẩy |
| Phạm vi | 29 commit, 132 tệp: +11.735 / −509 dòng. Không tính `docs/` và `graphify-out/`: 71 tệp, +4.607 / −509 |
| Người duyệt | Chủ dự án yêu cầu «đẩy lên main» và xác nhận **chấp nhận cả 3 hệ quả** dưới đây |

**Hệ quả tự động của việc đẩy `main`** (Chủ đã được báo trước và đồng ý):

1. **Vercel dựng production.** `package.json` có `build = vite build && npm run db:migrate`, nên migration **`0059_chat_obligations.sql`** (RE6-001, chỉ thêm bảng và backfill) chạy trên **database production**.
   - Kết quả build và migration trên Vercel **chưa được xác minh từ môi trường này** (không truy cập được Vercel). Chủ cần xem Vercel → Deployments và log `[migrate]`.
2. **Web production** nhận 29 commit. Các thay đổi chính có tác động tới khách:
   - cửa trả theo lượt chặn trường lạ, và usage tự mâu thuẫn thì không trừ khách (RE6-008);
   - ghi bù chứng từ GPU (RE6-009, RE8);
   - kiểm cấu hình proxy Modal (RE8-010, chưa đặt biến thì không đổi gì).
3. **APK 0.14 phát hành chính thức** (đã xảy ra) qua workflow «Android thử» trên `main`, có khóa ký: `android-v0.14`. Ứng dụng của khách sẽ báo có bản mới. Chi tiết ở mục 6.

**Không** bị tác động tự động:
- GPU Modal: chưa chạy `tyzo-ai` «Cập nhật»; `xac_thuc_proxy=false`; `ho_so_gpu=hien_tai`.
- Cầu nối Dịch trực tiếp: deploy riêng trên VPS/Fly. Thay đổi RE7-004 (giữ tên CJK) **chỉ có hiệu lực khi cầu nối được cập nhật**.
- Giới hạn ngân sách RE6-001: vẫn tắt, không có khóa `chat_obligation_budget`.

Danh sách commit: mục 9.

## 2. Trạng thái từng mục

| Mục | Trạng thái | Phần còn lại |
|---|---|---|
| RE6-001 | PASS_LOCAL_POLICY_PENDING | Chờ Chủ duyệt ngưỡng và chính sách trước khi bật |
| RE6-002 | PASS_LOCAL | Staging thật khi Chủ duyệt |
| RE6-003 | PASS_LOCAL | Vercel staging thật; biến sensitive fail closed |
| RE6-004 | PASS_LOCAL | Đo Modal thật |
| RE6-005 | PARTIAL | Đo thời gian hiển thị trên Web/Android thật |
| RE6-006 | PASS_LOCAL | — |
| RE6-007 | PASS_LOCAL | Không tối ưu; theo dõi `work_waiters` > 1000 |
| RE6-008 | PASS_LOCAL (đo thật một phần) | Đo thật 5 model, token suy luận Groq |
| RE6-009 | PASS_LOCAL, thiết bị BLOCKED | Hóa đơn Modal, thiết bị Android |
| RE6-010 | OPEN | Chưa làm (chờ chỉ đạo) |
| RE7-001…003 | PASS_LOCAL | — |
| RE7-004 | PASS_LOCAL, prompt BLOCKED | Phiên Alibaba thật; cập nhật cầu nối |
| RE8-001 | ANALYZED_SIM | Đo G8 |
| RE8-002 | PARTIAL | Lưu `cached_tokens`, đo A4 |
| RE8-003 | BLOCKED | A1 |
| RE8-004 | PARTIAL | Xác nhận trang giá hoặc A3 |
| RE8-005 | BLOCKED | A2 |
| RE8-006 | ANALYZED | Không đổi mức giữ |
| RE8-007 | BUILD_PASS, **ĐÃ PHÁT HÀNH 0.14**, thiết bị BLOCKED | Checklist điện thoại trên bản phát hành |
| RE8-008 | PASS_LOCAL, chưa deploy | Deploy, đo G5/G8 |
| RE8-009 | PASS_LOCAL | — |
| RE8-010 | PASS_LOCAL, chưa deploy | P0 rồi G7 |
| RE8-011 | ANALYZED_SIM | Chủ chọn phương án giá |

Nguồn: `docs/kiem-toan/v5.49.7/BACKLOG.json`, `STATE.json`; báo cáo từng mục ở `docs/kiem-toan/v5.49.7/<mục>/REPORT.md`.

## 3. Hồi quy trên mã được đẩy

Mã `752ea26`. Từ đó tới `5742608` chỉ đổi workflow Android và tài liệu. Xem `REGRESSION.md`.

| Bộ | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` | đạt |
| `node --test 'scripts/**/*.test.mjs'` (chạy bằng root) | 249 đạt · 1 lỗi (R8-002, do root bỏ qua `chmod 000`; đạt khi chạy bằng user thường uid 30033, xem `RE7/test-summary.txt`) · 38 bỏ qua |
| Nhóm `src/lib/**` (strip-types) | 1506/1506 |
| Nhóm module-mocks với PostgreSQL 18.7 (Docker loopback, dữ liệu giả) | 119/119 |
| `npm run build:dev` (không có `DATABASE_URL`) | đạt |
| Android JVM (`check-session.sh`) | 29/29 (giả lập) |
| CI Android trên nhánh, lượt 46115051993 | `assembleRelease` đạt; chữ ký v2; cùng khóa ký với 0.13 |

**Chưa chạy:** ESLint; bộ khôi phục `re3-restore-pg` (cần `pg_dump` 18).

## 4. Graphify: cập nhật theo commit `5742608`

| Mục | Trước | Sau |
|---|---|---|
| Công cụ | graphify 0.9.119 | `graphify update . --force` (chỉ AST, **không gọi AI**: 0 token) |
| Nút | 6.966 | **7.510** |
| Cạnh | 19.199 | **20.226** (19.364 EXTRACTED, 862 INFERRED) |
| Cụm (community) | 266 | **304** (63 cụm được đặt lại tên theo hub; chưa chạy `graphify label` bằng LLM) |
| Tệp có nút | — | +68 tệp mới, 0 tệp bị bỏ, 15 tệp đổi số nút |
| Thư mục loại trừ | — | `.vercel/`, `node_modules/`, `graphify-out/` đều 0 nút (đã kiểm) |
| Tệp kết quả | — | `graphify-out/graph.json` (7,7 MB), `graph.html` (dạng gộp theo cụm vì > 5.000 nút), `GRAPH_REPORT.md`, `manifest.json` |

Chi tiết: [graphify-diff.txt](graphify-diff.txt). Truy vấn phạm vi ảnh hưởng: [graphify-explain.txt](graphify-explain.txt).

**Các nút trọng yếu và cạnh đã xác nhận** (`graphify explain`):

| Nút | Gọi bởi / gọi tới (cạnh EXTRACTED) |
|---|---|
| `recoverModalSpend()` (`src/lib/billing/modal-work.ts`) | ← `modalPartWork()`, ← `recoverModalSpendNow()`, → `recordSpendDurablyWith()`, ← `re6-009.test.ts` |
| `modalProxyHeaders()` (`src/lib/sub/tyzo-modal.server.ts`) | ← `recognizeModalWav()`, ← `re8-010.test.ts` |
| `readChatUsage()` (`src/lib/billing/run-gate.ts`) | ← `chargeWith()`, → `reportedChatTokens()`, ← `re6-008.test.ts` |
| `tidyLiveText()` (`src/lib/live/leftover-script.ts`) | ← `runSession()` trong `live-bridge.ts`, ← 3 bộ test |
| `UpdateFlow` (Android) | ← `Updater.apply()`, ← `Updater.query()`, ← `UpdateFlowCheck.kt` |
| `proxy_headers` | 2 nút: `modal_auth.py::proxy_headers` (dùng chung) và `pml.py::_proxy_headers` (bọc lại) |

**Giới hạn của sơ đồ (đề nghị kiểm toán viên lưu ý):**

1. **Không có cạnh cho `await import(...)` động.** Cụ thể thiếu các cạnh sau, cần kiểm bằng `grep`:
   - `/api/risk-sweep` và `profit-room.ts` → `recoverModalSpendNow()`;
   - `tyzo-modal-call.ts` → `modalProxyHeaders()` và `runAdmittedModalPartWith()`;
   - các route `/api/model-call`, `/api/room-groq` → `chargeAdmittedWith()`.
2. **SQL không được phân tích** (60 tệp `.sql`, thiếu `tree_sitter_sql`): migration 0059 và hàm `tyzo_admit` (0057) **không có trong sơ đồ**.
3. **3 tệp phân tích một phần** do lỗi cú pháp của bộ trích xuất: `MainActivity.kt` (từ dòng 36), `pay-confirm.test.ts`, `usage-tally.test.ts`. Các cạnh của `MainActivity.onResume` → `Updater.resume` có thể thiếu.
4. **100 tệp mã không có ký hiệu** (cấu hình, gradle, script dữ liệu).
5. Cạnh tài liệu → mã là **INFERRED** (độ tin 0,95), không phải bằng chứng chạy.

## 5. Điểm đề nghị kiểm chặt

1. **RE6-008 (`run-gate.ts`):**
   - Danh sách trường cho phép có chặn nhầm thân yêu cầu thật của app không? App gửi: `model`, `messages`, `temperature`, `max_*_tokens`, `response_format`, `reasoning_effort`, `include_reasoning`.
   - `readChatUsage` coi `total_tokens` lệch là không hợp lệ. Nhà cung cấp nào có `total_tokens` khác prompt + completion một cách hợp lệ không?
2. **RE6-009 / RE8 (`modal-work.ts`):** điều kiện ghi bù chỉ xét `status in ('mat-phan-hoi','can-doi-soat')`, hoặc `running` quá hạn lease và không còn nhịp sống. Có kịch bản nào ghi trùng, tranh với lượt đang chạy, hoặc bỏ sót không? Tỷ giá lúc ghi bù có chấp nhận được không?
3. **RE8-010:**
   - Phía gọi gửi `Modal-Key`/`Modal-Secret` cả ở lần hỏi lại 303, và chỉ tới `*.modal.run`.
   - Cấu hình dở dang thì dừng trước khi giữ Token.
   - Kiểm rằng không có giá trị bí mật nào trong kho, ứng dụng Android hay trang web.
4. **RE8-007 (`Updater.kt` / `UpdateFlow.kt`):** trình tự đăng ký receiver, lưu mã tải, hỏi lại ngay và khi `onResume`. **Bản này nay đã phát hành cho khách**, nên lỗi ở đây ảnh hưởng mọi máy cập nhật.
5. **Migration 0059 trên production:** backfill hồ sơ Token cũ (RE6-001). Đề nghị đối chiếu lại logic với dữ liệu thật **chỉ đọc**, sau khi Chủ cho phép.
6. **RE8-011:** mô phỏng ước chi phí phim dài thấp hơn đo thật (1,9× so với 2,5×). Phương án «0,03 USD + 0,08 USD cho kỹ + hệ số 3» có thể chỉ còn khoảng 5% biên ở ca «kỹ», video 74 phút, máy lạnh (đơn lẻ).

## 6. Kết quả CI Android trên `main`: APK 0.14 đã phát hành

| Mục | Giá trị |
|---|---|
| Lượt chạy | https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/actions/runs/46115459098. Job `apk` thành công; job `release` **thành công** |
| Bản phát hành | `android-v0.14`, «TyZo Sub Android 0.14», `make_latest`, đăng 2026-11-28T06:13:41Z. https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/releases/tag/android-v0.14 |
| Tệp | `tyzo-sub.apk`, 3.272.152 byte, **SHA256 `1502996fcfae9a81f0c75ecb35a960eefe5004080611bff4f03637fc7d8e0bdc`**. Khớp cả log CI lẫn digest GitHub trên tệp phát hành. Kèm `tyzo-sub.json` (SHA256 `c5ab6a51…833a8`) |
| Chữ ký | v2: true; DN `CN=TyZo Sub, O=TyZo, C=VN`; chứng chỉ SHA-256 `9ce40ce5f440a45d694222a1114e827e85812e3ec96af19d377423e43087f911` |
| So với 0.13 | **CÙNG KHÓA KÝ**, versionCode 14 > 13, nên khách cài đè được |
| Gói | `vn.tyzo.sub` versionCode 14, versionName 0.14, compileSdk 35 |

Bản phát hành được **dựng lại** trên `main`, nên SHA256 khác APK thử của nhánh (`cf11063a…`, lượt 46115051993) dù cùng mã nguồn Android. Checklist điện thoại nên dùng **bản phát hành** này.

**Chưa thử trên thiết bị thật** (RE8-007 vẫn BLOCKED ở phần thiết bị). Khách sẽ được ứng dụng 0.13 báo cập nhật sau khi web đọc bản phát hành mới (`src/lib/app-release.server.ts`).

## 7. Câu hỏi đề nghị ChatGPT trả lời

1. Việc đẩy `main` có làm production có hành vi khác mô tả ở mục 1 không? Đặc biệt migration 0059 trên dữ liệu thật và việc chặn trường ở cửa trả theo lượt.
2. Các mục PASS_LOCAL có đủ bằng chứng theo `acceptance` trong `BACKLOG.json` không?
3. Với các giới hạn của Graphify ở mục 4, có đường gọi nào bị bỏ sót mà ảnh hưởng tới kết luận không?
4. Xếp hạng phát hiện mới theo P0/P1/P2, kèm tệp, dòng và kịch bản cụ thể.

## 8. Giới hạn đã tuân thủ

- Không thuê GPU, không gọi API trả phí, không deploy Modal hay cầu nối.
- Không đổi giá hoặc chính sách tài chính; không bật giới hạn RE6-001.
- Chỉ đẩy `main` khi Chủ yêu cầu và xác nhận cả 3 hệ quả.

## 9. Commit trong phạm vi `ea38bcd..5742608`

| Commit | Nội dung |
|---|---|
| `5742608` | docs(RE8-010/011): proxy-auth guide with rollback, GPU pricing options, APK 0.14 test build details and phone checklist, split acceptance packages, checkpoint |
| `0afb243` | fix(RE8): CI signature check reads certificate digests and reports unknown instead of mismatch |
| `752ea26` | chore(RE8): CI prints APK SHA256, signing certificate and upgrade check; GPU pricing analysis |
| `b547cd8` | feat(RE8-010): optional Modal proxy auth for every GPU endpoint; GPU trial profile |
| `e80a957` | docs(RE8): reports for RE8-007 and RE8-002..006/009, updated acceptance plan, regression and checkpoint |
| `1202352` | fix(RE8): recover spend of a crashed last Modal attempt; flag qwen-turbo tier |
| `659ddeb` | fix(RE8-007): Android updater no longer sticks on a missed download event |
| `0f53a43` | docs(RE8-008, RE8-001): GPU autoscaling review and lifecycle cost simulation |
| `6becccd` | fix(RE8-008): cap the Modal text-model GPU containers |
| `fe2b42a` | docs(RE6-009): report, acceptance plan with cost caps, RE8 backlog, regression and checkpoint |
| `a344532` | fix(RE6-009): recover Modal spend lost between USD write and journal |
| `73923cd` | docs(RE6-008): report, test evidence, regression and checkpoint; pause for Medium |
| `fe80761` | test(RE6-008): type the route handler lookup |
| `9c94f49` | fix(RE6-008): field allowlist and usage consistency on pay-per-turn chat |
| `1a43509` | docs(RE7-004): report, regression and checkpoint; pause for High (RE6-008) |
| `386660a` | feat(RE7-004): keep CJK names in live translations; name policy prompt for 20 core pairs |
| `69bd245` | docs(RE7): regression after RE7, checkpoint and handoff; pause for High (RE6-008) |
| `1b1a0e6` | fix(RE7-001..004): total deadline and size cap for Modal measure, model cost zero vs missing, useful-only live events, CJK name policy draft |
| `085fe16` | docs(RE6): handoff file for independent ChatGPT audit |
| `88c7e47` | docs(RE6): audit bundle with patches, diff and SHA-256 manifest |
| `6841fa5` | docs(RE6): regression summary, handoff and checkpoint after RE6-007 |
| `b2cadf0` | test(RE6-007): verify and benchmark tyzo_admit on PostgreSQL 18.7 |
| `0a1c405` | fix(RE6-005): measure live latency on a monotonic clock with clean teardown |
| `8b733b5` | fix(RE6-004): reserve worst-case Modal cost before each measure call |
| `30ed3ba` | fix(RE6-003): verify Vercel deploys through structured API state |
| `c0bcf6f` | fix(RE6-002): fence source and journal data transfer before activation |
| `017cad3` | feat(RE6-001): persist unresolved chat costs and reconcile supplier expense |
| `dba1a05` | fix(RE6-001): reject invalid chat usage before debiting Tokens |
| `56a2d40` | test(RE6-006): verify PostgreSQL 18 migrations and restore compatibility |

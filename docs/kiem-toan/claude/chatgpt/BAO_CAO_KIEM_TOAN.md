# TyZo 5.49.5 — Hồ sơ gửi kiểm toán độc lập (ChatGPT)

Ngày: 27/11/2026. Người lập: Claude Code (tiếp quản từ Codex). Ngôn ngữ: tiếng Việt.

**Bản cập nhật sau khi gộp lên main.** `main` = nhánh `ccr-76aead9f-jp8d0r` = `39510cc` (đẩy kiểu fast-forward từ `0edb82a`, không có merge commit). Mọi commit trong mục 3, gồm cả bản vá `4c6e6ad`, đều đã ở trên main.

## 0. Yêu cầu cho người kiểm toán

Bạn là kiểm toán viên độc lập. Hãy **tìm lỗi**, đừng xác nhận lại các kết luận dưới đây. Với mỗi phát hiện, ghi:
- mức (P0/P1/P2);
- tệp:dòng;
- kịch bản gây lỗi cụ thể;
- cách sửa đề xuất;
- test cần có.

Ưu tiên đường đi của tiền (giữ, trừ, trả, đối soát), tranh chấp đồng thời, khôi phục dữ liệu và những chỗ dữ liệu khách có thể bị trừ sai hoặc TyZo chịu lỗ. Mục 7 liệt kê những điểm Claude tự thấy yếu, hãy kiểm chúng trước.

Tài liệu đi kèm:
- `code-0edb82a..39510cc.patch`: toàn bộ thay đổi mã từ bản phát hành 5.49.4 đến mã hiện tại (29 tệp, +1.093/−273, chỉ mã và test).
- Repository `thanhnghiaplay-ai/TyZo_Sub_Project`, nhánh `main` tại `39510cc`. Mã đã chốt là `4c6e6ad`. Hai commit `2893f0a` (đứng trước) và `39510cc` (đứng sau) chỉ chứa tài liệu và graph.
- Đường dẫn cố định: `https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/39510cc/<tệp>`, ví dụ `src/lib/billing/run-gate.ts`.
- Bằng chứng trong kho: `docs/kiem-toan/claude/` (Claude) và `docs/kiem-toan/codex/` (Codex).

## 1. Bối cảnh sản phẩm

TyZo Sub là web SaaS tạo phụ đề tiếng Việt cho video. Luồng chính: nhận dạng lời nói (ASR) → dịch bằng LLM → xuất SRT. Có thêm Dịch trực tiếp (live) qua cầu nối WebSocket và ứng dụng Android.

Công nghệ: TanStack Start (React 19) trên Vercel, PostgreSQL (Neon; có tùy chọn VPS), Node 22. Nhà cung cấp gồm Groq (Whisper, gpt-oss, llama, qwen3, kimi), Alibaba DashScope (qwen-turbo/plus/max, ASR, TTS) và GPU riêng "TyZo Modal".

Khách trả bằng **Token dịch**. 1 Token bằng giá gốc 1 giây Whisper Turbo. Mỗi lượt chạy mở một **phiếu** (`run_tickets`) giữ trước Token. Mỗi lệnh tới nhà cung cấp phải **giữ phần ước tính trước khi gọi** (`run_gate_calls`), rồi quyết toán theo usage thật. Thiếu usage hoặc usage bất thường thì đánh dấu `can-doi-soat` (cần đối soát).

## 2. Lịch sử các đợt kiểm toán

| Đợt | Nội dung | Trạng thái |
|---|---|---|
| v5.49 → 5.49.4 | 80 mục (MAIN/SPLIT/REF/AZ/DEEP/R3–R8/NEW), RE2 (6 mục), RE3 (8 mục) | Đã phát hành 5.49.4 (`0edb82a`) |
| RE4 (Codex) | 6 mục RE4-001…006 + sửa đóng gói và khôi phục | Đã lên main trong lần đẩy này |
| Claude tiếp quản | Tái nghiệm thu, soak, RE4-001 vòng 2 và 3, RE4-006 | Đã lên main (`39510cc`) |

## 3. Các commit mã đã lên main (từ `0edb82a` đến `39510cc`)

Thứ tự lên main có hai lần đẩy:
- lần 1 đến `2893f0a` (các commit Codex, `c5e9db0` và `c899afd`);
- lần 2 đến `39510cc` (`4c6e6ad` và tài liệu).

Giữa hai lần đẩy, bản chính thức có lỗ hổng ở mục 4, RE4-001, v3. Commit tài liệu và graph (`aec2add`, `c415289`, `2893f0a`, `39510cc`) không có trong bảng.

| Commit | Tác giả | Mục | Tệp mã chính |
|---|---|---|---|
| `a5af491` | Codex | RE4-001 v1: chuẩn hóa trần đầu ra; giữ theo cả cửa sổ ngữ cảnh | `src/lib/billing/run-gate.ts` |
| `b8a4609` | Codex | RE4-004: khóa ghi CSDL VPS trước khi chuyển nguồn | `deploy/vps/tyzo.sh`, `scripts/re3-restore-pg.test.mjs` |
| `2b169b1` | Codex | RE4-002: hạn lease độc lập với nhịp bị treo | `src/lib/billing/work-lease.ts`, `src/lib/pg-pool.server.ts`, `src/lib/db.ts`, `scripts/live-bridge.ts` |
| `604bf08` | Codex | RE4-003: hàng đợi công bằng chỉ giữ suất mà waiter dùng được | `migrations/0056_admission_lane_fairness.sql` |
| `aaba2aa` | Codex | RE4-005: dò WebM có biên cha, giới hạn phần tử | `src/lib/billing/audio-probe.ts` |
| `aa73aca` | Codex | Đóng gói PGlite cho bản Node; cửa sổ Alibaba; tắt thinking qwen-plus | `vite.config.ts`, `src/lib/sub/alibaba-catalog.ts`, `run-gate.ts` |
| `b829fd9` | Codex | CODEX-RESTORE-TOC: đọc hết mục lục `pg_restore -l` dưới `pipefail` | `deploy/vps/tyzo.sh` |
| `c5e9db0` | Claude | RE4-001 v2: giữ theo cận byte thay cho cả cửa sổ | `run-gate.ts`, `gate-reserve.test.ts` |
| `c899afd` | Claude | Test R7-004 | `src/lib/pipeline/translate-edit.test.ts` |
| `4c6e6ad` | Claude | RE4-001 v3: chặn nội dung không phải chữ | `run-gate.ts`, `gate-reserve.test.ts` |

Migration mới duy nhất là `0056`. Nó chỉ `create or replace function tyzo_admit(...)`, giữ nguyên chữ ký hàm, không xóa hay sửa bảng. Vercel tự chạy migration khi dựng (`npm run build` gồm `db:migrate`).

## 4. Chi tiết từng mục RE4

### RE4-001 (P0) — Dự toán LLM phải là cận trên. Trạng thái: PARTIAL

**Vấn đề gốc:** `byteLength/3` không phải cận trên số token. Test của Claude dùng tokenizer thật: công thức này bị vượt ở 30/36 ca (CJK hiếm, emoji, ASCII ngẫu nhiên…).

**Codex (v1):** giữ theo cả cửa sổ ngữ cảnh của model cộng trần đầu ra. Mô hình không có cửa sổ thì từ chối. Hệ quả: qwen-plus có cửa sổ 1.000.000 token × 0,4 USD/triệu, nên mỗi lệnh dịch vài KB phải giữ khoảng 0,40 USD phần vào. Phiếu nhỏ bị chặn oan; qwen-turbo trả 422.

**Claude (v2, v3):**
```ts
export const PROMPT_FRAME_TOKENS = 512;
export function promptTokenBound(bodyBytes: number, context: number | null | undefined): number {
  const bound = 2 * Math.max(0, Math.ceil(bodyBytes)) + PROMPT_FRAME_TOKENS;
  return Number.isSafeInteger(context) && (context as number) > 0 ? Math.min(bound, context as number) : bound;
}
```
- Phần giữ = `chatCost(promptTokenBound(byte thân JSON đã chuẩn hóa, cửa sổ nếu biết), outCap)`.
- `prompt_tokens > promptTokenBound` hoặc `completion_tokens > outCap` thì đánh dấu đối soát.
- qwen-turbo được gửi kèm `enable_thinking=false`, giống qwen-plus. Trên đường `max_tokens` của DashScope vẫn chặn `enable_thinking`/`thinking_budget`/`reasoning_effort`, `enable_search` và công cụ không phải `function`.
- v3 (`4c6e6ad`): `messages[].content` chỉ được là chuỗi, `null`, hoặc mảng các phần `{type:"text", text:string}`. Ảnh, âm thanh và tệp bị từ chối trước khi giữ hay gọi nhà.

**Lập luận cận trên:** tokenizer byte-level BPE (o200k/Harmony, Llama 3, Qwen) bắt đầu từ từng byte rồi chỉ gộp, nên một token luôn có ít nhất 1 byte UTF-8. Suy ra token của chữ ≤ byte của chữ ≤ byte JSON (escape JSON chỉ làm dài thêm). Lần cộng byte thứ hai phủ hai phần:
- khung mỗi tin nhắn: khoảng 5 token, trong khi JSON của chính tin nhắn ≥ 25 byte;
- schema công cụ do nhà viết lại: Qwen dùng `json.dumps` có dấu cách, Harmony đổi sang dạng TypeScript.

Hằng 512 phủ system mặc định và lời dẫn công cụ do nhà tự chèn.

**Kiểm chứng offline** (`docs/kiem-toan/claude/RE4-001/tokenizer-bound.mjs` và `.log`):
- Tokenizer: `@lenml/tokenizer-qwen2_5@3.7.2` (khung công cụ Qwen dựng tay theo chat_template), `@lenml/tokenizer-llama3@3.7.2`, `js-tiktoken@1.0.21` o200k_base (khung Harmony mô phỏng).
- 12 loại chữ × {không công cụ, 1 công cụ, 64 công cụ} = 36 ca.
- Kết quả: cận bị vượt **0/36 ca**; tỷ lệ token/cận lớn nhất 0,906 (CJK hiếm 4 byte).

**Test (PostgreSQL thật):**
- phiếu 100 Token chạy được với model cửa sổ 1 triệu;
- model chưa có cửa sổ vẫn giữ theo byte;
- usage vượt cận chuyển sang `can-doi-soat`;
- thân ~6 KB với phần giữ 100 thì trả 402 và không gửi lệnh nào;
- ảnh/âm thanh/tệp bị chặn (test hỏng khi bỏ phần sửa).

**Chưa có:** so `usage.prompt_tokens` thật của Groq/Alibaba với cận. Môi trường không có key và không được phát sinh chi phí.

### RE4-002 (P1) — Heartbeat treo khi pool/mạng treo. PASS cục bộ (Codex)

Lease dùng hạn độc lập theo đồng hồ đơn điệu, không chồng nhịp, báo mất lease một lần và bỏ qua phản hồi muộn. `stop()` chờ tối đa 1 s rồi hủy. Web và cầu nối live dùng chung `createPgPool`/`withPgTransaction`: hủy socket khi đang chạy, chặn SQL sau checkout đã hủy, giữ `statement_timeout`. Câu UPDATE lọc theo id, trạng thái và tuổi heartbeat. Codex chạy 43/43 trên PostgreSQL 17.12, có restart cụm thật.

### RE4-003 (P1) — Hàng đợi công bằng xuyên lane chặn live. PASS cục bộ (Codex)

Migration 0056: waiter cũ chỉ giữ loại suất mà chính nó dùng được (chung, theo lane, phần dành cho live). Chỉ đếm waiter còn hoạt động, đủ cap lane/người, không bị lease unknown chặn. `liveReserve` mặc định 0. Codex chạy 46/46 và diễn tập migration: cài mới, chạy lặp, nâng từ 0055, lỗi giữa chừng, rollback.

### RE4-004 (P0) — Khóa ghi khi cutover. PARTIAL (Codex)

`tyzo.sh` trước đây bỏ qua lỗi `dc stop`. Nay:
- kiểm trạng thái container;
- lấy khóa điều phối;
- từ chối phiên ghi ngoài Compose và giao dịch đã prepare;
- khóa kết nối mới trong PostgreSQL;
- lập bảng kê bằng snapshot nhất quán;
- restore trong single transaction, fail-fast.

Codex chạy 21/21 với Docker giả (sau CODEX-RESTORE-TOC là 22/22). **Chưa diễn tập Vercel/Neon/VPS thật.**

### RE4-005 (P1) — Dò WebM. PASS cục bộ (Codex)

Đi theo ngữ pháp Segment→Tracks→TrackEntry / Segment→Cluster→BlockGroup; giới hạn 25 MiB, số phần tử và số gói. Unknown size chỉ hợp lệ ở Segment/Cluster. Sai cấu trúc thì trả 422 trước khi gọi nhà. Bộ dò và FFprobe cùng đo 2,22 s trên tệp Chromium MediaRecorder.

### RE4-006 (P2) — Graphify lệch commit. PASS (Claude)

Graph dựng từ `git archive 4c6e6ad` trong thư mục sạch. Provenance gồm SHA nguồn, SHA-256 của graph và danh sách phần không phân tích được (57 SQL, 3 lỗi cú pháp). Graph chỉ là bản đồ cấu trúc, không phải bằng chứng logic.

### CODEX-RESTORE-TOC (P1). PASS cục bộ

`pg_restore -l | grep -q` dưới `pipefail`: grep thoát sớm làm writer nhận SIGPIPE, nên script hiểu nhầm là dump thiếu schema public. Nay đọc hết stream rồi lấy mã thoát thật. Hồi quy thất bại trước khi sửa, đạt 22/22 sau khi sửa.

## 5. Kết quả kiểm chứng của Claude

Môi trường: Node 22.23.5, PostgreSQL **16.15** loopback (máy không có 17.12), người dùng thường (không root), Chromium 158, k6 0.55.0. Upstream giả; không có nhà cung cấp, GPU hay máy Android thật.

| Cổng | Kết quả |
|---|---|
| `npm test` đầy đủ, chạy tuần tự, PG thật | `4c6e6ad`: 1.763 đạt, 7 bỏ qua (thiếu `.grok/`, mẫu của nền tảng khác), 0 lỗi |
| tsc / eslint | 0 lỗi / 0 lỗi, 23 cảnh báo có sẵn (đo ở `c899afd`) |
| Build Vercel + node-server | Đạt (`c899afd`) |
| Chromium máy tính + điện thoại | `/gioi-thieu`, `/login`: 200, có CSS, không tràn ngang, không lỗi console; `/api/app-me` thiếu thiết bị trả 401 |
| Soak hỗn hợp, một mạch | 3.614 s, 199 vòng, PASS (chi tiết dưới) |
| Semgrep 1.185.0, luật ghim `a5ad1714` | 92 phát hiện: 78 dương tính giả, 13 chấp nhận (`replaceAll`), 1 mã thừa; 0 mục mở |
| dependency-cruiser 18.7.2 | 0 lỗi; 9 cảnh báo (8 vòng đều có `import()` động, 1 lib→components) |
| gitleaks | 734 commit + cây tệp: 0 rò rỉ |

**Soak** (`docs/kiem-toan/claude/soak/REPORT.md`): mỗi vòng gồm (a) cầu nối live WebSocket thật + PostgreSQL thật + usage giả có replay ở 1…300 phiên đồng thời; (b) admission `tyzo_admit` 25/50/100/200 khách + đợt 300; song song có k6 300 VU gọi bản Node.
- Admission: 0 lỗi, 0 không chắc, **0 vượt cap** lane/provider/model. p95 tệ nhất ở mức 200 khách là 630 ms.
- Đói trong cửa sổ 3 s: 4, 12 và 377 lượt khách cộng dồn ở mức 50, 100 và 200. Cửa sổ 10 s khi máy rảnh: 0 đói.
- Live: 0 vi phạm sổ cái, 0 trừ trùng, số lệnh nhà khớp số quan sát ở 199/199 vòng, socket nhà tối đa 24 (= cap).
- Web: 313.340 yêu cầu, 0% lỗi, p95 13,4 ms.
- RSS bản Node đứng ở 724 MB sau 20 phút đầu.
- Sự cố: khoảng 15 s giữa lượt, Claude chạy một test trên cùng CSDL soak. Các vòng sau vẫn đạt.

**Tái nghiệm thu 80 mục** (`docs/kiem-toan/claude/re-accept/DOI_CHIEU_80_b829fd9.json`): 69 PASS, 3 PASS_LOCAL, 5 PARTIAL, 1 BLOCKED, 2 BY_DESIGN. Quy tắc: không hạ kết quả lịch sử; chỉ nâng khi có bằng chứng mới. "PASS" phần lớn nghĩa là test mang ID của mục đạt trong `npm test`; **không phải** kiểm lại từng tiêu chí bằng tay.
- PARTIAL: MAIN-040 (ghi chi phí GPU Modal chưa có test hành vi); AZ-002/003/004/008 (cần máy Android thật).
- BLOCKED: R3-006 (updater Android).
- BY_DESIGN: R7-002, R7-005.

## 6. Những gì chưa được kiểm

1. Usage thật từ nhà cung cấp (RE4-001), độ trễ âm thanh → chữ hiển thị, ASR/TTS thật.
2. Staging Vercel/Neon/VPS: cutover/restore (RE4-004), chống đói khi có độ trễ mạng thật.
3. Máy Android thật.
4. PostgreSQL 17 (Claude dùng 16.15; Codex dùng 17.12).
5. Bản 5.49.5 đã lên main (`39510cc`) nhưng **chưa ai xác nhận Vercel dựng thành công**, migration 0056 đã chạy trên Neon, hay VPS đã cập nhật cầu nối (`tyzo` → 2).
6. Trong khoảng giữa hai lần đẩy, chưa kiểm có yêu cầu nào gửi ảnh/âm thanh/tệp qua cửa trả theo lượt không. Đề nghị truy `run_gate_calls` trạng thái `can-doi-soat` trong khoảng thời gian đó.

## 7. Điểm Claude tự thấy yếu — đề nghị kiểm trước

1. **RE4-001, giả định "1 token ≥ 1 byte".** Có nhà nào chèn thêm token không tỷ lệ với byte không? Ví dụ: system prompt dài do nhà tự thêm (> 512 token), `response_format`/JSON schema, `tool_choice`, các trường lạ nhà nhận mà cửa không xóa, Kimi K2. Cửa có nên lọc thân theo danh sách trường cho phép thay vì danh sách cấm?
2. **RE4-001, đối soát:** khi usage vượt cận, `settleGateCall` trừ tối đa phần đang giữ và ghi phần thiếu vào đối soát, nên TyZo chịu phần thiếu cho tới khi đối soát. Có cần giới hạn tần suất hoặc khóa tài khoản khi lặp lại?
3. **RE4-001, fallback khi thiếu usage** vẫn dùng `byteLength/3` cho phần vào. Đây là quy tắc cũ, giữ để không tăng tiền trừ khách. Có nên dùng cận mới không?
4. **Cửa trả theo lượt** nhận mọi model có giá trong bảng Groq/Alibaba, kể cả model app không dùng. Có nên giới hạn theo danh sách model dịch?
5. **Migration 0056** thay hàm `tyzo_admit` khi có thể đang có giao dịch dùng bản 0055. Hãy kiểm tính an toàn khi Vercel chạy migration lúc đang có lưu lượng.
6. **Admission:** đói trong cửa sổ 3 s khi tải hỗn hợp. Lỗi chính sách hay chỉ do cửa sổ đo trùng ngưỡng?
7. **`tyzo.sh` cutover:** chỉ thử với Docker giả. Kiểm các nhánh lỗi mạng giữa chừng và trường hợp Vercel đã được gọi nhưng chưa rõ kết quả.

## 8. Rollback

- Mỗi commit tách riêng; revert theo thứ tự ngược, sau khi các lệnh đang chạy đã xong và sổ đã đối soát.
- Main có thể quay về `0edb82a` (trước toàn bộ đợt này) hoặc `2893f0a` (không nên dùng: thiếu bản vá RE4-001 v3). Hàm 0056 để lại không gây hại, vì chữ ký giống 0055.
- Không sửa migration đã áp dụng; nếu cần thì viết migration tiến tới.

# TyZo 5.49.6 — Hồ sơ gửi kiểm toán độc lập (ChatGPT)

Ngày: 28/11/2026. Người lập: Claude Code. Phạm vi: mọi thay đổi từ `39510cc` (lần kiểm toán trước) đến `ea38bcd` (main hiện tại).

## 0. Yêu cầu cho người kiểm toán

Hãy **tìm lỗi**, đừng xác nhận lại. Mỗi phát hiện ghi các mục sau:
- mức (P0/P1/P2);
- tệp:dòng;
- kịch bản gây lỗi cụ thể;
- cách sửa;
- test cần có.

Ưu tiên kiểm:
- tiền: giữ, trừ, nợ, đối soát;
- tranh chấp trong cửa nhận việc (`tyzo_admit`, migration 0057);
- chuyển dữ liệu giữa Neon, VPS và Vercel (`deploy/vps/tyzo.sh`);
- chỗ khách có thể dùng miễn phí hoặc TyZo chịu lỗ.

**Mục 6 là điểm yếu Claude tự thấy. Hãy kiểm các điểm đó trước.**

Tài liệu đi kèm:
- `code-39510cc..ea38bcd.patch`: toàn bộ thay đổi mã, 38 tệp, +1.343/−77. Đã bỏ 4 tệp âm thanh WAV mẫu.
- Repository `thanhnghiaplay-ai/TyZo_Sub_Project`, nhánh `main` ở `ea38bcd`. Bằng chứng trong `docs/kiem-toan/v5.49.6/`.
- Đường dẫn cố định: `https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/ea38bcd/<tệp>`.

## 1. Bối cảnh

TyZo Sub là web làm phụ đề tiếng Việt (TanStack Start trên Vercel, PostgreSQL Neon, Node 22). Ngoài web còn có:
- cầu nối Dịch trực tiếp (WebSocket) chạy trên VPS;
- GPU nhận dạng riêng trên Modal;
- ứng dụng Android.

Khách trả bằng Token dịch theo cách sau:
- mỗi lượt mở một phiếu giữ (`run_tickets`);
- mỗi lệnh tới nhà cung cấp phải giữ trước phần ước tính (`run_gate_calls`), rồi quyết toán theo usage thật;
- bất thường thì đánh dấu `can-doi-soat`.

**Neon production chạy PostgreSQL 18**: ảnh chụp console cho thấy "Version 18". Mọi test của Claude chạy trên PostgreSQL **16.15**.

## 2. Đã lên main (theo thứ tự)

| Commit | Mục | Thay đổi chính |
|---|---|---|
| `cadb506` | RE5-001 | `model-call.ts` và `room-groq.ts` dùng **cùng một thân đã chuẩn hóa** (`outbound`) cho cận giữ trước và lệnh gửi nhà. Thêm `payPerTurnChat`: cửa trả theo lượt chỉ nhận model dịch có trong danh mục, chặn `groq/compound*` và model lạ. `roomChatModels` dùng cùng quy tắc. |
| `a4aceeb` | RE5-004 A/B | `tyzo.sh`: `vercel@65.14.0` ghim; `env add --force` qua stdin (bỏ `env rm`); deploy phải `inspect` Ready; nhật ký bền `${CONF}.chuyen`; `khoa_va_doi_soat_chuyen` từ chối khi nhật ký dở dang. |
| `5e50c1f` | RE5-002 | Chat thiếu hoặc sai usage (thiếu, âm, không phải số, thân không phải JSON): `settleGateCall(deferDebit)` trừ 0 và ghi toàn bộ ước tính vào `short_units` với trạng thái `can-doi-soat`. ASR thiếu `duration` vẫn trừ theo số giây đã dò. |
| `74f7027` | MAIN-040 | Tách `modalPartWork` (`src/lib/billing/modal-work.ts`) khỏi server function để test hành vi. |
| `c9d42dd` | RE5-003 | Migration **0057**: `tyzo_admit` mới. Khách chờ được ưu tiên nếu dùng chung lane hoặc provider với khách mới, và chỉ khi chính họ nhận được suất. Duyệt bằng vòng lặp PL/pgSQL dưới `pg_advisory_xact_lock`. |
| `444cae1` | RE5-005 | `admission-bench.ts` thêm số đo theo lane và `maxGapMs`. |
| `eaa9b37` | GPU | `eval/asr/luong-ky/modal/modal_app.py`: `buffer_containers` (mặc định 2) cho lớp `Asr`. |
| `4e672fd` | Live | Web mặc định Qwen 3.5 (`live-screen.tsx`); APP_VERSION 5.49.6. |
| `beaa2e5` | Live | `leftover-script.ts`: cầu nối bỏ chữ Hán, kana, Hangul còn sót trong bản dịch khi đích không phải zh/ja/ko/yue. Android 0.13 mặc định Qwen 3.5. |
| `ed83cff` | MAIN-040-B | Migration **0058** thêm `run_modal_settlements.provider_usd`; số USD được ghi trước chứng từ chi phí bền. |
| `ea38bcd` | RE5-004 C/D | Neon → VPS: hỏi khóa ghi. Có khóa thì tạo endpoint chỉ đọc, tắt endpoint ghi bằng Neon API, kiểm đã bị chặn, rồi chép và đối soát qua endpoint chỉ đọc. Lỗi thì bật lại; xong thì giữ khóa. Menu thêm 7 (mở lại Neon), 8 (xem nhật ký), 9 (mở lại nguồn VPS), đều cần gõ xác nhận. |

Các commit `docs`/`chore` còn lại chỉ thêm tài liệu và script đo chạy trên VPS (`deploy/vps/do-modal`, `deploy/vps/do-live`).

## 3. Kiểm chứng của Claude

| Loại | Kết quả |
|---|---|
| `npm test` đầy đủ, UID thường, PG 16.15 | `ea38bcd`: 1.803 đạt, 7 bỏ qua (thiếu `.grok/`), 0 lỗi |
| Test tái hiện | Mỗi bản sửa có test **hỏng trên mã cũ, đạt trên mã mới** (đã chạy cả hai): RE5-001 3/4 hỏng; RE5-002 6/7; RE5-003 2 ca; MAIN-040-B 2; RE5-004 A (mã cũ làm mất `BETTER_AUTH_SECRET`) |
| Migration | 0057: cài mới; nâng 0056 → 0057 khi có lượt chạy và khách chờ; chạy lặp; lỗi giữa chừng rollback về 0056. 0058: cài mới 58, chạy lặp |
| Soak hỗn hợp trên 0057 | 3.614 s, 203 vòng, 0 vượt trần, `maxGap` tệ nhất 3,57 s; admission p95 dưới 100 ms tới 100 khách, khoảng 200 ms ở 200 khách; web p95 10,3 ms |
| Usage thật (RE4-001) | 15 lệnh Groq/Alibaba thật: `prompt_tokens` tối đa bằng **0,18** cận `2×byte+512`; 0 lệnh vượt |
| GPU Modal thật | 30 s âm thanh: lần đầu 16 s, máy nóng 9,4 s, khoảng 0,004 USD; 4 lệnh song song: 31 s trước sửa, 15 s sau sửa |
| Dịch trực tiếp thật, qua cầu nối | Qwen 3.8: chữ đầu 2,9 s (p50); Qwen 3.5: 0,39 s; bản dịch đầu 0,65 s |
| Khóa ghi Neon thật (branch thử, đã xóa) | `ALTER DATABASE … read_only` **không khóa được**; tắt endpoint thì khóa hẳn; endpoint chỉ đọc vẫn đọc được |
| Semgrep, gitleaks, dependency-cruiser (ở `444cae1`) | 92 phát hiện đều đã phân loại; 0 rò rỉ; 0 lỗi |

## 4. Đọc trên bản sao production (chỉ đọc, branch Neon thử)

- `_migrations` có tới 0057 (lúc đọc, 0058 chưa lên).
- `run_gate_calls` trống: chưa từng có lệnh trả theo lượt, nên không có gì cần đối soát.
- 9 tài khoản; Chủ xác nhận chưa có khách.

## 5. Chưa kiểm

- PostgreSQL 18, phiên bản production.
- Chuyển nguồn trọn vẹn trên Neon và VPS thật với dữ liệu thật.
- Máy Android thật.
- Chất lượng Qwen 3.5 so với 3.8: mới xem tay một clip.
- Năm model dịch trong danh mục không có trong key thử: llama-3.3-70b, llama-3.1-8b, muse-spark-open, minimax-m2.7, qwen-turbo.

## 6. Điểm yếu Claude tự thấy — kiểm trước

1. **RE5-002 có thể bị lạm dụng thành dịch miễn phí?** Thiếu usage thì trừ 0 và chờ đối soát. Hãy tìm xem khách có cách nào làm nhà trả 200 mà không có usage hợp lệ, hoặc thân không phải JSON. `stream` và `n>1` đã bị chặn; còn `response_format`, tham số lạ, model lạ? Hiện **chưa có công cụ Admin đối soát** các nghĩa vụ `can-doi-soat`, và chưa có giới hạn số lần.
2. **Cận `2×byte+512` (RE4-001/RE5-001)** dựa trên giả định "một token ≥ một byte" và phần nhà tự chèn ≤ 512 token. Đo thật mới có 5 model.
3. **0057 vòng lặp dưới khóa toàn cục:** chi phí tăng theo số khách chờ dùng chung tài nguyên. Hãy kiểm trường hợp có hàng nghìn dòng `work_waiters` còn hiện diện, và tính đúng của việc trừ dần phần trống bằng `jsonb_set`.
4. **0057 so với 0056:** khóa trong bảng tra là `jsonb_build_array(...)::text`. Hãy kiểm id hoặc model có ký tự lạ, và lane không có trần (`lim->>lane` null nên không giữ chỗ).
5. **Khóa Neon (`tyzo.sh`):**
   - `neon_tim` chỉ duyệt tối đa 100 project.
   - Tắt endpoint thì web cũ trên Vercel sập hẳn (cố ý).
   - Script bị kill giữa "tắt endpoint" và "ghi nhật ký `xong`" thì nhật ký dừng ở `neon-khoa` và phải mở lại tay bằng mục 7.
   - Bật lại lỗi chỉ in hướng dẫn.
   - Key Neon đi qua `printf` (builtin) vào `curl -K -`; hãy kiểm có lộ ở chỗ nào không.
6. **Bộ lọc chữ sót** bỏ cả tên riêng hay thành ngữ chưa dịch, nên câu có thể mất ý ("Bạn phải luôn如一." thành "Bạn phải luôn."). Bộ lọc cũng áp cho mẩu `delta`; hãy kiểm việc ghép mẩu ở client.
7. **`payPerTurnChat` chỉ có test đọc mã nguồn** (regex trên route), chưa có test gọi route thật.
8. **`buffer_containers=2`** làm tăng chi phí GPU lúc có việc (2 máy L4 rảnh, tắt sau 60 s). Chưa đo chi phí thực tế theo giờ.
9. **Script đo trên VPS** (`deploy/vps/do-live/*.ts`) đọc `alibaba_key` từ CSDL bên trong container cầu nối. Script không in key, nhưng nằm trong kho; hãy kiểm có rủi ro không.

## 7. Rollback

- Mỗi commit tách riêng; revert theo thứ tự ngược.
- Migration 0057 và 0058 không sửa hay xóa dữ liệu: 0057 chỉ `create or replace function` giữ chữ ký; 0058 chỉ thêm cột.
- Quay hành vi 0056 bằng migration tiến tới 0059 nạp lại thân hàm 0056.
- App cũ gọi `tyzo_admit` vẫn chạy.
- Nhật ký `${CONF}.chuyen` xóa được khi không có lần chuyển nào dở dang.

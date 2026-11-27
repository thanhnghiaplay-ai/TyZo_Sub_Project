# v5.49.6 · Bàn giao (Claude, MEDIUM → xin HIGH)

Nhánh `audit/v5.49.6-claude-re5` tách từ `6bbf292`. Commit này là baseline `39510cc` cộng một commit tài liệu của Claude (làm mới hồ sơ ChatGPT, trước đây chưa đẩy). Main không đổi, vẫn ở `39510cc`. Đầu vào bàn giao: `handoff-input/`.

## RE5-005 · PASS_LOCAL (MEDIUM, upstream giả)

Soak hỗn hợp một mạch trên 0057: 3.614 s, 203 vòng, PASS. Kết quả:
- 0 vượt trần.
- Khoảng chờ dài nhất của một khách, tệ nhất ở mọi lane: 3,57 s; không ai bị bỏ đói quá ngưỡng.
- Admission p95 dưới 100 ms tới mức 100 khách; khoảng 200 ms ở mức 200 khách do khóa advisory toàn cục.
- Web p95 10,3 ms, 0% lỗi.
- Live: 0 vi phạm sổ cái.
- RSS bản Node ổn định.

Chi tiết: `RE5-005/REPORT.md`. Chưa đo: âm thanh → chữ với nhà thật, staging, GPU.

## RE5-003 · ĐÃ SỬA CỤC BỘ (HIGH, migration 0057)

`migrations/0057_admission_shared_cap_fairness.sql` nạp lại `tyzo_admit`: giữ chữ ký, bảng và mọi trần; 0056 không sửa.
- Khách chờ được xét nếu còn hiện diện, đã chờ ít nhất 3 giây, đến trước và dùng chung ít nhất một tài nguyên với khách mới (cùng lane hoặc cùng nhà).
- Khách chờ chỉ giữ chỗ khi chính họ nhận được suất trên mọi tài nguyên của họ.

Kết quả:
- Test: 18/18 test admission trên PG thật. Hai test RE5-003 hỏng trên 0056, đạt trên 0057. Có thêm test chống chặn oan và test 60 yêu cầu đồng thời không vượt trần.
- Diễn tập migration: cài mới; nâng từ 0056 khi đang có tải; chạy lặp; lỗi giữa chừng thì rollback về 0056.
- Hiệu năng gần như cũ: mức 200 khách p95 280 ms (0056: 275).
- npm test 1.790 đạt, 7 bỏ qua, 0 lỗi.
- Rollback: app cũ vẫn gọi được hàm. Muốn quay lại hành vi 0056 thì viết migration tiến tới 0058.

### Ghi chép lúc tái hiện

Trong 0056, hàng chờ ưu tiên chỉ xét khách chờ **cùng provider và cùng model**, trong khi trần theo nhà và trần theo lane dùng chung. Đã tái hiện trên PG thật hai trường hợp:
1. Khách chờ model Y bị khách mới model X cùng nhà chen khi trần nhà đã đầy.
2. Khách chờ nhà B bị khách mới nhà A chen khi trần lane đã đầy.

Hai trường hợp nằm trong `work-admission-pg.test.ts` dưới dạng `todo`. Đề xuất sửa bằng migration tiến tới 0057 (chi tiết ở `BACKLOG.json`): khách chờ được ưu tiên nếu dùng chung ít nhất một tài nguyên với khách mới, nhưng chỉ khi chính khách chờ đó nhận được suất. Không sửa 0056.

## MAIN-040 · PASS_LOCAL (MEDIUM)

Tách phần việc sau khi giữ phiếu thành `modalPartWork` (`src/lib/billing/modal-work.ts`), server function gọi lại hàm này, hành vi giữ nguyên. Test hành vi trên PG thật đạt 6/6:
- thành công;
- 429 rồi chạy lại;
- lỗi hẳn;
- gửi lại đoạn đã xong;
- ghi chứng từ chi phí lỗi;
- cùng mã ghi hai lần (không nhân đôi; khác số tiền thì chặn).

npm test 1.785 đạt, 7 bỏ qua, 0 lỗi; build Vercel đạt. **Còn mở MAIN-040-B:** khi GPU đã chạy mà ghi chứng từ lỗi, số USD thật không được lưu nên đối soát không biết số tiền. Đề xuất migration tiến tới thêm cột usd cho `run_modal_settlements`.

## RE5-002 · ĐÃ SỬA CỤC BỘ (MEDIUM)

Dịch: khi nhà không trả usage hợp lệ (thiếu, âm, sai kiểu, hoặc thân không phải JSON), bản cũ trừ khách theo ước tính, trong đó phần ra lấy bằng trần `outCap`, tức tự trừ theo cận trên. Nay quyết toán chạy với `deferDebit`: trừ 0, toàn bộ ước tính ghi vào `short_units` với trạng thái `can-doi-soat`. Phần giữ vẫn được nhả và chi phí nhà vẫn được ghi trong cùng giao dịch. Usage hợp lệ nhưng vượt cận thì vẫn trừ theo số thật (trong phần giữ) và đánh dấu đối soát. ASR thiếu `duration` vẫn tính theo số giây đã dò, vì đó là số đo thật; nếu đổi thành 0 thì khách chọn định dạng `text` là dùng miễn phí. Đã kiểm lại: chạy lại cùng lệnh không trừ hai lần; 6 lệnh đồng thời đều đúng. Test: 7/7 (mã cũ hỏng 6/7); npm test 1.779 đạt, 7 bỏ qua, 0 lỗi. Còn thiếu: công cụ Admin để đối soát các nghĩa vụ này; quy trình là quyết định của Chủ.

## RE5-004 · PARTIAL (HIGH; A, B đã sửa cục bộ; C, D còn mở)

- **A.** Bản cũ chạy `env rm` rồi mới `env add` cho từng biến; nếu bước thêm lỗi thì production mất biến. Đã tái hiện: `BETTER_AUTH_SECRET` mất, xem `RE5-004/before-old-script.log`. Nay `chay_vercel_sh` dùng `vercel@65.14.0` ghim và `env add --environment production --force` qua stdin (giá trị không nằm trên dòng lệnh), không còn `env rm`. Deploy phải trả địa chỉ `https://…` và `inspect` báo Ready; nếu không thì thoát mã 3 (không rõ kết quả).
- **B.** Thêm nhật ký bền `${CONF}.chuyen`: `khoa-nguon` → `vercel-bat-dau` → `xong` hoặc `loi-env-do-dang` / `loi-deploy-chua-ro` / `loi-chua-doi-vercel`; ghi `da-mo-lai` khi mở lại nguồn VPS. Khi nhật ký còn dở dang, `khoa_va_doi_soat_chuyen` từ chối trước khi đụng dịch vụ hay CSDL. Nguồn VPS giữ khóa ở mọi nhánh lỗi.
- **C (mở).** Chiều Neon → VPS không khóa ghi trên Neon. Ghi vào Neon sau lần đối soát cuối và trước khi đổi DNS sẽ mất. Đề xuất: `ALTER DATABASE … SET default_transaction_read_only=on`, cắt các phiên của cùng role, đối soát lại, rồi mới đổi DNS. Cần xác minh quyền trên Neon staging.
- **D (mở).** Sau `loi-deploy-chua-ro` chưa có lệnh hướng dẫn kiểm tra rồi mở lại nguồn hoặc đóng nhật ký.
- Test: `re5-004-vercel.test.mjs` 5/5 (npx giả); `re3-restore-pg` thêm khẳng định nhật ký, cùng `re2-restore` đạt 27/27; npm test 1.772 đạt, 7 bỏ qua, 0 lỗi.

## RE5-001 · ĐÃ SỬA CỤC BỘ (HIGH)

- A: cả hai route dùng `const outbound = parsed.body ?? body` cho cận giữ trước và lệnh gửi nhà.
- B: `payPerTurnChat` trong `model-catalog.ts`: cửa trả theo lượt chỉ nhận model dịch có trong danh mục (Groq 7 model, Alibaba qwen-turbo/plus/max). Kiểm ở cả hai route trước `chargeWith`. `roomChatModels`/`dearestRoomChat` dùng cùng quy tắc nên khách không thấy model mà bị từ chối. Key riêng của khách không đổi.
- Test `re5-001.test.ts` 4/4 (trên mã cũ 1 đạt, 3 hỏng). npm test 1.767 đạt, 7 bỏ qua, 0 lỗi. Build Vercel đạt.
- Ảnh hưởng: phòng có model ngoài danh mục thì model đó không còn đi cửa trả theo lượt; phần giữ ở chế độ Tự động có thể giảm nếu model đắt nhất trước đây nằm ngoài danh mục. Không đổi giá.

### Ghi chép lúc tái hiện (0ef9539)

- **A (P0).** `src/routes/api/model-call.ts` và `src/routes/api/room-groq.ts` truyền thân gốc `body` cho `chargeWith`, nên cận được tính trên thân gốc. Thân gửi nhà là `parsed.body`, tức thân đã chuẩn hóa. `JSON.parse`/`stringify` khai triển `1e20` thành 21 chữ số, và tokenizer Qwen tách mỗi chữ số một token. Kết quả đo: thân 20.211 byte thành 88.235 byte, Qwen đếm 92.149 token, trong khi cận tính trên thân gốc là 40.934. Nếu tính trên thân chuẩn hóa thì cận là 176.982 và vẫn đúng. Hướng sửa: truyền `parsed.body` cho `chargeWith`, hoặc để `chargeWith` tự chuẩn hóa và dùng cùng một thân cho cận và gửi.
- **B (P1).** `modelKindOf` xếp `groq/compound`, `groq/compound-mini` và mọi model lạ vào loại `chat`. `room-groq.ts` (app không gọi, nhưng khách đăng nhập vẫn gọi được) không kiểm loại model. Compound chạy công cụ tại nhà nên token không bị cận byte chặn. Chưa biết bảng giá production có niêm yết compound hay không. Hướng sửa: allowlist model dịch theo catalog cho cửa trả theo lượt, từ chối model lạ và compound; cân nhắc tắt `room-groq`.
- **C.** Đã kiểm, không thấy lỗi:
  - trường lạ không vào prompt;
  - mọi phần vào prompt đều nằm trong thân, nên bị cận phủ nếu cận tính trên thân gửi đi;
  - multimodal đã bị chặn từ `4c6e6ad`;
  - trần đầu ra tối đa 8192;
  - phiếu nhỏ và usage vượt cận đã có test.

Test: `src/lib/billing/re5-001.test.ts` có 1 test đạt (cơ chế) và 3 test `todo` (A ×2 route, B), đều hỏng đúng như dự kiến. Khi sửa xong thì bỏ `todo`. `npm test` đạt 1.764, bỏ qua 7, todo 3, 0 lỗi.

`RE5-001/re5-001-numbers.mjs` cần gói `@lenml/tokenizer-qwen2_5@3.7.2` (cài trong thư mục tạm, không vào `package.json`).

Rollback: commit này chỉ thêm test và tài liệu.

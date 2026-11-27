# v5.49.6 · Bàn giao (Claude, MEDIUM → xin HIGH)

Nhánh `audit/v5.49.6-claude-re5` tách từ `6bbf292`. Commit này là baseline `39510cc` cộng một commit tài liệu của Claude (làm mới hồ sơ ChatGPT, trước đây chưa đẩy). Main không đổi, vẫn ở `39510cc`. Đầu vào bàn giao: `handoff-input/`.

## RE5-001 · ĐÃ TÁI HIỆN (chưa sửa)

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

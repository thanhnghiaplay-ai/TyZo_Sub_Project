# RE6-008 · Cận Token, dự toán theo model và route trả theo lượt (High)

Baseline `1a43509`. Mã nằm ở `9c94f49` và `fe80761`.

Kiểm thử dùng PostgreSQL 18.7 (Docker, loopback, dữ liệu giả) và nhà cung cấp giả: `fetch` được mock, không gọi Groq hay Alibaba thật. Không đổi giá, quyền lợi khách hay chính sách tài chính. Giới hạn ngân sách của RE6-001 vẫn tắt.

## Lỗi trước sửa

Xem [before.txt](before.txt). Tóm tắt:
- Trường lạ trong yêu cầu đi thẳng tới nhà cung cấp. Ví dụ `max_input_tokens` đẩy Qwen Plus sang bậc giá gấp 3.
- Usage không nhất quán vẫn được trừ khách.
- Giá bậc của Qwen Plus không được nhận ra.
- Test route chỉ dò mã nguồn bằng regex.

## Thay đổi (`src/lib/billing/run-gate.ts`)

1. **Danh sách trường được phép** (`fieldProblem`, `messageProblem`):
   - Trường chung: `model`, `messages`, `temperature`, `top_p`, `seed`, `stop`, `response_format`, giới hạn token, `n` (= 1), `stream` (false), `frequency_penalty`, `presence_penalty`, `user`, và công cụ dạng function.
   - Groq thêm `reasoning_effort`, `include_reasoning`, `reasoning_format`.
   - Alibaba thêm `enable_thinking` (chỉ false), `reasoning_effort` (chỉ none) và `enable_search` (chỉ false).
   - Tin nhắn chỉ được có `role` (system, developer, user, assistant, tool), `content`, `name`, `tool_calls`, `tool_call_id`.
   - Trường lạ trả 400 **trước khi giữ Token hay gọi nhà**.
   - Mọi thân yêu cầu app đang gửi (dịch có schema, dự phòng `json_object`, phân tích, đánh bóng) vẫn đi qua; test xác nhận.
2. **Kiểm usage nhất quán** (`readChatUsage`). Usage bị coi là không hợp lệ khi:
   - thiếu usage, hoặc token không phải số nguyên an toàn không âm;
   - `total_tokens` khác prompt + completion;
   - `reasoning_tokens` lớn hơn completion;
   - `cached_tokens` lớn hơn prompt.

   Usage không hợp lệ đi đúng đường RE6-001: trừ 0, nhả phần giữ, ghi nghĩa vụ `pending`, không ghi `provider_spend`.
3. **Giá bậc** (`FLAT_PRICE_INPUT_LIMIT`):
   - Qwen Plus quốc tế tính cả yêu cầu theo bậc 2 khi đầu vào trên 256K. Nhà mặc định chặn đầu vào ở 262.144 token, và cửa giờ không cho gửi `max_input_tokens` nên khách không nới được.
   - Usage trên 256.000 token vào được đánh dấu `can-doi-soat`. Khách vẫn chỉ bị trừ trong phạm vi mức giữ.
   - Alibaba trả `reasoning_tokens > 0` cũng bị đánh dấu đối soát, vì token suy luận có giá riêng và cửa đã tắt suy luận.
4. **Giữ nguyên các cơ chế đã có:**
   - Trần đầu ra 1–8.192, mặc định 4.096.
   - Cận vào = 2 × byte của thân **đã chuẩn hóa gửi đi** + 512, nhỏ hơn cửa sổ ngữ cảnh. Không giữ cả cửa sổ ngữ cảnh.
   - Chặn stream, n > 1, ảnh/âm thanh/tệp, công cụ chạy tại nhà.
   - Model phải nằm trong danh mục và có giá.
   - Usage hợp lệ mà vượt cận: chỉ trừ tới mức giữ, phần thiếu ghi `short_units`, trạng thái `can-doi-soat`, chi phí nhà ghi theo usage thật (theo RE6-001).

## Kiểm thử hành vi (`src/lib/billing/re6-008.test.ts`, 17/17 trên PG 18.7)

Test gọi thẳng handler POST của `/api/room-groq` và `/api/model-call`. Các phần mock: phiên đăng nhập, cổng chống lạm dụng, bảng giá và `fetch`. Sổ Token, phiếu, giữ trước, quyết toán, nghĩa vụ và cửa nhận việc chạy thật trên PG 18.7.

- **Danh sách trường:** thân app thật đi qua cho Groq (gpt-oss, qwen3.8) và Alibaba (qwen-plus). Có 10 trường và 4 dạng tin nhắn bị từ chối.
- **Unicode:** chuỗi escape `\uXXXX` được chuẩn hóa thành UTF-8 thật trước khi tính cận; emoji, CJK và surrogate lẻ giữ nguyên.
- **Bảng usage:** 13 ca không hợp lệ, 2 ca hợp lệ.
- **Groq:**
  - nhà nhận đúng thân đã chuẩn hóa (chỉ `max_completion_tokens`, không `n`) và bị trừ theo usage;
  - trường lạ, stream, n = 2, trần 9.000, ảnh, `groq/compound`, model chưa mở đều bị chặn trước khi giữ Token hay gọi nhà;
  - phiếu nhỏ chạy được với trần nhỏ và trả 402 với trần lớn. Mức giữ nhỏ hơn 20 lần so với mức giữ theo cả cửa sổ ngữ cảnh;
  - usage vượt cận: trừ đúng bằng mức giữ, có `short_units`, chi phí nhà ghi theo usage thật;
  - 4 kiểu usage hỏng: trừ 0, 4 nghĩa vụ `pending`, không ghi chi phí.
- **Đồng thời 30 yêu cầu** trên một phiếu đủ 3,5 lệnh:
  - Mặc định 2 suất/khách: đỉnh 2 lệnh cùng lúc.
  - Nới suất/khách: đỉnh 3 lệnh cùng lúc, đúng bằng giới hạn của mức giữ.
  - Lúc nhà đang chạy, phần giữ không lần nào vượt `held`. Sau cùng phần giữ về 0 và tổng trừ đúng bằng usage × số lệnh.
- **Alibaba:**
  - gửi `max_tokens` và `enable_thinking: false`;
  - `max_input_tokens`, bật suy luận, `thinking_budget`, tìm web, `reasoning_effort: high` bị chặn;
  - 300K token vào hoặc có token suy luận → đối soát; 200K → xong.
- **Model enterprise trong danh sách key nhưng chưa có giá:** trả 422, không giữ, không gọi nhà.

## Dự toán theo từng model (lô dịch 40 câu tiếng Trung, trần ra 4.096)

Thân khoảng 3,4 KB, cận vào khoảng 7.270 token. "Usage tham khảo" lấy tỷ lệ prompt / cận lớn nhất đo thật ở RE4-001 và giả định 1.200 token ra.

| Nhà · model | Giữ (Token) | Usage tham khảo (Token) | Trạng thái |
|---|---|---|---|
| Groq gpt-oss-20b | 162 | ≈ 44 | Đã đo thật (RE4-001) |
| Groq gpt-oss-120b | 321 | ≈ 83 | Đã đo thật |
| Groq qwen3.8-27b | 1.998 | ≈ 479 | Đã đo thật |
| Alibaba qwen-plus | 706 | ≈ 173 | Đã đo thật |
| Alibaba qwen-max | 3.402 | ≈ 882 | Đã đo thật |
| Alibaba qwen-turbo | 108 | — | **BLOCKED** |
| Groq llama-3.3-70b, llama-3.1-8b, muse-spark-open, minimax-m2.7 | — | — | **BLOCKED** |

Ghi chú:
- **qwen-turbo:** chưa có trong key phòng, chưa đo thật.
- **Bốn model Groq enterprise:** chưa có giá nên cửa trả 422, chưa đo thật.
- **Chênh lệch giữ và dùng:** mức giữ gấp khoảng 4 lần usage tham khảo, phần lớn do trần đầu ra. Khách chỉ bị trừ theo usage thật, phần thừa được nhả.

**Cận là ước tính, không phải bảo đảm tuyệt đối.** Cận vào dựa trên giả định tokenizer kiểu byte-level BPE, mỗi token ít nhất 1 byte. Trần ra dựa vào nhà cung cấp tôn trọng `max_completion_tokens`/`max_tokens`. Bằng chứng thật hiện chỉ có cho 5 model, 15 lệnh (RE4-001).

## Còn lại (BLOCKED, cần Chủ duyệt chi phí)

- Đo usage thật cho 5 model chưa đo, và xác nhận thứ tự danh mục với key phòng.
- **Token suy luận trên Groq:** chưa có tài liệu chính thức nói chúng có nằm trong `completion_tokens` và trong `max_completion_tokens` hay không. Cần một phiên thật với gpt-oss `reasoning_effort: high` để kiểm. Cổng đã chặn usage tự mâu thuẫn, nhưng chưa phát hiện được trường hợp nhà bỏ hẳn token suy luận ra khỏi usage.
- **Token cache:** đang tính đủ giá như token thường. Khách không bao giờ bị trừ quá mức giữ, nhưng sổ chi phí nhà có thể ghi cao hơn hóa đơn thật. Chi tiết giá cache cần Chủ quyết nếu muốn đối chiếu sát hơn.
- **Bảng giá:** giá bậc của qwen-turbo và qwen-max quốc tế chưa xác minh. Hiện chỉ qwen-plus được khai bậc.

## Nguồn

- [Alibaba Model Studio · giá model](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
- [Alibaba Model Studio · qwen-plus](https://www.alibabacloud.com/help/en/model-studio/qwen-plus)
- [Groq · reasoning](https://console.groq.com/docs/reasoning)
- [Groq · API reference](https://console.groq.com/docs/api-reference)

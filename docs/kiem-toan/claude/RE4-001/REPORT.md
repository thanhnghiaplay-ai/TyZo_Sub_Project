# RE4-001 · PARTIAL (mã cục bộ PASS; còn so usage thật với nhà)

Commit mã `c5e9db0`, gốc `b829fd9`. Không đổi giá, tỷ lệ quy Token hay migration.

## Vấn đề còn lại từ Codex

Codex giữ phần vào theo toàn bộ cửa sổ ngữ cảnh. Với qwen-plus (1.000.000 token × 0,4 USD/triệu) một lệnh dịch vài KB phải giữ khoảng 0,40 USD phần vào, nên phiếu nhỏ bị chặn oan. qwen-turbo chưa có cửa sổ đã xác minh nên bị từ chối hẳn (422).

## Sửa

`promptTokenBound(bodyBytes, context)` trong `src/lib/billing/run-gate.ts` trả `2 × byte thân JSON đã chuẩn hóa + 512`, rồi lấy số nhỏ hơn giữa giá trị đó và cửa sổ đã biết.

Vì sao đây là cận trên:
1. Tokenizer byte-level BPE (o200k/Harmony của gpt-oss, Llama 3, Qwen) bắt đầu từ từng byte rồi chỉ gộp lại, nên một token luôn có ít nhất 1 byte UTF-8. Do đó số token của chữ ≤ số byte của chữ ≤ số byte thân JSON (escape JSON chỉ làm dài thêm).
2. Lần cộng byte thứ hai phủ khung mỗi tin nhắn (ChatML/Harmony khoảng 5 token, trong khi JSON của chính tin nhắn ≥ 25 byte) và schema công cụ mà nhà viết lại (Qwen dùng `json.dumps` có thêm dấu cách).
3. Hằng 512 phủ phần system mặc định và lời dẫn công cụ do nhà tự chèn.

Thay đổi đi kèm:
- Usage `prompt_tokens` vượt cận bị đánh dấu `can-doi-soat`, như trước đây với cửa sổ.
- qwen-turbo được gửi kèm `enable_thinking=false`, giống qwen-plus, để `max_tokens` vẫn là trần đầu ra.
- Quyết toán vẫn theo usage thật. Khi thiếu usage vẫn dùng công thức fallback cũ và mở đối soát (không đổi quy tắc trừ).

## Kiểm chứng

- Tokenizer thật, offline: `tokenizer-bound.mjs` và `.log` ở thư mục này. Gói npm `@lenml/tokenizer-qwen2_5@3.7.2`, `@lenml/tokenizer-llama3@3.7.2`, `js-tiktoken@1.0.21` (o200k_base với khung Harmony mô phỏng). Có 36 ca: tiếng Việt, CJK, CJK hiếm 4 byte, emoji ZWJ, dấu kết hợp, ASCII ngẫu nhiên, dấu câu, Hangul/Thái, chuỗi token đặc biệt, JSON trong chữ, khoảng trắng; mỗi ca chạy không công cụ, 1 công cụ và 64 công cụ. **Cận mới bị vượt 0/36 ca, tỷ lệ token/cận lớn nhất 0,906 (CJK hiếm). Công thức cũ `byte/3` bị vượt 30/36 ca.**
- Test PostgreSQL 16.15 loopback, CSDL riêng: `gate-reserve`, `run-gate`, `upstream-outcome`, `work-admission-pg` đạt 49/49; `re2-regression`, `run-bill`, `token-flow` đạt 37/37. Có 4 test RE4-001 mới:
  - phiếu 100 Token chạy được với model cửa sổ 1 triệu (theo cách cũ phải giữ > 9.000 Token);
  - model không có cửa sổ vẫn giữ theo byte và gửi được;
  - usage vượt cận chuyển sang `can-doi-soat`;
  - bảng giá trị của hàm cận.
  Test cũ "thiếu phần giữ thì không gọi nhà" đổi sang thân ~6 KB, vẫn 402 và 0 lần gửi.

## Giới hạn

- Chưa so `usage.prompt_tokens` thật của Groq/Alibaba: môi trường không có key, và không được phát sinh chi phí. Khi có ngân sách thử đã duyệt, chạy 1 lệnh cho mỗi model và so với `promptTokenBound`.
- Mẫu công cụ của Llama 3 trong gói npm không vẽ tools, nên ca Llama có công cụ chỉ đo phần tin nhắn. Qwen và Harmony có vẽ công cụ.
- Phần system Groq tự chèn cho gpt-oss là giả định nằm trong 512; chưa đo được trên nhà thật.
- Kimi K2 (tokenizer tiktoken) cùng họ byte-level nhưng chưa có gói để thử offline.

## Rollback

Revert `c5e9db0` sau khi các lệnh đang chạy đã xong và sổ đã đối soát. Không có migration. Phần giữ sẽ quay lại theo cửa sổ (bảo thủ hơn, chặn phiếu nhỏ, từ chối qwen-turbo).

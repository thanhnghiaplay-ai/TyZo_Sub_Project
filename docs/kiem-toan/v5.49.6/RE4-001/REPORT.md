# RE4-001 · So usage thật với cận giữ Token (27/11/2026)

Key Groq (gói miễn phí) và Alibaba Singapore do Chủ cấp qua biểu mẫu bảo mật; proxy tự chèn key nên script không thấy giá trị. Thân yêu cầu được chuẩn hóa bằng đúng `readRequest` của app; cận tính bằng `promptTokenBound` trên thân gửi đi (bản sau RE5-001). Trần đầu ra 64 token. Script: `usage-real.ts`, kết quả: `usage-real.json` (đã che mã tổ chức).

| Nhà / model | Lệnh 200 | prompt thật / cận, lớn nhất | completion ≤ trần |
|---|---|---|---|
| Groq openai/gpt-oss-20b | 3 | 0,161 | có |
| Groq openai/gpt-oss-120b | 3 | 0,161 | có |
| Groq qwen/qwen3.8-27b | 2 | 0,088 | có |
| Alibaba qwen-plus | 4 | 0,160 (kể cả thân 33 KB khai triển số) | có |
| Alibaba qwen-max | 3 | 0,180 | có |

**Kết quả: 15/15 lệnh thành công có usage ≤ cận; 0 vượt.** Cận dư khoảng 5–11 lần so với usage thật. Vì vậy phần giữ trước đủ an toàn mà không chặn oan phiếu nhỏ.

Các lệnh không thành công đều do nhà từ chối trước khi chạy, nên không tốn chi phí:
- thân khoảng 33 KB vượt giới hạn gói miễn phí của Groq (413);
- qwen-max chỉ nhận tối đa 30.720 token đầu vào (400);
- qwen3.8 từ chối gọi công cụ (400).

Theo `run-gate`, các lệnh lỗi này được nhả phần giữ và không trừ khách.

**Model trong danh mục mà key này không có:**
- Groq: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `meta-models/muse-spark-open`, `minimaxai/minimax-m2.7`;
- Alibaba: `qwen-turbo`.

Với key phòng này, các model đó không gọi được. Admin nên đồng bộ danh mục với danh sách model của key, hoặc xác nhận lại cách đặt tên.

Kết luận: RE4-001 chuyển sang **PASS_REAL** cho 5 model có trong key; chưa xác minh 5 model trong danh mục mà key không có.

# Tiền: giữ, trừ, trả thừa (dùng chung cho Groq, Alibaba, TyZo)

Mọi tiền của cửa **Trả theo lượt** đi qua thư mục này. Thuê phòng dùng key của khách nên không qua đây.

| Bước | Tệp | Việc |
|---|---|---|
| Tính giá | `run-bill.ts` | Giá gốc từng model (giờ nhận dạng, triệu chữ dịch) từ bảng giá. |
| Quy ra Token dịch | `token-math.ts` | Giá gốc → Token theo giá 1 giây Whisper Turbo (`giayForBaseCost`, `tokensForBase`, `holdGiay`). Lời nằm ở giá gói Token, không cộng ở đây. |
| Mở / đóng phiếu | `run-turn.ts` (cửa máy chủ), `run-ticket.ts` (SQL) | Mở phiếu giữ Token theo ước tính; đóng phiếu trả phần giữ thừa về ví; phiếu treo quá 6 giờ tự nhả. |
| Trừ Token | `token-flow.ts` | `chargeTokenWith`: trừ trên phiếu, không vượt phần đang giữ. |
| Nhận dạng Groq, Alibaba | `room-asr.server.ts` | Kiểm phiếu, đọc key phòng, trừ theo số giây thật của nhà (`chargeRoomAsr`), ghi tiền phải trả nhà. |
| Nhận dạng TyZo | `tyzo-modal-charge.ts` | Mỗi đoạn chỉ trừ một lần (mã băm âm thanh), giữ đủ trước khi gọi GPU, lỗi thì trả lại, thiếu thì ghi `modal_short`. |
| Dịch qua máy chủ | `run-gate.ts` | Đọc yêu cầu, gọi nhà, trừ theo token thật trong `usage`; nhà lỗi thì không trừ. |

Thêm nhà mới: KHÔNG viết thêm cách trừ tiền. Khai giá ở `price-rows.ts` + `price-books.server.ts`, gọi `chargeRoomAsr` (nhận dạng) hoặc đi qua `run-gate.ts` (dịch).

# DECISIONS
- 2026-11-28: không sửa hàng đợi 429 vì mã main (5.49.8+) đã đúng và có test; chỉ ghi nhận ALREADY_FIXED để tránh sửa trùng.
- 2026-11-28 (TZ-002): nhả suất unknown chỉ khi có bằng chứng 'chưa gửi' (ref null + lane modal + quá lease) hoặc bằng chứng quyết toán; không dùng TTL chung. Fencing bằng `tagWorkBeforeSend` để bằng chứng 'chưa gửi' đáng tin. Không thêm migration (tránh rủi ro triển khai); tyzo_admit giữ nguyên.

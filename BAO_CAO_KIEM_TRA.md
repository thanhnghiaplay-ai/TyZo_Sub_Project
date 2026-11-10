# Báo cáo kiểm tra TyZo Sub — gói 0419, sửa thành v3.10.9

Ngày 11/11/2026 04:58 (giờ VN). Người sửa: Claude, theo lệnh «Claude sửa». Nhánh `work`. Chưa đẩy GitHub.

## Cách kiểm tra
- Đọc code theo nhóm: luồng dịch, giao diện phòng dịch, nạp tiền, đăng nhập và phiên, di chuyển cơ sở dữ liệu, cấu hình triển khai.
- Chạy test: `scripts/**/*.test.mjs` được 191 pass, 0 fail, 7 bỏ qua. Trong `src/`, 28 file test pass hết (kể cả `vad.test.ts` khi có `public/vad`).
- Chưa chạy được: 9 file test cần `@electric-sql/pglite`, `jose`, `nodemailer`, `@tanstack/react-start` (gói không có `node_modules`, máy kiểm tra không có mạng). `tsc` đầy đủ cũng chưa chạy được, chỉ kiểm cú pháp. Chưa thử trên điện thoại thật.

## Bảng lỗi

| # | Nhóm | Mức | Chỗ | Lỗi | Trạng thái |
|---|------|-----|-----|-----|-----------|
| 1 | Hệ thống | Nặng | `use-pipeline.ts` | Nhận dạng lỗi thì phần dịch chờ vô hạn, nút kẹt «Hủy» | Đã sửa v3.10.8 |
| 2 | Hệ thống | Nặng | `update-banner.tsx` | Quay lại tab sau 5 phút thì trang tự tải lại, mất việc đang làm | Đã sửa v3.10.8 |
| 3 | Hệ thống | Nặng | `groq.ts`, `mp4.ts` | Gọi Groq và tải đoạn video không có giới hạn thời gian | Đã sửa v3.10.8 |
| 4 | Giao diện, tốc độ | Nặng | `studio.tsx` | Danh sách bản dịch vẽ lại toàn bộ câu mỗi 250ms, phim dài thì giật | Đã sửa v3.10.9 |
| 5 | Logic | Trung bình | `studio.tsx` | Ô «Sửa câu» trỏ theo số thứ tự, có câu mới chen vào thì nhảy sang câu khác | Đã sửa v3.10.9 |
| 6 | Logic | Trung bình | `use-pipeline.ts` | Máy đang dịch câu thì người dùng sửa tay, bản dịch máy ghi đè câu đã sửa | Đã sửa v3.10.9 |
| 7 | Hệ thống | Trung bình | `idle-sign-out.tsx` | 30 phút không chạm màn hình là đăng xuất, kể cả đang xem phim hoặc đang dịch | Đã sửa v3.10.9 |
| 8 | Hệ thống | Thấp | `pay-match.ts`, `pay-store.ts` | Mã đơn nạp chỉ lấy 6 ký tự hex đầu (khoảng 16 triệu mã), trùng thì tạo đơn lỗi | Đã sửa v3.10.9, có test |
| 9 | Tiền | Trung bình | `pay-flow.ts`, `pay-confirm.ts` | Đơn hết hạn sau 15 phút. Khách chuyển khoản trễ thì không được cộng, Chủ xác nhận tay cũng không được vì chỉ nhận đơn đang chờ | Cần Chủ quyết |
| 10 | Logic | Thấp | `mp4.ts` | Giải mã âm thanh quá 25 giây thì coi đoạn là lỗi, có thể thiếu câu | Chưa sửa |
| 11 | Tốc độ | Thấp | `use-pipeline.ts` | Kết quả nhận dạng chỉ hiện theo thứ tự đoạn, một đoạn chậm thì cả danh sách đứng rồi nhảy | Chưa sửa |
| 12 | Hệ thống | Thấp | `groq.ts` | Giới hạn 120 giây chỉ tính tới khi có đầu phản hồi, đọc nội dung trả về chưa có giới hạn | Chưa sửa |
| 13 | Giao diện | Thấp | `pay-store.ts` | Một số câu lỗi nạp tiền thiếu dấu tiếng Việt («Cong khong dung», «Khong thay don nap») | Chưa sửa |
| 14 | Hệ thống | Thấp | `migrations/` | `0001_auth.sql` có hai bản giống hệt. Vô hại vì máy chạy không đọc thư mục con | Chưa sửa, ghi nhận |
| 15 | Giao diện | Nặng | `account-panel.tsx` | Trang Tài khoản trên điện thoại mất đầu trang, trống giữa, cụt đáy (cột kiểu báo bị ép chiều cao, từ v3.10.6) | Đã sửa v3.10.10 theo ảnh chụp |

## Việc cần Chủ quyết (mục 9)
Cho phép cộng tiền khi chuyển khoản trễ (ví dụ trong 24 giờ sau khi đơn hết hạn) là đổi quyền lợi tiền của khách. Theo luật 12b phải sửa điều khoản và nâng `TERMS_VERSION`, nên chưa tự làm.

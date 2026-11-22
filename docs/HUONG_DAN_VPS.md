# Hướng dẫn VPS cho cầu nối Dịch trực tiếp

Dành cho người không biết lập trình. Mọi việc trên VPS đều qua **một lệnh: `tyzo`**.

Cầu nối là phần nhỏ chạy trên VPS, nối Dịch trực tiếp (web và ứng dụng Android) với Alibaba.
Web chính vẫn ở Vercel. VPS tắt thì chỉ Dịch trực tiếp ngừng, dữ liệu không mất.

---

## A. Dựng trên VPS mới (hoặc làm lại từ đầu)

**Cần có:** VPS Ubuntu (RAM từ 1 GB), tên miền đã trỏ về Cloudflare, đăng nhập được Neon và Vercel.

1. Vào dòng lệnh của VPS:
   - Dễ nhất: trang quản lý VPS → nút **Console** / **Web terminal**.
   - Hoặc trên máy tính: mở PowerShell, gõ `ssh root@IP_CUA_VPS`, nhập mật khẩu root (gõ không hiện chữ là bình thường).
2. Dán **đúng một dòng** này rồi bấm Enter:
   ```
   bash <(curl -fsSL https://raw.githubusercontent.com/thanhnghiaplay-ai/TyZo_Sub_Project/main/deploy/vps/tyzo.sh)
   ```
3. Máy tự mở **Thiết lập từng bước** (10 bước). Đọc chữ trên màn hình và làm theo.
   Chỗ nào cần làm ở Cloudflare, Neon, Vercel, máy ghi rõ bấm vào đâu, gõ gì.
   Đang làm dở mà thoát cũng không sao: gõ `tyzo` → chọn **9** để làm tiếp.

Xong là web dùng được ngay.

---

## B. Dùng hằng ngày

Gõ `tyzo` rồi bấm Enter, chọn số:

| Số | Việc | Khi nào dùng |
|---|---|---|
| 1 | Kiểm tra mọi thứ | Khách báo không dịch được, hoặc muốn xem có ổn không |
| 2 | Cập nhật bản mới | Claude nhắn «cập nhật cầu nối» (bản lỗi thì tự quay về bản cũ) |
| 3 | Xem nhật ký | Claude cần xem lỗi: chụp màn hình gửi |
| 4 | Sửa cấu hình | Hiếm khi cần |
| 5 | Đổi thời gian chờ im lặng | Qwen 3.5 ra chữ chậm (gợi ý 300) |
| 6 | Khởi động lại | Mục 1 báo ✘ |
| 7 | Dọn dung lượng | Ổ đĩa còn ít |
| 8 | Bật/tắt tự cập nhật mỗi đêm | Bật một lần là xong, khỏi phải nhớ cập nhật |
| 9 | Thiết lập từng bước | VPS mới, hoặc muốn làm lại |
| 10 | Tạo lại chuỗi bí mật | Lỡ để lộ chuỗi (phải dán lại lên Vercel) |
| 0 | Thoát | |

Ghi chú thiết lập (tên miền, ngày làm) lưu ở `/opt/tyzo-ghi-chu.txt` trên VPS.

---

## C. Khi VPS sắp hết hạn hoặc đổi VPS

1. Trước hết: **gia hạn** ở trang nhà cung cấp (bật tự gia hạn nếu có).
2. Phải đổi sang VPS mới: làm lại **mục A** trên VPS mới.
   - Ở bước 3, Cloudflare chỉ cần **sửa IP** của bản ghi cũ.
   - Ở bước 5, chọn **c** và dán chuỗi `LIVE_BRIDGE_SECRET` cũ trong ghi chú → **không phải sửa gì trên Vercel**.
3. Trong lúc chưa có VPS: Admin → đặt nhóm **Dịch trực tiếp** sang **Bảo trì**, để khách thấy thông báo rõ ràng.

---

## D. Giữ ở chỗ an toàn (ghi chú riêng, không gửi ai)

- Chuỗi `LIVE_BRIDGE_SECRET` (máy in ra một lần lúc thiết lập).
- Cách lấy `DATABASE_URL`: Neon → project → Connect → Show password → Copy snippet. **Không bấm Reset password.**
- Mật khẩu root của VPS.

## E. Đừng làm

- Đừng dán mật khẩu, token hay chuỗi bí mật vào chỗ gõ lệnh, trừ khi máy hỏi và chữ không hiện ra.
- Đừng chụp màn hình lúc chuỗi bí mật đang hiện.
- Đừng bật đám mây **cam** trên Cloudflare cho tên miền cầu nối (để **xám**).

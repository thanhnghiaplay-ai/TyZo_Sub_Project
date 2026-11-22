# Hướng dẫn VPS (người không biết lập trình đọc được)

Mọi việc trên VPS đều qua **một lệnh: `tyzo`**. VPS mới chỉ cần dán **một dòng** (mục A).

Có bốn cách dùng VPS. Chọn khi chạy lần đầu, đổi được về sau:

| Cách | Web ở đâu | Dùng khi |
|---|---|---|
| 1. Chỉ cầu nối | Vercel | Như hiện nay: VPS chỉ lo Dịch trực tiếp |
| 2. Chạy thử web đầy đủ | VPS thử | Muốn thử chuyển web sang VPS mà không đụng web thật |
| 3. Web đầy đủ chính thức | VPS | Không dùng Vercel nữa |
| 4. Đưa web lên tài khoản Vercel khác | Vercel (tài khoản mới) | Đổi tài khoản Vercel, hoặc quay lại Vercel từ VPS |

---

## A. VPS mới: dán đúng một dòng

1. Vào dòng lệnh của VPS (trang quản lý VPS → **Console**; hoặc PowerShell: `ssh root@IP_CUA_VPS`).
2. Dán dòng này rồi bấm Enter:
   ```
   bash <(curl -fsSL https://raw.githubusercontent.com/thanhnghiaplay-ai/TyZo_Sub_Project/main/deploy/vps/tyzo.sh)
   ```
3. Máy hỏi «Bạn muốn VPS này làm gì?» → chọn 1, 2, 3 hoặc 4 → đọc chữ trên màn hình và làm theo.
   Chỗ nào cần bấm ở Cloudflare, Neon, Vercel, máy ghi rõ từng nút. Đang làm dở mà thoát: gõ `tyzo` để làm tiếp.

---

## B. Chạy thử web đầy đủ trước (nên làm trước khi chuyển thật)

1. Thuê thêm một VPS (Ubuntu, RAM từ 2 GB, ổ từ 25 GB).
2. Làm mục A, chọn **2**.
3. Tên miền: dùng tên miền phụ riêng cho bản thử, ví dụ `thu.tyzo.site`.
4. Dữ liệu: chọn chép từ Neon (Neon chỉ bị đọc, web thật không bị đụng).
5. Xong, mở `https://thu.tyzo.site`: đăng nhập, xem Tài khoản, Dịch trực tiếp, Admin, ứng dụng Android (gõ địa chỉ bản thử).
6. Thử xong: hủy VPS thử, xóa bản ghi `thu` trên Cloudflare.

Lưu ý: bản thử có dữ liệu thật (tài khoản, key Alibaba của phòng). Dịch thử vẫn tốn tiền Alibaba như thật.

---

## C. Chuyển web thật sang VPS

1. Đã chạy thử (mục B) và mọi thứ ổn.
2. Trên VPS chính thức gõ `tyzo` → **11**. Máy hỏi lần lượt:
   - **https**: Caddy (khuyên dùng). Không chạy được thì chạy lại và chọn Cloudflare Tunnel.
   - **Tên miền**: tên miền chính của web. Đổi bản ghi trên Cloudflare là khách bắt đầu vào VPS.
   - **Dữ liệu**: giữ Neon (khuyên dùng, không phải chuyển gì), hoặc chép về VPS (tự sao lưu mỗi đêm).
     Chép về VPS thì trước đó bật **Bảo trì toàn web** ở Admin của web cũ để khỏi mất đơn phát sinh lúc chép.
   - **Chuỗi BETTER_AUTH_SECRET**: có chuỗi cũ thì dán (khách khỏi đăng nhập lại), không có thì máy tạo mới (khách đăng nhập lại một lần, mật khẩu không đổi).
   - **Email Admin**, cách gửi thư, R2, Workspace Alibaba, đường tải tệp cài Android (bỏ qua được nếu đã lưu ở Admin).
3. Sau khi xong:
   - **Sepay/Casso**: đổi địa chỉ nhận báo chuyển khoản sang `https://<tên miền>/api/pay/sepay` (hoặc `/casso`).
   - Cầu nối Dịch trực tiếp nằm sẵn trong VPS này: VPS cầu nối riêng (realtimehub) không cần nữa.
   - Để Vercel cũ vài ngày rồi xóa.

---

## D. Đưa web lên tài khoản Vercel khác

1. Trên một VPS bất kỳ có lệnh `tyzo` (hoặc VPS mới, mục A chọn 4): gõ `tyzo` → **14**.
2. Cần: mã truy cập của tài khoản Vercel đích (vercel.com → Account Settings → Tokens → Create), chuỗi kết nối Neon.
3. Máy tự tạo project, nạp biến, đưa web lên. Sau đó làm các việc máy in ra (tên miền trên Cloudflare, nối Git để tự cập nhật, Sepay/Casso).

---

## E. Dùng hằng ngày: gõ `tyzo`

| Số | Việc |
|---|---|
| 1 | Kiểm tra mọi thứ (dòng ✘ là chỗ hỏng, kèm cách sửa) |
| 2 | Cập nhật bản mới (bản mới lỗi thì tự quay về bản cũ) |
| 3 | Xem nhật ký (chụp gửi Claude khi có lỗi) |
| 4 | Sửa cấu hình |
| 5 | Đổi thời gian chờ im lặng của Qwen 3.5 |
| 6 | Khởi động lại |
| 7 | Dọn dung lượng |
| 8 | Bật/tắt tự cập nhật mỗi đêm |
| 9 | Thiết lập chỉ cầu nối |
| 10 | Tạo lại chuỗi bí mật cầu nối (chế độ chỉ cầu nối) |
| 11 | Thiết lập web đầy đủ |
| 12 | Chạy thử web đầy đủ |
| 13 | Dữ liệu: sao lưu, khôi phục, chép Neon ⇄ VPS |
| 14 | Đưa web lên tài khoản Vercel |
| 15 | Khóa ký ứng dụng Android: tạo một lần để ứng dụng tự cập nhật và web có nút tải |

---

## E2. Ứng dụng Android tự cập nhật (làm một lần)

1. Trên VPS gõ `tyzo` → **15** → tạo khóa ký → chọn **1** (tự động), dán mã GitHub theo hướng dẫn trên màn hình.
2. Chờ khoảng 3 phút (GitHub → Actions → «Android thử» có dấu tích xanh).
3. Trang Tài khoản trên web hiện nút «Tải tệp cài». Ứng dụng đang cài hiện «Có bản mới» → **Cập nhật ngay** → bấm **Cài đặt**.
   Lần đầu đổi sang khóa này: gỡ ứng dụng cũ, cài bản mới, liên kết lại (chỉ một lần).
4. Từ đó mỗi bản mới: khách mở ứng dụng là thấy «Có bản mới».
Giữ khóa: thư mục `/opt/tyzo-android-key` trên VPS. Đổi VPS thì chép thư mục này sang.

## F. Khi VPS sắp hết hạn hoặc đổi VPS

- Gia hạn trước (bật tự gia hạn nếu có).
- Đổi VPS: làm lại mục A trên VPS mới, chọn đúng cách đang dùng.
  - Chỉ cầu nối: ở bước chuỗi bí mật, dán chuỗi `LIVE_BRIDGE_SECRET` cũ → không phải sửa Vercel.
  - Web đầy đủ, dữ liệu trên VPS: trên VPS cũ `tyzo` → 13 → 4 chép lên một Neon trống, rồi trên VPS mới chọn chép từ Neon đó. Hoặc giữ Neon ngay từ đầu để khỏi lo.
- Trong lúc chưa có VPS: Admin → đặt **Bảo trì** cho nhóm đang ngừng.

## G. Giữ ở chỗ an toàn (ghi chú riêng, không gửi ai)

- `LIVE_BRIDGE_SECRET`, `BETTER_AUTH_SECRET` (máy in ra một lần khi tạo).
- Cách lấy chuỗi Neon: Neon → Connect → Show password → Copy snippet. **Không bấm Reset password.**
- Mật khẩu root của VPS. Mã truy cập Vercel thì xóa trên Vercel sau khi dùng.

## H. Đừng làm

- Đừng dán mật khẩu, token, chuỗi bí mật vào chỗ gõ lệnh, trừ khi máy hỏi và chữ không hiện ra.
- Đừng chụp màn hình lúc chuỗi bí mật đang hiện.
- Dùng Caddy thì để đám mây Cloudflare **xám**. Dùng Tunnel thì Cloudflare tự đặt, không sửa.

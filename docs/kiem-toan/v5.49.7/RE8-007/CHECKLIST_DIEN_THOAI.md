# Checklist tự kiểm trên điện thoại · APK 0.14 (RE8-007 / R3-006 và lỗi Android tồn đọng)

**Cập nhật 28/11/2026:** Chủ đã đẩy `main`, nên **0.14 đã phát hành chính thức**. Dùng bản phát hành: https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/releases/download/android-v0.14/tyzo-sub.apk, SHA256 `1502996fcfae9a81f0c75ecb35a960eefe5004080611bff4f03637fc7d8e0bdc`. Các bước tải artifact ở mục 1 chỉ còn dùng cho bản thử trên nhánh.

## 1. Tải APK thử

1. Đăng nhập GitHub (tài khoản có quyền vào kho), mở lượt chạy:
   `https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/actions/runs/46115051993`
2. Kéo xuống **Artifacts** → bấm **tyzo-sub-apk** để tải tệp `.zip`. Link thẳng: `.../actions/runs/46115051993/artifacts/15250788825`. Artifact giữ 30 ngày.
3. SHA256 đúng của `tyzo-sub.apk` trong lượt này: `cf11063a90d6391f2863da7c2484c734213cc414cca212ea2ac9ffb2367054da`.
4. Giải nén. Bên trong có:
   - `tyzo-sub.apk`
   - `tyzo-sub.json`: phải ghi `{"code": 14, "name": "0.14"}`
   - `tyzo-sub.sha256`: SHA256 của APK
   - `tyzo-sub-chu-ky.txt`: chứng chỉ ký và kết quả so khóa với bản phát hành 0.13
5. Mở `tyzo-sub-chu-ky.txt`. Phải có `Verified using v2 scheme (APK Signature Scheme v2): true` và dòng `CÙNG KHÓA KÝ với android-v0.13: cài đè được`. Nếu ghi `KHÁC KHÓA KÝ`, **dừng lại**: cài sẽ phải gỡ bản cũ và mất dữ liệu phiên trên máy.
6. Kiểm SHA256 trên máy tính trước khi chép sang điện thoại:
   - Windows: `certutil -hashfile tyzo-sub.apk SHA256`
   - macOS / Linux: `shasum -a 256 tyzo-sub.apk`

   Kết quả phải trùng `tyzo-sub.sha256`.

## 2. Cài đè lên bản đang dùng

1. Trên điện thoại đang có **0.13** (Cài đặt → Ứng dụng → TyZo Sub → Phiên bản), chép `tyzo-sub.apk` vào máy. Mở bằng **Tệp** (Files) → **Cài đặt**.
2. Nếu hỏi «Cho phép từ nguồn này», bật cho ứng dụng Tệp.
3. **Đạt khi:** cài đè thành công, không phải gỡ; mở lại vẫn còn liên kết tài khoản và lịch sử; Phiên bản ghi **0.14**.

## 3. Kiểm R3-006 (trình cập nhật)

Ứng dụng chỉ hiện «Có bản mới» khi web báo bản mới hơn bản đang cài. Hai cách thử:
- **(a)** Cài **0.13** trên một máy thử. Web staging hoặc `ANDROID_APK_URL` thử trỏ tới tệp 0.14 (Chủ đặt trên môi trường thử, **không** đặt production).
- **(b)** Đợi bản phát hành chính thức sau này.

| # | Thao tác | Đạt khi |
|---|---|---|
| U1 | Bấm «Cập nhật ngay», mạng tốt | Tải xong → hiện màn cài của Android; không kẹt «Đang tải…» |
| U2 | Bấm «Cập nhật ngay» 3 lần liên tiếp | Chỉ một thông báo tải trên thanh trạng thái |
| U3 | Đang tải thì tắt Wi-Fi và dữ liệu, chờ báo lỗi, bật mạng, bấm lại | Báo «chưa xong… thử lại», bấm lại thì tải lượt mới |
| U4 | Đang tải thì kéo thanh thông báo → hủy tải, quay lại ứng dụng | Báo «Lượt tải trước đã bị hủy…», bấm lại thì tải lại được |
| U5 | Đang tải thì vuốt tắt ứng dụng khỏi đa nhiệm, chờ tải xong, mở lại | Mở lại thì hiện màn cài (không cần bấm lại) |
| U6 | Đang tải thì khởi động lại điện thoại, mở lại ứng dụng | Không kẹt: hoặc tiếp tục chờ, hoặc báo tải lại |
| U7 | Lặp U1 mười lần (mạng nhanh, tệp nhỏ) | Không lần nào kẹt «Đang tải…» |

## 4. Lỗi Android tồn đọng (đã đạt JVM hoặc PG; còn cần máy thật)

| # | Lỗi | Thao tác | Đạt khi |
|---|---|---|---|
| A1 | AZ-002 lịch sử lẫn tài khoản | Liên kết tài khoản A, tạo phiên; gỡ; liên kết tài khoản B | Không thấy phiên của A |
| A2 | AZ-003 race lưu/đồng bộ | Đang lưu phiên thì tắt mạng, bật lại | Không mất bản mới, không ghi đè bằng bản cũ |
| A3 | AZ-004 báo đồng bộ dù máy chủ không lưu | Tắt mạng rồi bấm đồng bộ | Không báo «đã đồng bộ» |
| A4 | AZ-008 gỡ thiết bị khi offline | Tắt mạng rồi bấm gỡ liên kết | Báo lỗi, vẫn còn liên kết |
| A5 | R4-004/R4-008 thu hồi khóa | Trên web, đổi mật khẩu tạm hoặc gỡ thiết bị | Ứng dụng bị yêu cầu liên kết lại |
| A6 | Phụ đề nổi và quyền | Dùng Dịch trực tiếp 1 phút với video có tiếng (tốn khoảng 1 phút Token thử); thu hồi quyền ghi màn hình giữa chừng | Báo lỗi rõ, phiên đã lưu không mất |

Ghi kết quả từng ô (đạt / không đạt, mẫu máy, phiên bản Android) rồi gửi lại cho phiên sau.

**Chi phí:** U1–U7 và A1–A5 không tốn tiền. Riêng A6 tốn khoảng 0,01 USD Alibaba.

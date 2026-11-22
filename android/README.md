# Android — TyZo Sub

Ứng dụng thu tiếng của video đang phát ở ứng dụng khác (Android 10+, `AudioPlaybackCapture`),
gửi qua cầu nối Dịch trực tiếp và hiện phụ đề nổi trên màn hình. Dùng chung tài khoản và Token dịch với web.

- Mã: `app/src/main/java/vn/tyzo/sub/` (Kotlin, giao diện dựng bằng mã, chỉ dùng thêm OkHttp).
- Giao diện theo web: biểu tượng vẽ đúng `public/favicon.svg`, màu bảng «Vàng» của `src/lib/theme/theme.ts` (Ui.kt), font Be Vietnam Pro (`res/font`, giấy phép `FONT_OFL.txt`). Tùy chỉnh phụ đề, từ cần giữ đúng và xuất SRT/VTT/TXT cùng luật với `src/lib/live/`.
- Đổi bản: sửa `versionCode`/`versionName` trong `app/build.gradle.kts` VÀ `ANDROID_APP` trong `src/lib/app-link.ts` (test kiểm hai chỗ khớp).
- Liên kết: web Tài khoản → Ứng dụng Android → «Lấy mã liên kết» (8 ký tự, 10 phút, dùng một lần).
  Ứng dụng đổi mã lấy khóa máy ở `POST /api/app-link`, rồi gọi `GET /api/app-me` và `POST /api/app-ticket`
  bằng `Authorization: Bearer <khóa máy>`. Máy chủ chỉ lưu băm của mã và khóa (bảng `app_link_codes`, `app_devices`).
- Vé và tiền: `/api/app-ticket` dùng chung `issueLiveTicket` với trang web; cầu nối giữ và trừ Token dịch như cũ.
  Ứng dụng luôn tắt tiếng dịch (tiếng phát ra sẽ bị bộ thu nghe lại).
- Đóng gói: GitHub Actions `Android thử` (`.github/workflows/android-thu.yml`), chỉ chạy khi `android/` đổi.
  Tệp cài ở mục Artifacts, tên `tyzo-sub-apk`. Khóa ký cố định và địa chỉ web điền sẵn: xem đầu tệp workflow.
- Phát cho khách: đặt `ANDROID_APK_URL` (https) trên Vercel thì nút «Tải tệp cài» hiện ở trang Tài khoản.

Tự đóng gói trên máy có Android SDK: `cd android && gradle assembleRelease`.

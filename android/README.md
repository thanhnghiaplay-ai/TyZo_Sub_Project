# Android — bước thử thu âm

Ứng dụng nhỏ để biết Bilibili, YouTube, TikTok có cho thu âm thanh đang phát không
(Android 10+, `AudioPlaybackCapture`). Chỉ có nút Bắt đầu/Dừng và thanh mức âm.
Không có quyền INTERNET, không gọi máy chủ, không lưu tiếng.

- Mã: `app/src/main/java/vn/tyzo/sub/thu/` (Kotlin, không dùng thư viện ngoài).
- Đóng gói: GitHub Actions `Android thử` (`.github/workflows/android-thu.yml`), chỉ chạy khi `android/` đổi.
  Tệp cài nằm ở mục Artifacts của lần chạy, tên `tyzo-thu-thu-am`.
- Tệp cài ký bằng khóa thử của máy đóng gói, mỗi lần đóng gói một khóa khác:
  muốn cài bản mới thì gỡ bản cũ trước.
- Không nằm trong web: không nâng `APP_VERSION`, không sửa điều khoản, `.dockerignore` bỏ qua `android/`.

Tự đóng gói trên máy có Android SDK: `cd android && gradle assembleDebug`.

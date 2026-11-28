# RE8-007 · R3-006: trình cập nhật Android kẹt khi lỡ tin «tải xong» (Medium)

Baseline `0f53a43`. Mã nằm ở `659ddeb`. Ứng dụng nâng lên **0.14 (versionCode 14)**, `src/lib/app-link.ts` cập nhật theo (test kiểm hai chỗ khớp nhau).

**Trạng thái: BUILD_PASS, chưa thử thiết bị.** APK đã được CI biên dịch và ký. Logic đạt trên JVM với DownloadManager giả. **Chưa thử trên máy Android thật nên không đánh dấu PASS. Chưa phát hành.**

## Lỗi (xác nhận bằng đọc mã tại `fe2b42a`)

- `Updater.start()` gọi `dm.enqueue()` **trước**, rồi mới `registerReceiver`.
- Mã tải chỉ nằm trong bộ nhớ (`downloadId`).
- Không có nhánh nào hỏi lại `DownloadManager`.

Hậu quả: nếu lỡ tin `ACTION_DOWNLOAD_COMPLETE` vì một trong các lý do dưới đây, `downloadId` kẹt khác −1 và mọi lần bấm «Cập nhật ngay» chỉ báo «Đang tải…» cho tới khi tiến trình bị hủy:
- tải rất nhanh;
- ứng dụng bị hệ thống tắt;
- khách hủy tải ở thanh thông báo.

Khi khởi động lại, tệp đã tải xong cũng không được mở để cài.

## Sửa

- **`UpdateFlow.kt` (mới, Kotlin thuần):** từ mã tải đã lưu và trạng thái thật (`STATUS_PENDING/RUNNING/PAUSED/SUCCESSFUL/FAILED`, hoặc không còn bản ghi) quyết định một bước: tải mới, chờ, cài, lỗi (xóa lượt, cho tải lại) hoặc đã hủy (quên mã, cho tải lại). Chỉ nhận tin của đúng lượt đang theo dõi.
- **`Updater.kt`:**
  - lưu mã tải bền trong `SharedPreferences`;
  - đăng ký receiver **trước** `enqueue`;
  - hỏi lại trạng thái ngay sau khi lưu mã (để không lỡ tin đến sớm);
  - bấm lại khi đang tải thì không tải lần hai; nếu lượt cũ đã xong mà lỡ tin thì mở màn cài;
  - lượt lỗi thì `dm.remove`.
- **`MainActivity.onResume`** gọi `Updater.resume()`: lượt đã xong hoặc đã hủy trong lúc ứng dụng không mở vẫn được xử lý, và receiver được đăng ký lại cho lượt đang tải.

## Kiểm thử

- **JVM (`android/tools/update-check/UpdateFlowCheck.kt`, chạy cùng `check-session.sh`):** 19/19 trên `UpdateFlow.kt` thật, theo đúng trình tự của `Updater.kt`. Các ca:
  - bảng quyết định đủ 6 trạng thái;
  - tải thành công;
  - **tin đến trước khi lưu mã**;
  - lỡ tin rồi bấm lại (không tải lần hai);
  - bấm nhiều lần;
  - tải lỗi rồi tải lại;
  - hủy ở thanh thông báo rồi tải lại;
  - **khởi động lại** lúc đang tải, và lúc đã tải xong;
  - tin của lượt cũ đến muộn không làm cài nhầm.

  Bộ Session/Api cũ vẫn đạt 10/10.
- **CI GitHub Actions «Android thử»** (run 46113317257, máy GitHub, miễn phí):
  - `check-session-ci.sh` đạt 29/29;
  - `gradle assembleRelease` **BUILD SUCCESSFUL**, nghĩa là `Updater.kt`, `UpdateFlow.kt` và `MainActivity.kt` thật biên dịch được với Android SDK; lintVital đạt;
  - ký bằng khóa cố định;
  - artifact `tyzo-sub-apk` (1.260.823 byte, giữ tới 28/12/2026);
  - job phát hành **bị bỏ qua** vì nhánh không phải `main`.

  Xem [test-summary.txt](test-summary.txt).

## Chưa xác lập (cần thiết bị thật, gói D4)

- Hành vi thật của `DownloadManager` và `BroadcastReceiver` trên Android 10 và 14/15.
- Màn cài đặt và quyền «Cài ứng dụng không rõ nguồn».
- Thông báo hủy tải.
- Ứng dụng bị hệ thống tắt lúc đang tải.

**APK thử:** tải ở trang run Actions (mục Artifacts). Đây là bản ký khóa cố định nên cài đè được lên bản 0.13. **Chỉ dùng cho máy thử**, không gửi khách. Bản phát hành chính thức chỉ tạo khi Chủ merge vào `main`.

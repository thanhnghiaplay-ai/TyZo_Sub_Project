# RE6-009 · Chi phí GPU Modal, vòng đời máy, Android (Medium)

Baseline `73923cd`. Mã nằm ở `a344532`. PostgreSQL 18.7 (Docker, loopback, dữ liệu giả). GPU là hàm giả, không gọi Modal. **Không đổi giá, hệ số bù, mức giữ Token hay chính sách tài chính.**

Mọi kết quả dưới đây là **giả lập** (PG thử, GPU giả, JVM). Chưa có số đo thiết bị Android thật hay hóa đơn Modal mới.

## 1. Ghi nhận chi phí GPU (PASS_LOCAL)

Lỗi trước sửa: [before.txt](before.txt).

- **Bù chứng từ bị sót** (`recoverModalSpend` trong `src/lib/billing/modal-work.ts`):
  - Tìm lượt chưa `xong` có `provider_usd` nhưng thiếu chứng từ `modal:<attempt>`, rồi ghi bù bằng `recordSpendDurablyWith`.
  - Khóa chứng từ là mã lượt, nên ghi lại hay chạy đồng thời đều không cộng hai lần.
  - Chạy sau mỗi lượt Modal thành công, tối đa 50 lượt mỗi lần. Lỗi khi bù không chặn lượt hiện tại.
  - Không trừ thêm khách.
  - Số USD lấy từ lượt; tỷ giá VND là tỷ giá lúc bù.
- **Số USD không hợp lệ** (NaN, âm, vô hạn, không phải số) → coi là không chắc: không ghi USD, không chứng từ, không trừ, nhả phần giữ.
- **Không tính trùng:** bộ test cũ MAIN-040 vẫn đạt. Thử lại sau 429 thì ghi một lần; gửi lại đoạn đã xong thì dùng kết quả cũ; cùng lượt ghi hai lần vẫn một chứng từ; cùng mã mà số khác thì bị chặn.

**Test** (`src/lib/billing/re6-009.test.ts`, 9/9 trên PG 18.7 và PGlite):
- **Crash giữa hai lần ghi:** khách bị trừ 0; lượt kế tiếp ghi bù; tổng hợp ngày = 2 chứng từ, 19.300 µUSD; chạy bù lại không thêm dòng.
- **10 lần bù đồng thời** cho 3 lượt: đúng 3 chứng từ.
- **4 kiểu USD hỏng.**
- **Chi phí 0 hợp lệ.**

## 2. Giới hạn tài nguyên và ngân sách

| Mục | Cấu hình | Kết luận |
|---|---|---|
| Máy nhận dạng | `max_containers=9`, `scaledown_window=60`, `buffer_containers=2`, `timeout=1800` | Cửa nhận việc lane modal 8 ≤ 9; mỗi khách 3 < 8 |
| Máy model chữ (hồ sơ «kỹ») | `scaledown_window` 60 s (`cau-hinh.json`), `timeout=24h`, **không có `max_containers`** | **Mở:** cần đặt trần và nghiệm thu thật. Chưa sửa vì chưa deploy được |
| Giữ Token theo giờ phim | nhanh 0,5 / kỹ 0,8 so với RTF đo 0,31 / 0,39 | Mức giữ đủ cho phần tính theo đoạn |
| Trần chi của công cụ đo | `TRAN_USD` (RE6-004/RE7-001) | Là trần ước tính, giữ chỗ trước mỗi lệnh |

## 3. Vòng đời GPU: mô hình giả lập (không phải hóa đơn)

Mô hình tính tiền cho các phần: máy khởi động lạnh, thời gian xử lý, thời gian chờ trước khi tắt, và 2 máy dự phòng sống suốt lúc có việc. So với số app đang thu là giây xử lý × giá × hệ số bù 3.

Thông số lấy từ đo thật 28/11 (`v5.49.6/GPU-MODAL`): lạnh 16 s, mỗi đoạn 30 s xử lý mất 9,4 s.

| Kịch bản | Giây máy tính tiền / giây xử lý | Hệ số 3 |
|---|---|---|
| 1 đoạn 30 s, máy lạnh | 288 / 9 = **30,7×** | Thiếu |
| Phim 5 phút (10 đoạn nối tiếp) | 705 / 94 = **7,5×** | Thiếu |
| Phim 74 phút (148 đoạn, 3 luồng) | 3.804 / 1.391 = **2,7×** | Đủ (đo thật 2,5×) |
| 8 khách cùng lúc, mỗi khách 1 đoạn | 886 / 75 = **11,8×** | Thiếu |
| Khách rải rác, 1 đoạn mỗi 90 s × 10 | 3.353 / 94 = **35,7×** | Thiếu |

**Kết luận:**
- Với phim dài, hệ số 3 đủ, và mô hình khớp số đo thật (2,7× so với 2,5×).
- Với việc ngắn, lẻ tẻ hoặc khách rải rác, chi phí khởi động, máy dự phòng và máy chờ trước khi tắt lớn hơn hệ số 3 nhiều lần. TyZo có thể chịu lỗ trên GPU ở các kịch bản này.
- Đây là kết quả mô hình. Cần hóa đơn Modal để xác nhận. **Không đổi giá hay hệ số** trong nhiệm vụ này. Đã ghi vào backlog RE8-001.

## 4. Android: chỉ JVM giả lập, không phải thiết bị thật

Máy chạy test không có Android SDK (dl.google.com bị chặn), nên không dựng được APK hay chạy máy ảo. Bộ kiểm không cần SDK được chạy với Kotlin 2.0.21 và các jar test từ Maven Central. Mã băm SHA-256 của các jar ghi ở [android-jvm.txt](android-jvm.txt).

Kết quả **28/28 đạt:**
- `check-session.sh`: 10/10, chạy trên `Session.kt` và `Api.kt` thật.
- `CaptionLayoutCheck`: tất cả đúng.
- `VoiceFilterCheck`: tất cả đúng.

| Lỗi tồn đọng | Trạng thái hiện tại | Bằng chứng | Còn thiếu |
|---|---|---|---|
| AZ-002 lịch sử lẫn tài khoản | PASS_LOCAL (JVM) | session-check: tách tài khoản và origin | Thiết bị thật |
| AZ-003 race lưu/sync | PASS_LOCAL (JVM) | sync đến muộn không ghi đè bản mới | Thiết bị thật |
| AZ-004 báo sync khi server không lưu | PASS_LOCAL (JVM) | cần `saved=true` và mã biên nhận | Thiết bị thật |
| AZ-008 gỡ thiết bị offline báo thành công | PASS_LOCAL (JVM) | offline thì báo lỗi gỡ | Thiết bị thật |
| R4-004, R4-008 thu hồi khóa Android | PASS_LOCAL (PG 18.7) | test backend trong nhóm module-mocks | — |
| R4-007 rate limit xóa lịch sử | PASS_LOCAL | `backend-audit.test.ts` | — |
| R8-005 quyền workflow | PASS (kiểm tĩnh) | `contents: read` ở mặc định và job thử (dòng 19–20, 24–25); chỉ job phát hành có `write` (dòng 87–88) | — |
| **R3-006** Updater race receiver | **MỞ (BLOCKED)** | Mã hiện tại đăng ký receiver **sau** `enqueue`, và không có nhánh hỏi lại trạng thái. Lỡ tin «tải xong» thì `downloadId` kẹt và nút báo «Đang tải…» tới khi tắt hẳn ứng dụng | SDK và thiết bị thật để sửa và thử. Xem kế hoạch nghiệm thu |

Chưa xác lập được các mặt sau (theo `android/tools/README-session.md`): vòng đời thiết bị, MediaProjection, quyền, độ bền hệ thống tệp Android, cài đặt.

## 5. Chưa làm / BLOCKED

- Hóa đơn Modal thật cho vòng đời máy và chất lượng 3.5/3.8.
- Thiết bị Android thật, R3-006.
- Trần máy model chữ.

Kế hoạch nghiệm thu và dự toán chi phí: [ACCEPTANCE_PLAN.md](ACCEPTANCE_PLAN.md).

# R05 — Android: cách ly bản lưu và xác nhận đồng bộ/gỡ khóa

Ưu tiên P1; đối chiếu AZ-002/AZ-003/AZ-004/AZ-008. Đây là các mục lịch sử còn BLOCKED, không phải sửa lại một kết quả đã nghiệm thu đúng. Chưa nghiệm thu trên thiết bị thật.

Nguyên nhân đã tái hiện bằng mã Kotlin thật: một tệp phien-gan-nhat.json dùng chung cho mọi tài khoản; sync đọc header và cues từ hai lần đọc khác nhau rồi ghi lại snapshot cũ sau mạng; lỗi 4xx bị đánh synced, HTTP200 saved=false bị bỏ qua; unlink nuốt lỗi mạng/máy chủ nhưng giao diện báo thành công.

Trước: resume-android-session-before chứng minh đọc/gửi chéo tài khoản, sync cũ ghi đè bản mới, lần sync sau báo xong dù server từ chối. resume-android-api-before dùng actual Api.kt + HTTP loopback, chứng minh saved=false được nhận và unlink500 bị nuốt. Các log cố ý exit1 được giữ nguyên.

Sửa: định danh tệp bằng SHA256(web, userId); userId lấy từ backend đã xác thực thiết bị, không lấy trường client gửi. app-link/app-me thêm trường tương thích ngược. SharedPreferences chuyển liên kết nguyên khối, lấy snapshot khóa nhất quán. LiveService chụp tài khoản/model/ngôn ngữ khi bắt đầu; callback lịch sử và thu hồi khóa chỉ cập nhật khi tài khoản vẫn khớp. Ghi tệp tạm + fsync + atomic rename; đồng bộ một snapshot và chỉ đánh synced nếu đúng revision hiện tại. Không hồi sinh bản đã xóa. Chỉ nhận saved=true kèm id; gỡ khóa cần ok=true, lỗi/offline giữ thông báo chưa thành công. Lỗi đọc/ghi được báo, không báo đồng bộ giả.

Không tự gán chủ cho tệp legacy thiếu danh tính: giữ nguyên và thông báo trên UI; không tự hiển thị hoặc gửi sang tài khoản hiện tại. Khôi phục/import tệp legacy cần bằng chứng chủ sở hữu; đây là rào chắn trước phát hành, không phải thao tác xóa dữ liệu.

Sau: resume-android-check-script-fixed và resume-android-ci-check qua cách ly web/tài khoản, late sync/new save, clear race, rejected retry, storage fault, Unicode/API receipts/offline unlink và SRT/VTT/TXT. Kiểm thử dùng Context/HTTP adapter ghi rõ trong android/tools/README-session.md; actual Session.kt/Api.kt được biên dịch. CI chạy bộ này với compiler/JAR có SHA256 cố định, trước khi đọc khóa ký. resume-app-identity-after chạy PostgreSQL thật: client gửi userId khác không đổi chủ, bearer đúng mới lấy đúng ID, anonymous không nhận ID.

Đã biên dịch toàn bộ Kotlin với SDK35 chính thức và đóng gói APK debug bằng Gradle8.14.3/JDK17 (resume-android-apk-012). Robolectric framework jar ban đầu có annotation khác SDK và báo lỗi nullable ở mã cũ; log đó không được dùng để kết luận lỗi sản phẩm. Một lần Gradle thiếu proxy và một lần chỉ có JRE được giữ là lỗi môi trường. Không bỏ kiểm tra hoặc tắt TLS để làm xanh.

Ứng dụng ứng viên 0.12/code12; chưa ký bằng khóa production, chưa đăng release, chưa cài cho khách. Cập nhật web trả userId trước khi phân phối app mới. App cũ vẫn hiểu response có thêm trường. Chưa thử thiết bị, MediaProjection, xoay màn hình, cài đè/keystore thực hoặc độ bền filesystem Android khi mất điện.

Rollback: giữ bản sao tất cả phien-*.json và phien-gan-nhat.json; không xóa/gán lại chủ hay ép synced. Trường backend thêm có thể giữ khi rollback app. Không đưa bản Android cũ vào máy chia sẻ có legacy chưa xác minh vì có thể mở lại lỗi lộ bản lưu. Ưu tiên ngừng phân phối/forward-fix; mọi cutover/import legacy cần kiểm tra riêng. Không thay giá, Token, model hoặc quyền lợi.

# R06 — Giới hạn tài nguyên trước khi nhận body lớn

Ưu tiên P1 về khả năng chịu tải; mở rộng kiểm tra AZ-005 sang gateway và parser framework. Không thay quota tài chính hay giới hạn audio hiện hữu.

Nguyên nhân: room-groq/model-call kiểm Content-Length rồi gọi request.arrayBuffer() và chỉ kiểm byteLength sau khi đã cấp phát toàn bộ. Header thiếu/sai vượt qua kiểm đầu; nhiều payload hợp lệ cũng có thể giữ hàng GB trước khi tới admission theo model. Validator Modal chỉ chạy sau framework JSON parsing nên không bảo vệ được cấp phát ban đầu.

Trước: resume-body-before gọi hai handler thật với stream 8MiB không khai Content-Length. Cả hai đọc đủ 8.388.608 byte và không cancel, dù giới hạn chat là512KiB. Sau: resume-body-after/body-route-final dừng sau655.360 byte (gồm một phần prefetch) và cancel=true; không tới SQL/giữ tiền/provider.

Sửa: src/server.ts giữ createStartHandler/defaultStreamHandler mặc định và bọc Request bằng luồng lazy, không đọc trước các handler xác thực webhook. Giới hạn byte được áp dụng khi consumer thực sự đọc, kể cả JSON/FormData của server function. Giữ credit tài nguyên đến khi handler hoàn tất; lỗi parser bị framework bắt vẫn trả đúng413/408/429, không xác nhận thành công giả. Header không hữu hạn/âm/phân số bị từ chối. Không chờ cancel promise của stream lỗi.

Mỗi tiến trình có tối đa32 body bulk với192MiB credit và32 body điều khiển với24MiB credit; credit nhân3 để dự phòng bản sao khi parse, không phải cam kết RSS tuyệt đối. Gateway/nhận audio dùng nhóm bulk; webhook/vé thiết bị và payload nhỏ có chỗ riêng, không bị lượt tải lớn chiếm hết. POST lớn chịu timeout đọc90giây; 429 có Retry-After2giây. PostgreSQL admission vẫn là nguồn quyết định số công việc/provider/model trên nhiều replica; bộ giới hạn body chỉ bảo vệ RAM cục bộ và không thay ledger.

Giữ trần Groq audio25MiB, chat512KiB, speech20KiB, webhook256KiB và app-history3MiB. Trần mặc định server function32MiB chứa được payload audio24.000.000 ký tự hiện hữu. Luồng giữ nguyên byte/header/signal/context; không chuẩn hóa payload trước HMAC hoặc sửa cấu hình đăng nhập.

Kiểm thử: request-body.test.ts có burst300, giữ credit qua callback chậm, tổng byte nhiều request/thiếu header, khai nhỏ giả, timeout/abort/handler lỗi, cancel không resolve, ưu tiên webhook/vé, xác thực trước lần đọc đầu, không cho parser nuốt lỗi và roundtrip Unicode. Hai route được thử bằng handler thực. Cần đọc kết quả kiểm tra HTTP production-build trong hồ sơ bằng chứng; unit adapter không thay thế kiểm tra ingress triển khai.

Ảnh hưởng: mọi request có body qua server entry, gồm Modal server function, auth và gateway. HTTP kiểm body có thể trả413/408/429 trước xử lý nghiệp vụ; tuyệt đối không tự gọi lại provider. Reverse proxy, số replica, tốc độ mạng thật và API provider/GPU vẫn cần staging. Không coi các giới hạn này là chứng nhận200 khách/GPU hoặc chống mọi DoS.

Rollback: revert commit R06 trên nhánh kiểm chứng sau khi ngừng nhận mới/drain; không có migration hoặc dữ liệu phải sửa. Revert mở lại nguy cơ cấp phát không giới hạn. Nếu phát hiện incompatibility payload/ingress, giữ nhận mới ở trạng thái dừng và forward-fix; không đổi sổ tiền hoặc xóa receipt để khớp kết quả.

Kiểm tra HTTP thật trên bản Node build (resume-ingress-network-brand-fixed): header33MiB bị413 trước body/handler; webhook trả401 trong khoảng4ms khi chưa gửi body; 32 lượt upload có đăng nhập hợp lệ bị giữ giữa luồng thì lượt tiếp theo nhận429/Retry-After2; webhook vẫn xác thực và Web trả200; disconnect nhả chỗ; số reservation/spend không đổi. Không có provider key trong DB thử. Một lỗi tương thích Nitro Request proxy đã lộ qua lần HTTP đầu (500), được sửa bằng dựng Request từ URL/header/signal/stream thay vì clone private-state; có regression proxy và signal sau khi đọc xong. Không dùng kết quả unit để che lần kiểm tra HTTP thất bại này.

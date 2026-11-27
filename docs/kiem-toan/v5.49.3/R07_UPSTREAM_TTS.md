# R07 — Kết quả upstream chưa xác minh và quyết toán TTS

Ưu tiên P0 về tiền/TTS, P1 về giữ công suất khi mất phản hồi. Bản trước để tái hiện: `01b4a64`. Không đổi giá, cách quy Token hay điều khoản.

## Trước sửa

`r07-before-complete.log` dùng mã nguồn xuất từ commit01b4a64 tại thư mục riêng, ba kiểm tra đều thất bại: mất phản hồi để admission thành done; TTS trả về trước khi audio hoàn tất và đã trừ4 Token; trigger từ chối provider_spend vẫn làm số Token đã trừ tăng4→8 mà không báo lỗi. Fingerprint của runner là cây làm việc tại thời điểm chạy, **không phải** fingerprint mã snapshot được import; commit01b4a64 và import tuyệt đối trong harness xác định mã kiểm tra trước sửa.

Nguyên nhân: finally luôn nhả admission; TTS chỉ chờ header rồi trừ và trả stream; recordSpendWith bắt lỗi SQL nên khoản trừ và sổ chi phí không cùng giao dịch. Phía khách tự thử lại lỗi mạng/5xx dù máy chủ có thể đã COMMIT. Modal cũng tự gửi lại POST khi chưa biết kết quả lần trước.

## Sửa và ảnh hưởng

- Giữ admission unknown khi đã gửi nhưng chưa nhận đủ kết quả hoặc lỗi HTTP không chứng minh được từ chối trước xử lý. Chặn yêu cầu mới cùng khách/nhà/lane khi còn việc unknown; Chủ đối chiếu chứng cứ qua chức năng giải quyết đã có. Không giải phóng theo thời gian để giả định máy GPU đã dừng.
- TTS giữ ngân sách trước gửi, heartbeat đến hết body, đọc audio hữu hạn32MiB/120giây, quyết toán cùng provider_spend qua settleGateCall trong một giao dịch, rồi đóng phiếu và trả byte âm thanh. Lỗi/timeout trả phần giữ chưa dùng theo chính sách hiện hữu; lưu receipt cùng provider/model để đối soát.
- Chat/ASR lưu provider/model ngay khi giữ; giữ lỗi chính và lỗi ghi sổ nếu cả hai thất bại, không nuốt lỗi cleanup.
- Yêu cầu phòng dùng Token không tự gửi lại khi mất phản hồi/5xx. 429 xác định và key riêng giữ cơ chế thử lại hiện hữu. Modal chỉ tự thử lại HTTP429; mất mạng, 5xx hoặc lỗi sau redirect phải đối soát.
- Migration0051 chỉ thêm chỉ mục partial cho running/unknown, tránh quét toàn bộ lịch sử khi tính tải. Không sửa/xóa ledger hay dữ liệu cũ.

## Bằng chứng sau sửa

`upstream-outcome.test.ts` có10 ca trên PostgreSQL thật: lost reply,429/500, TTS nhận đủ body, timeout, trigger lỗi chi phí rollback debit, mất body sau debit không gửi lần hai, Modal uncertain/429, validation trước gửi và EXPLAIN với100.000 dòng lịch sử. `r07-regression-v4`:10/10 PASS. `r07-focused-v5` phát hiện một assertion cũ coi500 là lỗi xác định; assertion được sửa thành mat-phan-hoi, giữ nguyên kiểm tra charged=0 và reserved=0. Các lần chạy đầy đủ/focused mới phải được đọc từ evidence, không suy ra từ lần chạy trước đó.

Migration từ dữ liệu mẫu cấu trúc0046 lên0051, chạy lại và cố tình lỗi0052 đều giữ nguyên dữ liệu mẫu; DDL và bookkeeping rollback khi có lỗi. Đây không phải bản sao dữ liệu khách đã ẩn danh.

Giới hạn: không có durable request/result cache cho phục hồi kết quả đã COMMIT nhưng khách mất phản hồi; bản sửa ngăn tự gửi trả phí lần hai, không tuyên bố exactly-once cho mọi API/thao tác thủ công. Giữ unknown có thể cần Chủ đối soát trước khi tiếp tục. Không có bằng chứng GPU/provider thật hay chất lượng âm thanh trên thiết bị thật. Audio hiện được trả sau khi nhận đủ; cần đo thời gian phát trên staging.

## Rollback

Dừng nhận việc mới, drain và đối soát unknown trước khi revert commit R07 trên nhánh kiểm chứng. Giữ receipt/ledger và migration0051 (chỉ mục tương thích ngược), không xóa để làm số liệu khớp. Revert mở lại nguy cơ TTS quyết toán sớm và tự gửi lại có phí; ưu tiên forward-fix. Không tự xóa unknown hoặc hoàn khoản đã quyết toán chỉ để mở công suất. Không rollback DB production khi chưa có backup được kiểm chứng và phê duyệt.

Kiểm tra liên module phát hiện cần phân biệt thiếu công suất với việc chưa rõ kết quả: admission unknown nay trả409/cần đối soát, không trả429 để khách tự thử lại sau2giây. Công suất bận thật vẫn429/Retry-After2. `r07-cross-module-v8` kiểm tra cả Alibaba async (408 và500 tách fixture), không cho gửi cùng URL hoặc URL khác cùng nhà khi chưa đối soát; số submit vẫn1. Đây là thay đổi có chủ ý của assertion cũ, không bỏ kiểm tra reservation/ledger. Full-suite trước sửa phân biệt409 còn thất bại được giữ trong evidence.

Cổng R07 trên fingerprint ứng dụng `8e73405f11c52c674eaea875becee550fb0d7f4b79bd6a904822f0ae38f08ea4`: `r07-full-v4` exit0, typecheck/lint/build mặc định frozen exit0. Các lần full-v2/v3 thất bại (chữ CHANGELOG, assertion logger cũ, admission unknown liên module) được giữ nguyên. R08 ghi nhận độc lập hai phát hiện tiếp theo: live đóng trước ghi chi phí, và chi phí USD dùng giá vốn đã làm tròn; chưa coi R07 đóng các phát hiện này.

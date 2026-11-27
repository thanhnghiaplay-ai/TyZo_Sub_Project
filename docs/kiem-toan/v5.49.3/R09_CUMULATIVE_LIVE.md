# R09 — Usage live cộng dồn, không cộng lại phần đã tính

P0/P1 liên quan khoản trừ và chi phí live. Nguồn hợp đồng: [Alibaba LiveTranslate server events](https://www.alibabacloud.com/help/en/model-studio/live-translator-server-events), cập nhật19/11/2026, đối chiếu27/11/2026: response.done chứa bộ đếm cộng dồn của phiên; input text của system prompt cố định không tính phí; trường video_tokens là số token hình. Không đổi giá, model, cách quy đổi hoặc làm tròn Token.

Trước: `r09-cumulative-before-small` gửi500 rồi1000 audio token cộng dồn, output5 rồi10, fixed prompt50. Mã cũ ghi chi phí319,8đ thay vì200,2đ, trừ110+210 đơn vị fixture. Sau: `r09-cumulative-after` ghi200,2đ và trừ101+101 theo đúng quy tắc làm tròn cũ trên phần tăng thêm. Đây là fixture sổ giá, không phải hóa đơn/giá mới.

Sửa: high-water mark từng trường trên từng kết nối upstream; lấy delta, không lùi bộ đếm khi gói lặp/cũ; khởi tạo lại khi mở WebSocket upstream mới. Bỏ system prompt không tính phí tại bước lấy billable delta; giữ hàm giá/quy Token hiện hữu. Đọc video_tokens, tương thích image_tokens cũ. Thiếu usage hoặc token không hợp lệ thì dừng nhận tiếng mới và giữ admission unknown, không mặc định là miễn phí.

Kiểm tra: cumulative-usage.test.ts và live-bridge-audit.test.ts kiểm cộng dồn/lặp/gói cũ, fixed prompt, reconnect, thiếu usage. `r09-focused`:62/62 PASS. `r09-full` và `acceptance-r09-full`:1680 pass,0 fail,7 skip, typecheck/lint/build mặc định+Node pass trên các snapshot trước lần chỉnh bộ benchmark cuối; xem fingerprint từng JSON, không coi chúng là cùng snapshot cuối một cách mặc định.

Bước nhỏ chốt trước bàn giao: scripts/re2-live-bench.ts chạy WebSocket loopback thật, chữ ký vé fixture, PostgreSQL thật, kernel admission/token/journal thật, cohort1/5/25/50/100/200/300. Có báo cáo lặp/cũ và đóng phiên; kiểm tổng khoản trừ, gói hoàn dư, tổng chi phí, receipt pending và quota/model. Không có GPU/provider/audio thật.

Hai lỗi của bộ thử được giữ rõ:

1. Timer giả lập chưa phát hết usage đã trả session.finished: soak đầu dừng vòng3, không đạt60phút. Chỉnh fixture flush báo cáo trước finished; cố tình chậm timer200ms: native-fixture-lag-before FAIL, lag-after PASS.
2. Kỳ vọng cứng2 receipt/phiên sai khi timer phát báo cáo2 trước1. `r09-native-debug-stress-3` lưu thứ tự `[2,1,...]`,259 receipt thay vì260, nhưng tổng chi phí journal và aggregate đều980,20, khoản trừ khớp. Benchmark nay đếm số lần high-water tăng theo đúng thứ tự fixture đã phát; vẫn kiểm nguyên tổng tiền, khoản trừ và toàn bộ receipt, không bỏ assertion tài chính. Năm vòng `r09-native-stability-1..5` cuối PASS trên fingerprint `2d036c766f5491156577c45cccc7d52f0af33b9eae780e8705698646420a31b3`.

Lưu ý lưu bằng chứng: nhãn stability1..3 đã bị tái sử dụng khi chạy lại, ghi đè một log lỗi cũ235/256 receipt. Không coi chúng là lịch sử bất biến. Trường hợp tái hiện độc lập có log chi tiết (`r09-native-debug-stress-3`) vẫn được giữ; báo cáo bàn giao ghi hạn chế này. Phiên sau phải dùng nhãn mới, không ghi đè.

Chưa nghiệm thu: chưa chạy lại full suite/build/scanner/Graphify trên fingerprint cuối sau thay đổi benchmark; chưa đủ soak60phút; chưa kiểm hợp đồng bằng provider/GPU thật, ingress triển khai, thiết bị Android, backup khách ẩn danh và corpus. Không sửa số tiền lịch sử hoặc tự hoàn/trừ bù: cần Chủ đối chiếu hóa đơn/receipt trước.

Rollback: dừng nhận mới/drain; giữ journal/ledger, không ép numeric về bigint hoặc xóa unknown. Revert R09 mở lại nguy cơ tính cộng dồn như từng lượt; ưu tiên forward-fix và giữ admission dừng nếu protocol không khớp. Không tự sửa khoản lịch sử hoặc triển khai rollback production.

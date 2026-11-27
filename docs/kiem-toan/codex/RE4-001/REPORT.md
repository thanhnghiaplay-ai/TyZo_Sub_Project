# RE4-001 · PARTIAL

`src/lib/billing/run-gate.ts` giữ phần đầu vào theo `byteLength / 3`. Số byte chia ba không chặn được số token thực, kể cả token của khuôn hội thoại và schema công cụ. Cửa còn chuyển tiếp số lượng câu trả lời tùy ý.

Cả hai route trả theo lượt đi qua cùng cổng. Giữ theo toàn bộ cửa sổ ngữ cảnh lấy từ model đã định giá, cộng trần generation của một câu trả lời. Từ chối khi thiếu metadata, thiếu hold hoặc trần đầu ra sai. Kiểm tra usage vượt cận để đưa vào đối soát. Giữ công thức quyết toán hiện hành theo số usage và quy tắc fallback khi thiếu usage. Giá và tỷ lệ quy Token giữ nguyên.

Trước: hồi quy với fixture tiếng Việt, CJK, emoji và JSON tool schema ghi nhận một lệnh tới nhà giả trong khi cận trên không đủ chỗ; xem before.log. Sau: 51 test PASS, 0 lỗi/bỏ qua, PostgreSQL 17.12 thực trên loopback, upstream giả, có giữ đồng thời và kiểm tra sổ tiền; xem after-pg.log. TypeScript PASS, ESLint 0 lỗi/23 cảnh báo sẵn có.

Giới hạn: bảo thủ theo toàn bộ cửa sổ có thể chặn phiếu ngắn vừa đủ theo lượng sử dụng thực. Metadata giá là giả thiết cần xác minh với hợp đồng API và usage thật từng nhà/model, gồm cả reasoning. Để phát hành cần nghiệm thu phiếu và một cận trên theo yêu cầu đã xác minh cho model được hỗ trợ, nếu toàn cửa sổ làm hỏng luồng phổ biến. Fallback khi thiếu usage được giữ để tránh làm tăng khoản trừ khách và vẫn mở đối soát.

Rollback: chỉ revert commit RE4-001 sau khi các lệnh đang chạy đã kết thúc và sổ đã đối soát. Không có migration.

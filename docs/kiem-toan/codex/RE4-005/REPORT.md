# RE4-005 · PASS cục bộ

`src/lib/billing/audio-probe.ts` đặt lại tham số depth khi bước vào Tracks/Cluster, và so cuối phần tử với cuối tệp. Cấu trúc lồng trái ngữ pháp và vượt biên cha có thể được công nhận là audio hợp lệ.

Giới hạn 25 MiB, số phần tử và số gói; giới hạn kích thước ID và đọc cả header/nội dung theo biên cha. Chỉ đi vào các bậc Segment → Tracks → TrackEntry hoặc Segment → Cluster → BlockGroup, số khung gọi có cận theo ngữ pháp. Unknown size chỉ hợp lệ trên Segment và Cluster, tương thích MediaRecorder. Sai cấu trúc trả lỗi kiểm soát; cửa ASR từ chối trước khi gọi nhà.

Trước: 2 test fixture cấu trúc hỏng thất bại trên mã cũ. Sau: 29/29 PASS trên Node 22.23.5, gồm biến thiên byte và cửa không gửi audio chưa xác minh. Đối chiếu FFprobe với 3 tệp mã hóa thật và 1 tệp Chromium 156 MediaRecorder đều PASS. MediaRecorder 37 gói, bộ dò và FFprobe cùng đếm 2,22 s. TypeScript PASS, ESLint 0 lỗi/23 cảnh báo.

Giới hạn: một lần dùng Node 24 báo RSS vượt ngưỡng 200 MiB ở bài multipart WAV 25 MiB; probe WAV giữ nguyên, Node 22 qua bài này. Cần đo nguyên nhân RSS/rate upload trong tích hợp tải; chưa có ASR nhà thật.

Rollback: drain lệnh ASR đang chạy rồi revert riêng commit. Không có migration.

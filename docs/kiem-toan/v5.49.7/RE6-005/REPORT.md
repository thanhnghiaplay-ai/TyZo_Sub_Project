# RE6-005 · Đo độ trễ Dịch trực tiếp và bộ lọc chữ sót

Baseline `8b733b5`. Mọi phép thử dùng cầu nối WebSocket giả trên loopback. Không gọi Alibaba hay cầu nối thật, và không trừ Token.

## Lỗi trước sửa

Xem [before.txt](before.txt).

## Thay đổi

- `deploy/vps/do-live/live-measure.ts` là phần đo dùng chung và có thể kiểm thử:
  - Dùng `performance.now()`.
  - Dọn `setInterval` và hẹn giờ hết hạn khi đóng, lỗi hoặc hết giờ. Đếm `framesAfterClose`.
  - Bỏ qua tin không phải JSON thay vì làm sập lượt đo.
  - `speechSpan` trả `null` cho đoạn im lặng.
- `summarize` chỉ tính phân vị trên lượt đạt. Lượt đạt cần đóng 1000, không lỗi và có chữ gốc, bản dịch và câu chốt. Lượt lỗi hoặc thiếu mốc được đếm riêng theo lý do (`failed`). Có `n/p50/p95/p99/max` cho onset→chữ gốc, onset→bản dịch và hết tiếng→câu chốt. Nhãn ghi rõ đây là mốc nhận tại máy đo, chưa gồm thời gian vẽ.
- `do-live.ts` và `chay.sh` có thêm tham số model (`3.5`|`3.8`, mặc định 3.5 như app) và số vòng 1–10, để đủ mẫu cho P95/P99. Ví dụ: `bash chay.sh wss://… vi 3.8 5`.
- Corpus đa ngôn ngữ kiểm bộ lọc. Chữ Latin có dấu, Cyrillic, Ả Rập, Thái và tên phiên âm giữ nguyên. Đích ja giữ nguyên. Delta đã lọc rồi ghép lại phải bằng câu chốt đã lọc.

## Kiểm thử

`node --test scripts/re6-005-live-measure.test.mjs src/lib/live/leftover-script.test.ts`: 7 + 6 ca đạt. Xem [test-summary.txt](test-summary.txt). `tsc --noEmit` đạt.

## Còn lại (PARTIAL)

- **Cần Chủ quyết chính sách:** tên riêng viết bằng chữ Hán, kana hoặc Hangul trong bản dịch tiếng Việt hoặc tiếng Anh vẫn bị bỏ (`Tôi gặp 王小明 hôm qua.` → `Tôi gặp hôm qua.`). Test ghi lại hành vi này. Không tự đổi vì đây là đầu ra khách thấy. Hai hướng: giữ chuỗi ngắn có dạng tên, hoặc yêu cầu model phiên âm trong prompt.
- **BLOCKED:** muốn đo onset→vẽ trên Web hoặc Android thật thì cần gắn mốc ở client và có thiết bị thật. Đo thật cần Chủ duyệt vì có trừ Token và chi Alibaba.

# RE5-005 · Đo admission/live/web trên mã có 0057 (PASS_LOCAL, upstream giả)

Mã: nhánh `audit/v5.49.6-claude-re5` ở `c9d42dd`, cộng thay đổi đo lường trong `scripts/admission-bench.ts` (thêm chỉ số theo lane và khoảng chờ dài nhất). Trong `soak/meta.txt`, `head` là SHA của bản chép tạm cùng nội dung, không phải SHA trên GitHub. Môi trường: PostgreSQL 16.15 loopback; bản Node `node-server` cổng 17750; k6 0.55.0 với 300 VU; Node 22.23.5. Upstream giả: không có GPU, không có nhà cung cấp thật.

## Chỉ số mới

`maxGapMs`: khoảng dài nhất một khách không được nhận, tính giữa hai lần được nhận, hoặc từ đầu đợt nếu chưa lần nào. Chỉ số này không phụ thuộc độ dài cửa sổ. Chỉ số cũ `starved` (0 lần được nhận trong cửa sổ) trùng với ngưỡng chống đói 3 s nên đếm ra "đói" giả khi cửa sổ là 3 s.

## Khi máy rảnh (`admission-idle-3s.json`, `admission-idle-10s.json`)

| Khách | p95 batch / live / modal (ms), cửa sổ 10 s | maxGap tệ nhất (s) | vượt trần |
|---|---|---|---|
| 25 | 3,5 / 4,2 / 3,2 | 0,30 | 0 |
| 50 | 7,3 / 6,8 / 7,1 | 3,07 | 0 |
| 100 | 61 / 55 / 60 | 2,62 | 0 |
| 200 | 227 / 223 / 230 | 3,55 | 0 |
| đợt 300 | p95 369, p99 389 | — | 0 |

## Soak hỗn hợp một mạch: 3.614 s, 203 vòng, PASS (`soak-summary.json`)

- **Admission** (mỗi vòng 3 s, cạnh tranh CPU với k6 và cầu nối live):
  - 0 lỗi, 0 lượt không chắc, **0 vượt trần**.
  - p95 trung vị qua các vòng: 17 / 27 / 62 / 201 ms ở mức 25 / 50 / 100 / 200 khách. Tệ nhất: 94 / 122 / 449 / 617 ms.
  - Đợt 300: p95 348 ms.
  - **maxGap tệ nhất ở mọi lane và mọi vòng: 3,57 s** (batch ở mức 200). Live tệ nhất 2,58 s.
- **Live** (fixture WebSocket với PostgreSQL thật): 0 vi phạm sổ cái, 0 trừ trùng, số lệnh nhà khớp số quan sát ở 203/203 vòng, 29.236 phiên được nhận.
- **Web**: 313.127 yêu cầu, 0% lỗi, p50 4,1 ms, p95 10,3 ms.
- **Runtime**: RSS bản Node tăng từ 639 lên 722 MB trong 15 phút đầu rồi đứng tới hết. PostgreSQL tối đa 42 kết nối.

## Kết luận

- Không khách nào bị bỏ đói quá khoảng ngưỡng 3 s cộng một nhịp thử lại; với live tối đa 2,6 s.
- Mục tiêu đề xuất p95 < 100 ms: **đạt ở mức ≤ 100 khách** khi rảnh và ở trung vị dưới tải; **không đạt ở 200 khách** (khoảng 200–225 ms ở mọi lane). Nguyên nhân là `tyzo_admit` chạy tuần tự dưới một khóa advisory toàn cục; 0057 không làm chậm thêm so với 0056.
- Muốn giảm p95 ở 200 khách cần thiết kế lại (khóa theo provider hoặc cấp suất theo lô). Không nới trần để làm đẹp số.

## Chưa đo

Độ trễ từ âm thanh tới chữ hiển thị (partial < 1 s, final) với nhà thật; staging có độ trễ mạng tới Neon; GPU thật.

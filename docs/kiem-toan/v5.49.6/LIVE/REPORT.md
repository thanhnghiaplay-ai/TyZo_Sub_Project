# Dịch trực tiếp thật: âm thanh → chữ (VPS, 28/11/2026 03:28)

Chạy `deploy/vps/do-live/chay.sh` trong container cầu nối, qua `wss://realtimehub.tyzo.site/live` (Caddy → cầu nối → Alibaba), model `qwen3.8-livetranslate-flash-realtime`, dịch sang tiếng Việt. Dùng tài khoản của Chủ. 4 đoạn mẫu khoảng 30 s, gửi theo nhịp thời gian thực 100 ms/khung. Mốc bắt đầu có tiếng dò theo năng lượng: khoảng 0,2–0,3 s ở cả 4 đoạn (âm lượng lên ngay, nên là lời nói).

| Đoạn | Chữ gốc tạm đầu | Bản dịch tạm đầu | Câu cuối chốt sau khi hết tiếng | Câu chốt | Lỗi |
|---|---|---|---|---|---|
| zh | 2,27 s | 2,32 s | 3,08 s | 13 | 0 |
| ja | 4,20 s | 4,30 s | 2,30 s | 9 | 0 |
| ko | 3,22 s | 3,31 s | 2,28 s | 9 | 0 |
| en | 2,28 s | 2,34 s | 0,81 s | 8 | 0 |
| **p50 / tối đa** | **3,22 / 4,20 s** | **3,31 / 4,30 s** | **2,30 / 3,08 s** | | |

## Nhận định
- **Mục tiêu đề xuất "chữ tạm hiện dưới 1 s" CHƯA đạt:** chữ đầu tiên hiện sau 2,3–4,3 s kể từ khi bắt đầu nói.
- Bản dịch tạm hiện chỉ khoảng 0,05–0,1 s sau chữ gốc tạm. Vậy chỗ chậm là **bước nhận dạng phía Alibaba** trước khi trả chữ đầu, không phải bước dịch hay cầu nối.
- Câu chốt cuối ra 0,8–3,1 s sau khi hết tiếng.
- Lần này đo từ VPS (Singapore) tới Alibaba Singapore. Khách ở Việt Nam còn cộng thêm mạng điện thoại tới VPS (thường dưới 0,1 s).

## Hướng cải thiện (chưa làm, cần đo so sánh)
1. Thử model khác của Alibaba hoặc tham số phân đoạn (`5. Ngắt câu Qwen` trong menu `tyzo`: thời gian chờ im lặng 300 ms, độ nhạy 0,5). Tham số này chủ yếu ảnh hưởng câu chốt, ít ảnh hưởng chữ tạm đầu.
2. Đo thêm với giọng nói thật trong phim (nhạc nền) và câu ngắn.

## Ghi chú kỹ thuật
Thư viện `pg` in cảnh báo về `sslmode` trong chuỗi kết nối (sẽ đổi nghĩa ở pg v9). Cảnh báo này đến từ script đo (dùng chung `DATABASE_URL` của cầu nối), không phải lỗi. Khi nâng `pg` thì nên đặt `sslmode=verify-full` rõ ràng.

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

## So 5 cấu hình, nối thẳng Alibaba (VPS, 28/11/2026 03:45; `deploy/vps/do-live/do-live-direct.ts`)

Cùng 4 đoạn mẫu; tính từ khi bắt đầu có tiếng (khoảng 0,2 s). Không trừ Token khách.

| Cấu hình | Chữ gốc đầu, p50 (tối đa) | Bản dịch đầu, p50 | Câu chốt zh/ja/ko/en | Lỗi |
|---|---|---|---|---|
| 3.8 như app (mặc định hiện tại) | 2,92 s (3,95) | 3,01 s | 13/9/9/8 | 0 |
| 3.8 speaker_detection 0.2 | 4,45 s (4,90) | 4,55 s | 11/9/9/9 | 0 |
| **3.5 như phòng (tự dò, 300 ms, 0,5)** | **0,39 s (0,48)** | **0,65 s** | 11/10/11/18 | 0 |
| 3.5 báo trước ngôn ngữ (300 ms, 0,5) | 0,38 s (0,48) | 0,64 s | 11/10/11/18 | 0 |
| 3.5 báo trước ngôn ngữ (200 ms, 0,2) | 0,38 s (0,48) | 0,65 s | 13/16/8/18 | 0 |

**Kết luận:**
- **Qwen 3.5 đạt mục tiêu chữ tạm dưới 1 s.** Chữ gốc hiện sau khoảng 0,4 s, bản dịch sau khoảng 0,65 s, nhanh hơn 3.8 khoảng 7–8 lần.
- Báo trước ngôn ngữ hay đổi tham số ngắt câu **gần như không thay đổi** độ trễ chữ đầu.
- speaker_detection 0.2 làm 3.8 chậm hơn.

**Chưa xác minh:**
1. **Chất lượng bản dịch** của 3.5 so với 3.8: script chưa lưu chữ.
2. Cột "câu cuối sau khi hết tiếng" của 3.5 ra số âm (khoảng −3,3 s). Script ước điểm hết tiếng một cách thô (độ dài đoạn − 0,3 s). 3.5 chốt từng câu ngay khi gặp khoảng lặng, nên câu cuối có thể đã chốt trước khi đoạn mẫu hết (đoạn có thể kết thúc bằng khoảng lặng hoặc nhạc). Số câu chốt của 3.5 bằng hoặc nhiều hơn 3.8, nhưng **chưa kiểm chữ câu cuối có đủ không**.

**Đề xuất:** Chủ thử trên web, chọn "Qwen 3.5", nghe một đoạn thật. Nếu chất lượng đạt thì đổi mặc định sang 3.5 (`LIVE_MODELS` trong `src/lib/live/live-open-rules.ts`; khách thấy thay đổi nên cần nâng phiên bản và ghi CHANGELOG).

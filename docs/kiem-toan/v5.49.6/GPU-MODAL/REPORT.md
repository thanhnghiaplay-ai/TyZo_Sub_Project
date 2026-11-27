# GPU TyZo Modal thật — đo từ VPS (28/11/2026 02:55, hồ sơ «nhanh»)

Chủ chạy `deploy/vps/do-modal/do-modal.py` trên VPS, endpoint `…tyzo-asr-run.us-east.modal.run`. Mẫu là 4 đoạn khoảng 30 s (zh/ja/ko/en, WAV mono 16 kHz). Ảnh kết quả: `ket-qua-vps.jpg`.

| Chỉ số | Giá trị |
|---|---|
| Lệnh / lỗi | 17 / 0 |
| Lần đầu (máy khởi động lạnh) | 16,0 s |
| Máy nóng, 12 lệnh | p50 9,4 s; p95 9,6 s; tối đa 9,9 s |
| Hệ số thời gian thực (máy nóng) | 0,31 (30 s âm thanh xử lý trong khoảng 9,4 s) |
| 4 lệnh song song | 8,2 / 15,6 / 23,0 / 30,6 s |
| Chi ước tính | 0,064 USD cho 17 lệnh; khoảng 0,0029–0,0046 USD mỗi đoạn 30 s (khoảng 0,35–0,55 USD mỗi giờ âm thanh) |

## Phát hiện

**4 lệnh song song bị xử lý lần lượt từng lệnh** (thời gian tăng đều khoảng 7,5 s mỗi lệnh). Endpoint chỉ có một container, mỗi lần chỉ nhận một việc, và không tự mở thêm container trong khoảng 30 s. Với nhiều khách cùng lúc, thời gian chờ tăng tuyến tính: khách thứ N chờ khoảng N × 7,5–9,5 s cho mỗi đoạn 30 s. Cần cấu hình app Modal (concurrency trên mỗi container, hoặc số container tối thiểu và tối đa) và đo lại. Việc này nằm ngoài kho TyZo (app Modal). Trần `modal: 8` của cửa nhận việc cho 8 lượt vào, nhưng GPU thực tế xử lý từng lượt một.

Chưa đo: hồ sơ «ky», đoạn dài, mức 100–200 khách, chất lượng chữ.

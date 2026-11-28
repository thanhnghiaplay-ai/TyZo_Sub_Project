# RE8-001 · Chi phí vòng đời GPU: so sánh phương án bằng mô phỏng (Medium)

**Đây là MÔ PHỎNG, không phải hóa đơn hay số đo thiết bị.** Bộ mô phỏng là `scripts/gpu-sim.mjs`, test là `scripts/re8-001-gpu-sim.test.mjs` (5/5), bảng đầy đủ 84 dòng ở [sim-table.md](sim-table.md). **Không đổi hệ số bù 3, giá bán hay quyền lợi khách.**

## Mô hình

- **Thông số đo thật 28/11** (`v5.49.6/GPU-MODAL`):
  - khởi động lạnh 16 s (có bản chụp);
  - mỗi đoạn 30 s xử lý 9,3 s (RTF 0,31; hồ sơ «kỹ» 0,39);
  - Modal chậm mở máy mới theo nhu cầu khoảng 30 s; máy dự phòng tránh được độ trễ này.
- **Giá:** L4 0,80 USD/giờ, L40S 1,95 USD/giờ (`cau-hinh.json`).
- **Thông số giả định:** máy model chữ khởi động 45 s; mỗi đoạn «kỹ» gửi 4 yêu cầu chữ.
- **App thu** = giây xử lý × 0,80 × 3 / 3.600. Cột «Thu / chi» dưới 1 nghĩa là TyZo chịu lỗ GPU.
- **Hiệu chỉnh:** phim 74 phút trong mô phỏng ra 1,9×, đo thật 2,5×. Mô hình hơi lạc quan với phim dài vì chưa tính CPU, RAM và tải mô hình.

## Bảng chọn lọc (đầy đủ: [sim-table.md](sim-table.md))

| Kịch bản | Phương án | Chi phí USD | Thu / chi | P95 mỗi đoạn | Ghi chú |
|---|---|---|---|---|---|
| 1 đoạn lẻ | hiện tại (dự phòng 2, chờ 60 s) | 0,053 | 0,12 | 25,5 s | Lỗ khoảng 0,047 USD mỗi đoạn lẻ |
| 1 đoạn lẻ | dự phòng 0 | 0,019 | 0,33 | 25,5 s | Vẫn lỗ: chi phí khởi động và chờ cố định |
| 1 đoạn lẻ | dự phòng 1 + chờ 30 s | 0,023 | 0,27 | 25,5 s | |
| Rải rác 10 khách / 90 s | hiện tại | 0,528 | 0,12 | 25,5 s | |
| Rải rác 10 khách / 90 s | dự phòng 1 + chờ 30 s | 0,226 | 0,27 | 25,5 s | −57% chi phí, cùng độ trễ |
| 8 khách cùng lúc | hiện tại | 0,169 | 0,29 | 27,0 s | |
| 8 khách cùng lúc | dự phòng 0 | 0,135 | 0,37 | **55,5 s** | Mất lợi ích dự phòng: chờ gấp đôi |
| 8 khách cùng lúc | dự phòng 1 + chờ 30 s | 0,109 | 0,46 | 28,5 s | |
| 8 khách cùng lúc | gom (chờ máy nóng ≤ 10 s) | 0,034 | 1,47 | **92,0 s** | Rẻ nhưng chậm gấp 3,4 lần |
| Phim 74 phút, kỹ | hiện tại | 1,076 | 1,07 | 580 s | Máy chữ: 1 |
| Phim 74 phút, kỹ | chờ 300 s | 1,236 | 0,93 | 580 s | Chờ lâu làm lỗ |
| 100 khách giờ cao điểm | hiện tại | 7,45 | 1,71 | 66,5 s | |
| 100 khách giờ cao điểm | dự phòng 1 + chờ 30 s | 6,77 | 1,88 | 66,5 s | −9% |
| 100 khách giờ cao điểm | gom | 5,20 | 2,45 | **2.828 s** | Hàng chờ bùng nổ: loại |
| 200 khách giờ cao điểm | hiện tại (cửa 8) | 11,56 | 2,20 | **1.251 s** | Bão hòa năng lực |
| 200 khách giờ cao điểm | cửa 16 + 16 máy | 13,63 | 1,87 | 66,5 s | +18% chi phí, hết bão hòa |
| Mọi kịch bản | khởi động lạnh 60 s (không bản chụp) | +5–55% | — | +44 s | Giữ bản chụp |
| Mọi kịch bản | 1 máy luôn bật | Mô phỏng ≈ như cũ | — | Đoạn lẻ 9,5 s | **Thực tế +19,2 USD/ngày** (0,8 × 24 giờ). Chỉ đáng khi tải đều |

## Kết luận

1. **Việc ngắn, lẻ hoặc rải rác luôn lỗ** với hệ số 3, dù cấu hình nào: chi phí khởi động lạnh và thời gian chờ tắt là cố định cho mỗi lần bật máy. Đây là quyết định giá (phí tối thiểu mỗi lượt, hoặc hệ số theo độ dài) của Chủ. **Không tự đổi.**
2. **Đề xuất cấu hình** (chờ Chủ duyệt, đổi trong `cau-hinh.json` rồi «Cập nhật»): `may_du_phong_nhan_dang` 2 → **1**, `tat_may_nhan_dang_sau_giay` 60 → **30**.
   - Kết quả mô phỏng: chi phí −9% đến −57% tùy kịch bản; P95 đợt 8 khách 27,0 → 28,5 s; cao điểm 100 khách không đổi P95.
   - **Không** bỏ hẳn máy dự phòng (độ trễ đợt dồn gấp đôi) và **không** gom việc bằng cách chờ máy nóng (hàng chờ bùng nổ khi tải cao).
3. **Năng lực:** cửa 8 đủ tới khoảng 100 khách giờ cao điểm (video 10 phút). Khoảng 200 khách cần cửa 16 và 16 máy (xem RE8-008).
4. **Tách chi phí:**
   - GPU nhận dạng là phần chính.
   - GPU model chữ (L40S) chỉ phát sinh với hồ sơ «kỹ»: khoảng 0,36 USD trong phim 74 phút «kỹ» (máy nhận dạng 0,72 USD), tức khoảng 33%.
   - Chờ tắt 300 s làm phim «kỹ» lỗ (thu/chi 0,93).
5. **Mục tiêu streaming P95 dưới 1 s không bị đánh đổi.** Dịch trực tiếp đi qua Alibaba và cầu nối, không dùng GPU Modal. Mọi phương án ở đây chỉ ảnh hưởng nhận dạng tệp (batch).

## Rủi ro mô phỏng

- Chưa có hóa đơn Modal để hiệu chỉnh: thời gian khởi động thật, độ trễ co giãn và cách tính buffer có thể khác.
- Số máy chữ phụ thuộc giả định 4 yêu cầu mỗi đoạn.
- Mô hình chưa tính lỗi GPU, hết chỗ L4 (chuyển sang A10 1,10 USD/giờ) và băng thông.

Nghiệm thu thật: G1–G5 trong [kế hoạch](../RE6-009/ACCEPTANCE_PLAN.md).

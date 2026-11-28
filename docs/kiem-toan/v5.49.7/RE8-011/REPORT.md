# RE8-011 · Phương án tài chính GPU nhận dạng và dịch (chỉ phân tích)

**Đây là MÔ PHỎNG, chưa đổi giá, hệ số bù 3 hay quyền lợi khách.** Mã phân tích: `scripts/gpu-pricing.mjs`, dùng `scripts/gpu-sim.mjs`. Test: `scripts/re8-011-gpu-pricing.test.mjs` (3/3). Bảng đầy đủ: [bang-chi-phi.md](bang-chi-phi.md) và [bang-ket-hop.md](bang-ket-hop.md).

## Quy ước

- **Đơn vị:** USD giá gốc mỗi **lượt** (một video của một khách), **trước** % chênh của phòng khi quy ra Token dịch. Thu thật của TyZo còn cộng thêm % chênh này, nên biên thật cao hơn số ở đây đúng bằng phần chênh.
- **Biên lợi nhuận tính trên doanh thu:** doanh thu cần = chi phí / (1 − biên).

  | Biên | Doanh thu cần |
  |---|---|
  | 10% | chi phí × 1,11 |
  | 20% | × 1,25 |
  | 30% | × 1,43 |
  | 40% | × 1,67 |

- **Thu hiện tại** = giây xử lý × 0,80 USD/giờ × 3.
- **Chi phí theo pha:** khởi động (máy đang bật), xử lý, rảnh (máy dự phòng, chờ trước khi tắt).
  - GPU nhận dạng: L4, 0,80 USD/giờ.
  - GPU dịch: máy model chữ L40S, 1,95 USD/giờ, chỉ hồ sơ «kỹ».
- **Theo tài liệu Modal**, máy rảnh trong `scaledown_window` vẫn bị tính tiền ([Cold start](https://modal.com/docs/guide/cold-start), [Pricing](https://modal.com/pricing)).
- **Kiểu tải:**
  - «đơn lẻ»: máy lạnh, chỉ một khách.
  - «cao điểm»: tải khoảng 80% năng lực cửa 8 đoạn, tối đa 100 khách mỗi giờ.

## Chi phí theo pha (cấu hình thử nghiệm: dự phòng 1, chờ tắt 30 s), USD mỗi lượt

| Lượt | Khởi động | Xử lý | Rảnh | Máy chữ | Tổng | Thu hiện tại | Thu/chi |
|---|---|---|---|---|---|---|---|
| Nhanh, 30 s, đơn lẻ | 0,0071 | 0,0021 | 0,0133 | — | 0,0226 | 0,0062 | 0,27 |
| Nhanh, 5 phút, đơn lẻ | 0,0142 | 0,0211 | 0,0282 | — | 0,0636 | 0,0620 | 0,98 |
| Nhanh, 74 phút, đơn lẻ | 0,0142 | 0,3124 | 0,1253 | — | 0,4520 | 0,9176 | 2,03 |
| Kỹ, 30 s, đơn lẻ | 0,0071 | 0,0027 | 0,0133 | 0,0569 | 0,0800 | 0,0078 | 0,10 |
| Kỹ, 74 phút, đơn lẻ | 0,0142 | 0,3947 | 0,1531 | 0,3572 | 0,9192 | 1,15 | 1,26 |
| Nhanh, 30 s, cao điểm | 0,0018 | 0,0021 | 0,0092 | — | 0,0131 | 0,0062 | 0,47 |
| Nhanh, 74 phút, cao điểm | 0,0078 | 0,3124 | 0,0647 | — | 0,3850 | 0,9176 | 2,38 |

Số cho cấu hình hiện tại (dự phòng 2, chờ tắt 60 s) nằm ở [bang-chi-phi.md](bang-chi-phi.md). Ví dụ: một đoạn nhanh 30 s đơn lẻ tốn 0,0528 USD, gấp 2,3 lần cấu hình thử nghiệm.

## Bốn phương án

1. **Chỉ phí tối thiểu mỗi lượt.** Thu = max(thu hiện tại, F). Phí tối thiểu cần, cấu hình thử nghiệm, biên 10 / 20 / 30 / 40%:

   | Lượt | Phí tối thiểu cần (USD) |
   |---|---|
   | Nhanh, 30 s, đơn lẻ | 0,025 / 0,028 / 0,032 / 0,038 |
   | Kỹ, 30 s, đơn lẻ | 0,089 / 0,100 / 0,114 / 0,133 |

   Điểm yếu: video 5–10 phút chạy máy lạnh vẫn chỉ hòa vốn, vì thu hiện tại đã vượt F nên phí tối thiểu không còn tác dụng.

2. **Chỉ hệ số theo độ dài.** Hệ số cần (thay cho 3) ở biên 20%:

   | Lượt | Hệ số cần |
   |---|---|
   | Nhanh đơn lẻ, 30 s / 5 phút / 74 phút | 13,6 / 3,8 / 1,8 |
   | Kỹ đơn lẻ, 30 s / 5 phút / 74 phút | 38,5 / 6,2 / 3,0 |

   Điểm yếu: hệ số phụ thuộc mạnh vào kiểu tải (đơn lẻ hay cao điểm), mà khách không kiểm soát được. Bảng giá theo độ dài sẽ rất dốc ở đầu.

3. **Gói tách nhận dạng và dịch.** Hệ số riêng cho GPU nhận dạng, cộng phí máy chữ theo phút video cho hồ sơ «kỹ». Phí máy chữ cần ở biên 20%:

   | Video «kỹ» | Phí máy chữ (USD/phút) |
   |---|---|
   | 30 s, đơn lẻ | 0,142 |
   | 5 phút | 0,015 |
   | 74 phút | 0,006 |

   Máy chữ có chi phí khởi động cố định khoảng 0,02 USD (45 s L40S) mỗi lần bật. Vì vậy phần này nên thu **cố định mỗi lượt**, không nên thu theo phút.

4. **Kết hợp (đề xuất để Chủ cân nhắc):** thu = **F cố định** + **Fk cố định cho «kỹ»** + giây xử lý × 0,80 × k. Biên thấp nhất qua 20 kịch bản của cấu hình thử nghiệm:

   | Phương án | Biên thấp nhất | Ở kịch bản |
   |---|---|---|
   | Hiện tại (chỉ hệ số 3) | −925% | Kỹ, 30 s, đơn lẻ |
   | F 0,02 + k 3 | −188% | Kỹ, 30 s, đơn lẻ |
   | F 0,03 + kỹ +0,06 + k 2,5 | 13% | Kỹ, 74 phút, đơn lẻ |
   | **F 0,03 + kỹ +0,08 + k 3** | **27%** | Kỹ, 74 phút, đơn lẻ |
   | F 0,05 + kỹ +0,10 + k 2,5 | 17% | Kỹ, 74 phút, đơn lẻ |

   Phương án **F 0,03 USD + 0,08 USD cho «kỹ» + hệ số 3** đạt biên ≥ 27% ở mọi độ dài và kiểu tải trong mô phỏng. Với video nhanh trên 10 phút, giá khách gần như không đổi so với hiện tại. Thay đổi chủ yếu rơi vào đoạn ngắn và hồ sơ «kỹ».

## Độ nhạy và rủi ro

- **Hiệu chỉnh:** mô phỏng ra 1,9× giây máy trên giây xử lý cho phim dài, trong khi đo thật là 2,5×. Nếu chi phí thật cao hơn mô phỏng 1,3 lần, biên của phương án đề xuất giảm như sau:
  - nhanh 74 phút đơn lẻ: 52% → khoảng 38%;
  - **kỹ 74 phút đơn lẻ: 27% → khoảng 5%**;
  - kỹ 74 phút cao điểm: 52% → khoảng 38%.

  Muốn chọn số chính thức thì cần hóa đơn Modal (gói G1–G4, G8).
- **Thông số giả định:** máy chữ bật mất 45 s; mỗi đoạn «kỹ» gửi 4 yêu cầu chữ; tải cao điểm khoảng 80% năng lực.
- **Phần chưa tính:** CPU, RAM, ổ đĩa, băng thông, GPU dự phòng A10 1,10 USD/giờ khi hết L4, và tiền model chữ Alibaba khi máy chữ lỗi.
- **Ảnh hưởng tới khách:** phí cố định làm đoạn rất ngắn đắt hơn tương đối. Cần Chủ quyết cách hiển thị, ví dụ «phí bật máy GPU mỗi lượt».

## Việc của Chủ

Chọn phương án, hoặc yêu cầu đo hóa đơn trước. **Không có thay đổi giá nào trong mã.**

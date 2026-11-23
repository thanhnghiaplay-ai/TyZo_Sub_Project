# Việc tiếp theo (ghi 24/11/2026)

Trạng thái: dịch vụ nhận dạng trên Modal chạy được (lệnh `tyzo-ai`, nhánh `ccr-562e47af-b438ur`). Luồng Kỹ, clip Trung 38 s:
hợp nhất Alibaba lỗi 1,5–4,6 %, hợp nhất Qwen3.8-27B trên GPU lỗi ~5,4 % (sót cụm «我们在摸鱼»); như app hiện nay 21,5 %.
Khách chờ 17–40 s, bật máy ~10–13 s. App web CHƯA gọi dịch vụ này.

## 1. Chất lượng nhận dạng file (Modal)
- [ ] Lớp kiểm chống sót chữ: bản hợp nhất GPU ngắn hơn rõ các bản nghe → hỏi lại Alibaba riêng nhóm đó.
- [ ] Đo đủ 4 thứ tiếng qua Modal (zh2, ja2 làm lại; ko, en của Chủ) bằng `tyzo-ai kiem-tra`, chấm bằng `score.py`.
- [ ] Đo 1–2 video thật ~10 phút: thời gian chờ, tiền mỗi giờ thật.
- [ ] Giảm tiền hướng B: máy nhận dạng đang ngồi chờ máy model chữ (cả hai cùng bị tính). Hiện A rẻ và chính xác hơn → dùng A làm mặc định, B dự phòng.

## 2. Dịch trực tiếp giá rẻ (ưu tiên cho khách công nhân)
- [ ] Groq «cắt câu» trong cầu nối (`scripts/live-bridge.ts`): VAD → Whisper turbo từng câu → model rẻ dịch. Giá gốc ~1.000–2.000đ/giờ (Alibaba ~7.800đ).
- [ ] Modal GPU cho dịch trực tiếp giờ cao điểm: WebSocket, VAD + turbo + lọc bịa, máy bật sẵn theo giờ; lỗi/đang bật máy thì sang Alibaba.
- [ ] Đo độ trễ và độ chính xác ba cách (Alibaba, Groq cắt câu, Modal) trên cùng video. Ứng dụng và web không đổi giao thức.

## 3. Giá (Chủ chốt)
- Hiện: giá Token = 1,8 × giá gốc; hoa hồng 20 % lời, vận hành 15 % doanh thu (`affiliate.ts`).
- Đề xuất: hệ số 2,0 → 2,5 (chỉnh phần trăm chênh ở Admin), tăng từng bước, theo dõi số đơn.
- Ba mức: Tiết kiệm (gói tháng 79.000–129.000đ, Groq), Mượt (~15.000–20.000đ/giờ, Alibaba), Chính xác (~35.000–40.000đ/giờ, Modal).
- Thu tối thiểu mỗi lượt ~1.000–2.000đ. Giữ thuê phòng 99.000đ/30 ngày.
- Đối thủ (tham khảo, giá từ trang hãng): Whisperr ~184.000đ/tháng (gói năm) đến 9,99 USD/tuần; Maestra/Happy Scribe ~169.000–312.000đ mỗi giờ video.

## 4. Nối vào app web
- [ ] Lựa chọn «Chính xác (AI)» ở trang làm phụ đề → gọi dịch vụ Modal → dịch như cũ.
- [ ] Admin: ô địa chỉ dịch vụ + chuỗi bảo vệ (`tyzo-ai` → 10). Trừ Token theo giá gốc thật × hệ số.
- [ ] Điều khoản: thêm Modal (Mỹ) nhận dữ liệu tiếng.

## 5. Đưa lên bản chính
- [ ] Hợp nhánh vào `work`, GỘP các lần lưu (lịch sử có địa chỉ Workspace Alibaba bị lộ).
- [ ] typecheck, lint, test, build; Chủ nói «đẩy chính thức» mới lên `main`.

## Chủ tự làm được ngay
- `tyzo-ai` → 7: đổi chuỗi bảo vệ (đã lộ trong ảnh chụp).
- `rm -rf /opt/tyzo-modal` (bản cũ, không dùng nữa).
- Không dùng thì `tyzo-ai` → 11 → 1 để tắt hẳn.

Câu mở đầu phiên sau: «Đọc eval/asr/luong-ky/VIEC-TIEP-THEO.md và làm mục 1, rồi mục 2».

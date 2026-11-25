# Việc tiếp theo (ghi 24/11/2026)

Bản bàn giao ngày 25/11/2026 và kết quả VPS mới nhất của đợt mục 16–24 nằm ở [bảng bàn giao ASR và dịch](../BAN-GIAO-2026-11-25.md).

Trạng thái: dịch vụ nhận dạng trên Modal chạy được (lệnh `tyzo-ai`, nhánh `ccr-562e47af-b438ur`). Luồng Kỹ, clip Trung 38 s:
hợp nhất Alibaba lỗi 1,5–4,6 %, hợp nhất Qwen3.8-27B trên GPU lỗi ~5,4 % (sót cụm «我们在摸鱼»); như app hiện nay 21,5 %.
Khách chờ 17–40 s, bật máy ~10–13 s. App web CHƯA gọi dịch vụ này.

## 1. Chất lượng nhận dạng file (Modal)
- [ ] Lớp kiểm chống sót chữ: bản hợp nhất GPU ngắn hơn rõ các bản nghe → hỏi lại Alibaba riêng nhóm đó.
- [ ] Đo đủ 4 thứ tiếng qua Modal (zh2, ja2 làm lại; ko, en của Chủ) bằng `tyzo-ai kiem-tra`, chấm bằng `score.py`.
- [ ] Đo 1–2 video thật ~10 phút: thời gian chờ, tiền mỗi giờ thật.
- [ ] Giảm tiền hướng B: máy nhận dạng đang ngồi chờ máy model chữ (cả hai cùng bị tính). Hiện A rẻ và chính xác hơn → dùng A làm mặc định, B dự phòng.

## 1b. Thử Qwen3-ASR thay Whisper (đề xuất ghi 24/11/2026, CHƯA đo)
Số liệu của Alibaba tự công bố, chưa ai đo trên clip của Chủ. Đã viết xong code, chưa chạy trên GPU thật (không có token Modal ở phiên này).
- Code: `modal/qwen_engine.py` (Qwen3-ASR-1.7B/0.6B + Qwen3-ForcedAligner lấy mốc từng chữ, thay mốc Groq/Whisper), nối vào `modal/backend.py`. Luồng có trường `"engine"` trong `cau-hinh.json` thì nhận dạng bằng Qwen; luồng thử: `qwen` (như ky), `qwen-nhanh` (như nhanh), `qwen-0.6b-nhanh`.
- Qwen3-ASR không trả độ tin cậy từng câu, nên avg_logprob/no_speech_prob là số giữ chỗ (-0,3 / 0). Hai bản của một nhóm cùng ra từ Qwen sẽ giống nhau hơn bản Whisper, nên cần xem lớp hợp nhất còn hữu ích không.
- Cách đo: `tyzo-ai` đặt `QWEN_PRELOAD=1` rồi Cập nhật (nạp sẵn model, bật máy chậm thêm), sau đó
  `python3 eval/asr/luong-ky/modal/so_sanh_asr.py <thư mục có zh2.mp4 ja2.mp4 ko.mp4 en.mp4> 3`
  (mỗi luồng chạy 3 lần, chấm bằng `score.py`, so với «nhanh»/«ky» Whisper). Kết quả: `ket-qua/so-sanh-qwen-asr.json`.
- Còn lại: đo thời gian và VRAM trên L4 (1.7B bf16 + aligner + Demucs + SepFormer cùng một máy), kiểm tra qwen-asr ghim transformers==4.57.6 không vướng gói khác, quyết định có thêm Fun-ASR / Cohere Transcribe vào so sánh không. Phần dịch chưa tìm.

## 1c. So sánh test và xem srt (thêm 24/11/2026)
- `tyzo-ai` → **14. So sánh test**: chạy TẤT CẢ luồng trong `cau-hinh.json` (thêm luồng mới là tự được so) trên clip `zh ja ko en` (chép vào `/opt/tyzo-ai/mau-test/`; `zh2`/`ja2` là bản dựng lại, Chủ không còn nên không cần. Lưu ý: `zh`, `ja` gốc đọc sai nên lỗi tuyệt đối cao, chỉ dùng để xếp hạng các luồng với nhau), chấm bằng `score.py`, in bảng từng clip + XẾP HẠNG (lỗi gộp, giây xử lý, câu rác, USD/giờ phim) và chỉ ra luồng tốt nhất; luồng chênh dưới 4 điểm coi như ngang nhau, trong nhóm đó nêu luồng rẻ nhất và nhanh nhất. Luồng lỗi thì ghi lại rồi đi tiếp. Lệnh nhanh: `tyzo-ai so-sanh [thư mục] [số lần] [luồng,..|all]`.
- `tyzo-ai` → **15. Xem srt test**: xem phụ đề từng luồng (lần ít lỗi nhất) đặt cạnh đáp án. Lệnh nhanh: `tyzo-ai xem-srt [clip] [luồng]`.
- Kết quả ở `/opt/tyzo-ai/test/` (`so-sanh-test.json`, `so-sanh-test-xep-hang.json`, `srt-test/`, `lan-cuoi.txt`), không bị «Cập nhật» xóa.
- Cần cài lại một lần (mục 3. Cập nhật) để VPS có bản mới. Thư viện chấm điểm tự cài ở lần chạy đầu.

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

# Kế hoạch thử nghiệm ASR: nhanh hơn nhưng không giảm chất lượng

Tài liệu này là kế hoạch thực hiện cho bộ đánh giá ASR. Không dùng kết quả của model làm đáp án chuẩn.

## Mục tiêu

Chọn được 3 preset có số đo rõ ràng:

- **Nhanh:** thời gian và chi phí thấp, dùng cho video dễ nghe/live.
- **Cân bằng:** preset mặc định của ứng dụng.
- **Kỹ:** chỉ dùng khi đoạn khó hoặc người dùng yêu cầu chất lượng cao.

## Giai đoạn 1 — làm sạch dữ liệu chuẩn

Mỗi clip phải có:

- âm thanh gốc;
- ngôn ngữ và thể loại;
- SRT đáp án do người biết ngôn ngữ duyệt;
- mốc bắt đầu/kết thúc đã kiểm tra;
- glossary nếu có;
- trạng thái `referenceStatus: approved`.

Không dùng các file có trạng thái “chưa duyệt tay” để xếp hạng model. Các file đó chỉ dùng để kiểm tra lỗi kỹ thuật.

Bộ tối thiểu trước khi kết luận:

- 3 clip tiếng Trung;
- 3 clip tiếng Nhật;
- 3 clip tiếng Hàn;
- 3 clip tiếng Anh;
- mỗi ngôn ngữ có ít nhất một clip sạch, một clip có nhạc nền và một clip nhiều người nói/chồng tiếng.

## Giai đoạn 2 — đo từng lớp riêng

Không đánh giá cả pipeline bằng một điểm duy nhất. Ghi riêng:

1. **ASR:** CER/WER, bỏ lời, chèn chữ, chữ bịa/lặp, sai ngôn ngữ.
2. **Mốc thời gian:** độ lệch start/end, câu chồng, câu quá dài.
3. **Dịch:** đúng nghĩa, tên riêng, xưng hô, glossary, câu bị thiếu/thêm.
4. **Vận hành:** thời gian từng bước, cold start GPU, lỗi/retry, VRAM và chi phí.

Khi so sánh các bộ dịch, phải dùng cùng một kết quả ASR. Khi so sánh ASR, phải dùng cùng một bộ dịch hoặc chưa dịch.

## Giai đoạn 3 — ma trận chạy

Chạy theo thứ tự rẻ trước:

| Mã | Luồng | Mục đích |
|---|---|---|
| F1 | VAD → ASR nhanh → lọc lỗi | mốc tốc độ cơ bản |
| B1 | VAD → ASR chất lượng → căn mốc → lọc lỗi | preset mặc định |
| K1 | tách giọng → VAD → nhiều ASR → hợp nhất toàn bộ | mốc chất lượng cao |
| K2 | ASR nhanh + ASR chất lượng → chỉ hợp nhất đoạn bất đồng | ứng viên tối ưu |
| K3 | K2 + chạy lại đoạn có dấu hiệu lỗi | ứng viên chính xác |

Ưu tiên K2/K3. Không hợp nhất toàn bộ video nếu các model đã đồng ý ở phần lớn câu.

Một đoạn được đưa vào nhóm “cần kiểm tra” nếu có một trong các dấu hiệu:

- hai ASR khác nhau sau khi chuẩn hóa;
- có từ trong glossary/tên riêng;
- câu quá ngắn hoặc quá dài bất thường;
- có khoảng trống bất thường trong vùng có tiếng nói;
- điểm tin cậy thấp;
- có lặp câu, hallucination hoặc sai ngôn ngữ.

## Giai đoạn 4 — cách chấm và chọn preset

Mỗi cấu hình chạy ít nhất 3 lần trên clip ngắn và 1 lần trên video dài. Lưu cả trung bình và lần tệ nhất.

Điểm xếp hạng ban đầu:

```text
điểm tổng = 50% chất lượng ASR
           + 20% chất lượng dịch
           + 20% tốc độ
           + 10% chi phí
```

Nhưng cấu hình bị loại ngay nếu:

- có hallucination nghiêm trọng;
- bỏ nhiều lời hơn ngưỡng cho phép;
- lỗi hoặc timeout không xử lý được;
- chi phí vượt giới hạn preset.

Ngưỡng khởi đầu để điều chỉnh sau khi có dữ liệu:

- Nhanh: hoàn thành dưới 0,5 lần thời lượng video;
- Cân bằng: dưới 1,5 lần thời lượng video;
- Kỹ: dưới 4 lần thời lượng video;
- retry không quá 5%;
- không có câu bịa ở đoạn im lặng được đánh dấu.

## Giai đoạn 5 — quyết định đưa vào app

Chỉ đưa preset vào ứng dụng sau khi:

1. có ít nhất 12 clip đã duyệt;
2. chạy được cả clip ngắn và video dài;
3. có kết quả lặp lại ổn định;
4. đã đo chi phí thật trên GPU/provider;
5. có fallback khi GPU/provider lỗi;
6. kết quả K2/K3 tốt hơn B1 đủ rõ ràng so với phần chi phí tăng thêm.

## Việc đã biết còn thiếu trong repo

- `eval/asr/cases.json` hiện mới có một clip và đáp án chưa duyệt tay;
- `scripts/asr-eval.mjs` đang chứa dữ liệu mẫu cố định, không nên dùng làm bộ xếp hạng chính;
- luồng Kỹ hiện là thử nghiệm riêng, chưa nằm trong app;
- tốc độ và chất lượng dịch chưa được đo chung trong báo cáo ASR.

Vì vậy bước đúng tiếp theo là bổ sung dữ liệu chuẩn và báo cáo chạy; chưa nên tự động chọn model dựa trên kết quả hiện tại.

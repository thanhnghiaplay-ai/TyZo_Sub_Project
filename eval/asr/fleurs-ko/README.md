# Bộ đo tiếng Hàn đọc thành tiếng

Nguồn là Google FLEURS, cấu hình `ko_kr`, tập `test`, giấy phép CC BY 4.0. Khi chia sẻ mẫu, ghi công Google FLEURS, liên kết nguồn và giấy phép, ghi rõ việc chọn tập con và chuẩn hóa văn bản. [Dataset card](https://huggingface.co/datasets/google/fleurs) · [Giấy phép](https://creativecommons.org/licenses/by/4.0/)

Trên VPS, chọn mục **25** khi menu đã có mục này. Dữ liệu được giữ ở `/opt/tyzo-ai/test/fleurs-ko`. Mở lại mục 25 để kiểm tra mã băm 8 WAV đã lưu mà không gọi mạng hoặc GPU. Muốn chạy riêng từ gốc kho, dùng lệnh sau trên Linux có Bash, curl, flock, Python 3. Công cụ đọc WAV PCM và IEEE float bằng thư viện chuẩn Python.

```bash
bash eval/asr/fleurs-ko/prepare-set.sh eval/asr/out/fleurs-ko
```

Công cụ chọn trước 4 dòng MALE rồi 4 dòng FEMALE, theo ID câu tăng dần và tên WAV khi trùng ID. Mỗi ID chỉ xuất hiện một lần. Nhãn giới tính giúp phân bố mẫu, chưa xác nhận số người nói khác nhau. Công cụ kiểm tra số mẫu, WAV mono 16 kHz và ghi SHA-256 từng WAV. Manifest lưu lời nguyên văn, bản chép của FLEURS và đáp án để tính CER. Đích đã có sẽ được giữ để tái sử dụng.

Khi đo, đối chiếu kết quả VPS đã lưu theo SHA-256 WAV, cấu hình model và profile. Dùng cùng 8 WAV, ngôn ngữ ko cho nhanh và ky. Chuẩn hóa cả dự đoán và tham chiếu bằng hàm normalize (NFC, casefold, chỉ giữ chữ và số). Tính CER bằng tổng khoảng cách Levenshtein chia tổng độ dài tham chiếu. Giữ lỗi, thời gian từng câu và ghi rõ chi phí ước tính hoặc thực trả. Chỉ so sánh sau khi cả hai luồng đủ mẫu.

[Bản tham chiếu ghi lại từ ảnh VPS](manifest-vps.json) lưu ID, tên WAV, lời tham chiếu và SHA-256 của 8 mẫu. Dùng manifest sinh trực tiếp trên VPS khi chấm để tránh sai lệch do chép từ ảnh.

### Chấm bản chép đã lưu

Với mỗi kết quả VPS khớp đúng WAV và ngôn ngữ Hàn, ghi một dòng JSON có `profile` (nhanh hoặc ky), `config_id` (phiên bản model và cấu hình thực chạy), `sha256` của WAV đầu vào và `text` (lời máy chép, có thể rỗng). Giữ số liệu thời gian, chi phí và tệp đầu ra gốc cạnh JSONL. Dùng một cấu hình nhất quán cho từng profile. Tệp JSONL rỗng cho danh sách toàn bộ ID còn thiếu.

```bash
python3 eval/asr/fleurs-ko/score.py "$manifest" "$predictions_jsonl"
```

Kết quả ghi ra stdout, gồm lời tham chiếu, lời máy chép, số lỗi ký tự từng câu và các ID còn thiếu. CER của mỗi profile chỉ xuất hiện khi đủ 8 WAV.

### Đo cả hai luồng qua VPS

Chọn mục **26** sau khi mục 25 đã chuẩn bị mẫu. Nhập mã phiên bản đang chạy trên Modal. Nếu chỉ có tên đợt triển khai nội bộ, dùng một nhãn duy nhất cho đúng lần triển khai đó và ghi lại nhãn. Dùng nhãn mới khi triển khai lại hoặc đổi cấu hình máy chủ.

Mục 26 đọc manifest gốc, kiểm mã băm WAV và báo số bản chép khớp cấu hình cùng số lượt còn thiếu. Nhập `c` để gửi phần còn thiếu lên Modal, tối đa 16 yêu cầu nếu cache trống. Nhập `k` để dừng sau khi kiểm tra. Mỗi phản hồi thành công được lưu thành một JSON riêng trong thư mục `asr/<config_id>/` ngay cạnh manifest. Giữ nguyên mã phiên bản khi chạy tiếp. Nếu mất kết nối trước khi lưu phản hồi, lượt đó vẫn có thể đã được Modal tính tiền.

Khi đủ kết quả, `report.json` lưu CER và lỗi từng câu. Các JSON phản hồi lưu thời gian xử lý, thời gian chờ và chi phí ước tính từng WAV. Chi phí dùng thời gian xử lý nhân đơn giá GPU cộng chi phí model chữ được server báo. Hóa đơn thực tế có thể khác. Kết quả cũ mang tên clip `ko` thiếu bằng chứng khớp SHA-256 và cấu hình nên không được tính vào lượt FLEURS.

### Thử dịch Hàn sang Việt từ bản chép đã lưu

[Bộ 8 câu thử dịch](ko-vi-cases.json) có SHA-256, số lỗi ASR và đáp án Việt tạm soạn từ câu Hàn chuẩn. Đáp án Việt chờ rà soát song ngữ. Nguồn và giấy phép như trên. Ghép từng mẫu theo SHA-256 với `results.nhanh.clips` trong báo cáo thật trên VPS và đối chiếu ID. Lấy `text` làm đầu vào dịch và `reference` làm câu chuẩn. Khi đo, gửi từng câu độc lập và giữ nguyên bản chép. Có thể dịch thêm câu chuẩn bằng cùng cấu hình để xác định lỗi bắt đầu từ ASR hay bước dịch.

- 1662 và 1663 có câu chào thừa “다음 영상에서 만나요.” trong bản chép cả hai luồng. Kiểm tra câu này có lọt vào bản dịch hay không.
- 1663 có tên Cochamó xuất hiện bằng chữ Hàn và Latin trong đáp án. Khi duyệt bản Việt, một lần viết đúng địa danh là đủ.
- 1660 kiểm tên Goethe, Fichte, Schlegel. 1673 kiểm số 13 bang và tên Các Điều khoản Hợp bang. 1674 kiểm phân biệt một phút với vài phút.

### Mục 29 · xem riêng ID 1673 (CPU, chỉ đọc)

[`xem-1673.py`](xem-1673.py) đọc báo cáo mục 26 mới nhất có ID 1673 ở cả hai luồng, đối chiếu SHA-256 và `config_id`, rồi in câu Hàn chuẩn, bản chép nhanh và ky, từng lỗi ký tự kèm vị trí so với cụm 연합 규약 (Các Điều khoản Hợp bang), các đoạn có mốc thời gian, và bản dịch đã lưu ở `dich-ko-vi/1673-*.json`. Công cụ dừng nếu số lỗi tính lại khác báo cáo. Không gửi yêu cầu Modal.

Đọc kết quả theo hai câu hỏi: (1) bản chép còn giữ 연합 규약 hay đã thành từ khác, ví dụ một từ mang nghĩa thương mại như 교역/통상/무역 hoặc 연방; (2) bản dịch hiểu 우선 (“trước hết/ban đầu”) thành “ưu tiên”. Nếu bản chép đã giữ đúng cụm mà bản dịch vẫn sai, lỗi nằm ở bước dịch; khi đó mới cần dịch riêng câu Hàn chuẩn của 1673.

### Mục 30 · dịch câu Hàn chuẩn của 1673

`xem-1673.py --dich-chuan` lấy câu Hàn chuẩn của 1673 từ cùng báo cáo, dùng đúng lời nhắc, model và tham số của mục 27, lưu thành `dich-ko-vi/1673-chuan-<sha>.json`. Nếu chưa có bản lưu, công cụ hỏi `c/k` trước khi gửi đúng 1 yêu cầu Modal chữ. Chạy lại sẽ dùng bản đã lưu. Kết quả in cạnh bản dịch từ bản chép nhanh và đáp án Việt tạm. Mục này trả lời câu hỏi: khi đầu vào đúng 연합 규약, bước dịch có còn biến 우선 thành “ưu tiên” không.

### Mục 31 · bộ lọc tự động câu chào bịa (CPU)

[`luong-ky/loc_chao.py`](../luong-ky/loc_chao.py) bỏ một đoạn khi cả đoạn đúng bằng một câu chào kết video trong danh sách (Hàn, Nhật, Trung, Anh), phía sau còn lời, và đoạn đó là đoạn đầu hoặc chồng thời gian lên đoạn kế. Đoạn cuối bài luôn được giữ vì có thể là lời chào thật; câu dài chứa cụm chào cũng được giữ. `pml.run` áp dụng bộ lọc trước khi trả kết quả và ghi các đoạn đã bỏ vào `stats.bo_chao`. Mục 31 ([`loc-chao.py`](loc-chao.py)) chạy cùng quy tắc trên mọi đoạn đã lưu của cả hai luồng, không chọn tay như mục 28, rồi in đoạn bị bỏ và CER trước/sau.

Bộ lọc chỉ có hiệu lực trên Modal sau khi cập nhật bằng mục 3. Mã cấu hình của mục 26 dựa trên nhãn triển khai người vận hành nhập, không dựa trên code; khi đo lại sau cập nhật, nhập nhãn mới để không dùng lại phản hồi cũ.

### Mục 32 · dịch có chủ đề và bảng thuật ngữ

[`dich-ngu-canh.py`](dich-ngu-canh.py) dịch 8 bản chép nhanh (đã qua bộ lọc câu chào) và câu Hàn chuẩn 1673 theo ba cách: `goc` (lời nhắc mục 27), `ngucanh` (lời nhắc chung về lỗi nghe máy + chủ đề video), `thuatngu` (thêm bảng thuật ngữ). Chủ đề và thuật ngữ ở [`ko-vi-ngu-canh.json`](ko-vi-ngu-canh.json), viết như tiêu đề video và danh sách tên riêng mà người dùng có thể nhập. Lời nhắc không chứa gợi ý riêng cho lỗi đã biết. Mỗi bản dịch được kiểm bằng danh sách từ bắt buộc/cấm; đây là kiểm tra thô, vẫn cần đọc bản dịch. Trên VPS đã có mục 27 và 30, mục 32 cần thêm 16 yêu cầu Modal chữ và hỏi `c/k` trước khi gửi.

Đối chiếu nghĩa, tên riêng, số liệu và độ tự nhiên theo từng ID. Ghi rõ khi một lỗi bắt đầu từ bản chép. Các câu FLEURS độc lập nên cần bài riêng để đánh giá hội thoại hoặc chia phụ đề.

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

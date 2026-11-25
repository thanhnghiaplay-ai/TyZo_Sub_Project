# Bộ đo tiếng Hàn đọc thành tiếng

Nguồn là Google FLEURS, cấu hình `ko_kr`, tập `test`, giấy phép CC BY 4.0. Khi chia sẻ mẫu, ghi công Google FLEURS, liên kết nguồn và giấy phép, ghi rõ việc chọn tập con và chuẩn hóa văn bản. [Dataset card](https://huggingface.co/datasets/google/fleurs) · [Giấy phép](https://creativecommons.org/licenses/by/4.0/)

Từ gốc kho, trên máy có quyền đọc Hugging Face, dùng cache ngoài Git. Giữ nguyên tệp revision để tái lập cùng lượt.

```bash
set -eu
cache=eval/asr/out/fleurs-ko
mkdir -p "$cache"
if [ ! -s "$cache/revision" ]; then
  curl -fsSL https://huggingface.co/api/datasets/google/fleurs/revision/main -o "$cache/info.json"
  python3 -c 'import json,re,sys; s=json.load(open(sys.argv[1]))["sha"]; assert re.fullmatch("[a-f0-9]{40}",s); print(s)' "$cache/info.json" > "$cache/revision"
fi
rev=$(cat "$cache/revision")
base="https://huggingface.co/datasets/google/fleurs/resolve/$rev/data/ko_kr"
for file in test.tsv audio/test.tar.gz; do
  dest="$cache/$rev-${file##*/}"
  if [ ! -s "$dest" ]; then
    curl -fL --retry 2 "$base/$file" -o "$dest.part" && mv "$dest.part" "$dest"
  fi
done
python3 eval/asr/fleurs-ko/prepare.py "$cache/$rev-test.tsv" "$cache/$rev-test.tar.gz" "$cache/set-$rev" "$rev"
```

Công cụ chọn trước 4 dòng MALE rồi 4 dòng FEMALE, theo ID câu tăng dần và tên WAV khi trùng ID. Mỗi ID chỉ xuất hiện một lần. Nhãn giới tính giúp phân bố mẫu, chưa xác nhận số người nói khác nhau. Công cụ kiểm tra số mẫu, WAV mono 16 kHz và ghi SHA-256 từng WAV. Manifest lưu lời nguyên văn, bản chép của FLEURS và đáp án để tính CER. Đích đã có sẽ được giữ để tái sử dụng.

Khi đo, đối chiếu kết quả VPS đã lưu theo SHA-256 WAV, cấu hình model và profile. Dùng cùng 8 WAV, ngôn ngữ ko cho nhanh và ky. Chuẩn hóa cả dự đoán và tham chiếu bằng hàm normalize (NFC, casefold, chỉ giữ chữ và số). Tính CER bằng tổng khoảng cách Levenshtein chia tổng độ dài tham chiếu. Giữ lỗi, thời gian từng câu và ghi rõ chi phí ước tính hoặc thực trả. Chỉ so sánh sau khi cả hai luồng đủ mẫu.

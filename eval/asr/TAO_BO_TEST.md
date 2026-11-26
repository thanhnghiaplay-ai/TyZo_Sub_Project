# Bộ test tự động 4 ngôn ngữ

Dùng `scripts/tao-bo-test.py` để tải FLEURS (giọng người thật, transcript chuẩn) và tạo bộ test audio/video cho `tyzo-ai`.

## Chạy trên VPS

```bash
cd <thu-muc-repo>
python3 -m venv .venv-eval
. .venv-eval/bin/activate
python -m pip install -U datasets soundfile
python scripts/tao-bo-test.py --out eval/asr/luong-ky/mau-test-fleurs --per-lang 3
```

Nếu VPS có ffmpeg, script sẽ tạo thêm MP4. Nếu không có, benchmark vẫn dùng WAV.

Sau đó chạy:

```bash
TYZO_TEST_DIR="$PWD/eval/asr/luong-ky/mau-test-fleurs" \
TYZO_TEST_OUT="$PWD/eval/asr/luong-ky/ket-qua-fleurs" \
ASR_REPEAT=3 \
bash deploy/vps/benchmark-gpu.sh
```

## Dữ liệu

- `en`, `cmn` (Trung phổ thông), `jpn`, `kor` từ FLEURS.
- Transcript được lấy từ dataset, không lấy kết quả của model làm đáp án.
- `manifest.json` lưu source, license, transcript và trạng thái.
- Đây là benchmark giọng đọc có kiểm duyệt dữ liệu, chưa đại diện hoàn toàn cho phim có nhạc nền/chồng giọng.

Bộ video người thật từ phim thương mại không được tự tải vì vấn đề bản quyền. Có thể bổ sung sau khi có nguồn được cấp phép.

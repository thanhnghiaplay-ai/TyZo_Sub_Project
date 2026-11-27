# RE3-002 (P0) — Dự toán audio phải là cận trên đã xác minh

## Nguyên nhân gốc
`audioSecondsEstimate` (baseline run-gate.ts 104–125) giữ trước theo `size/2000` cho mọi định dạng nén và tin `byteRate` ở byte 28 của WAV. Với Opus bitrate thấp (im lặng, DTX/VBR) dung lượng nhỏ hơn nhiều so với độ dài → giữ thiếu; quyết toán bị chặn ở phần giữ (RE2-002) → phần vượt không thu được (thiếu tiền), hoặc phải ghi đối soát. WAV khai byteRate giả → ước ≈ 0 giây.

## Bằng chứng TRƯỚC
- `re3-002-before-probe.log`: 6/10 FAIL — Opus 3 byte/gói: **13,6 s / 60 s thật**; gói 120 ms: **20,2 s / 600 s**; WAV header giả: **0,00024 s / 30 s**; mp3/rác vẫn ra số (100 s) thay vì từ chối.
- Bộ mã hóa thật (`re3-002-real-encoder.log`, libopus qua ffmpeg, đối chiếu ffprobe): 6 kbit/s **18,0 s / 37,0 s**; im lặng **36,6 s / 120 s**.
- Chính đường của app (`re3-002-chromium-encoder-3.log`, WebCodecs AudioEncoder 20 kbit/s trong Chromium → `buildOpusWebm` của app): im lặng **20,4 s / 90 s** (mã cũ); tiếng sin 43,0 s / 30 s (dư).

## Sửa
- `src/lib/billing/audio-probe.ts`: bộ dò không giải mã, có giới hạn (≤400.000 gói, ≤1.000.000 phần tử EBML):
  - WAV: duyệt chunk RIFF; PCM/float hợp lệ; `byteRate = sampleRate × blockAlign`; độ dài theo phần `data` có thật.
  - WebM/Matroska Opus: đúng 1 track `A_OPUS`; SimpleBlock/BlockGroup; lacing Xiph/cố định/EBML; cluster kích thước không rõ; cộng thời lượng từng gói theo TOC RFC 6716 (gói rỗng = 120 ms).
  - Ogg Opus: một luồng, OpusHead/OpusTags, ghép lacing; không tin granule.
  - Định dạng khác → không xác minh.
- `run-gate.ts`: `audioSecondsEstimate` → `number | null`; null ⇒ **422 trước khi giữ và trước khi gọi nhà** (fail closed). Không còn fallback theo dung lượng.
- `codec.ts`: export `buildOpusWebm`, `toWav` (cho test; hành vi không đổi).
- `run-gate.test.ts`: hai fixture cũ (7,2 MB số 0; WAV thiếu `fmt`) không phải audio → thay bằng WebM 3.600 s và WAV 60 s hợp lệ; **số tiền kỳ vọng giữ nguyên** (2000; 34). Thêm test 422/không giữ/không gọi.
- Không đổi giá, quy Token, làm tròn.

## SAU
| Nhãn | Kết quả |
|---|---|
| `re3-002-after-probe-2` | 15/15 (WAV/WebM của app, Opus thấp, 120 ms, header giả, cụt, LIST, rác/multipart hỏng/không file → null, 25 MB < 2 s và < 200 MB RSS, cluster không rõ, lacing ×3, nhiều track/codec lạ, Ogg granule sai/cụt, bảng TOC) |
| `re3-002-real-encoder` | 4/4 khớp ffprobe ±20 ms (webm 6k, ogg im lặng, wav, webm 120 s) |
| `re3-002-chromium-encoder-3` | 2/2: 30,02/30 và 90,02/90 qua đúng bộ đóng gói app |
| `re3-002-after-related` | 97/97 (run-gate, audio-probe, re2-regression, gate-reserve, upstream-outcome, async-asr, backend-audit, request-body; PG thật) |

## Rủi ro còn lại / giới hạn
- Định dạng ngoài WAV/WebM-Opus/Ogg-Opus bị từ chối ở cửa nhận dạng. App chỉ gửi hai dạng đầu (`packAudio`); client tự viết khác sẽ nhận 422.
- Chưa đo với Groq thật; bộ dò không giải mã nên không phát hiện gói Opus có nội dung hỏng (chỉ TOC) — cận trên vẫn đúng vì TOC quyết định số mẫu.
- Dự toán token chữ đầu vào cho chat vẫn là `byteLength/3` (ngoài phạm vi RE3-002; quyết toán vẫn theo usage thật, chặn ở phần giữ). Ghi để kiểm sau.
- Trạng thái: **PASS fixture + bộ mã hóa thật; PARTIAL (chưa nhà thật/staging)**.

## Rollback
Revert commit checkpoint 2 (không có migration). Lưu ý revert mở lại lỗi giữ thiếu.

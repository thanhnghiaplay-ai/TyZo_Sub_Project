# Bộ đo nhận dạng giọng nói (ASR)

Mục đích: biết chắc prompt/cấu hình nhận dạng có làm Whisper bỏ lời, bịa chữ hay lệch ngôn ngữ không, thay vì đoán bằng tay.
Chấm điểm nằm ở `src/lib/sub/asr-score.ts` (thuần, có test). Công cụ dòng lệnh: `scripts/asr-bench.ts`.

## 1. Chấm một file SRT (không cần mạng, nhà cung cấp nào cũng được)
Xuất SRT chép thô từ app (bản gốc, chưa dịch) rồi:

    npm run asr:score -- file.srt --lang zh --ref dap-an.srt --duration 34

Không có `--ref` vẫn chấm được bằng dấu hiệu bỏ lời, ảo giác, lệch ngôn ngữ. Mã thoát 1 nếu HỎNG.

## 2. Chạy thật với Groq, so biến thể prompt × model

    GROQ_API_KEY=... npm run asr:bench -- --models whisper-large-v3,whisper-large-v3-turbo --variants default,noprompt,noguard,guard

Cần ffmpeg. Biến thể: `default` (đúng như app gửi), `noprompt`, `noguard` (chỉ tên phim + thuật ngữ), `guard` (ép thêm ASR_GUARD như phim 18+). Báo cáo JSON ghi vào `eval/asr/out/` (không vào git). Thoát mã 1 nếu `default` HỎNG, nên gắn được vào lịch chạy định kỳ.
Chỉ lấy 60 giây đầu của mỗi clip (một đoạn như app). Chấm trên câu thô của Whisper, chưa qua bộ lọc của app.

## 3. Đổi kết quả đo thành điểm model (cho «Dựng gói tự động»)
Điểm trong `src/lib/sub/model-grade.ts` phần lớn là số ước lượng. Sau khi có báo cáo ở `eval/asr/out/`:

    npm run asr:grade            # chỉ in điểm đo
    npm run asr:grade -- --write # ghi src/lib/sub/model-grade-measured.ts, đè lên số ước lượng

Quy tắc (`src/lib/sub/grade-measure.ts`): chỉ lấy biến thể `default`, chỉ clip có đáp án (`reference`). `quality` = trung bình mọi clip, `asian` = trung bình clip zh/ja/ko; sai khác 0% được 10 điểm, từ 50% trở lên 0 điểm. Mỗi điểm cần từ 3 clip, thiếu thì giữ số ước lượng. Chỉ đo độ chính xác nhận dạng; tốc độ và chất lượng dịch vẫn là ước lượng. Hiện `asr:bench` chỉ chạy Groq Whisper, các nhà khác (Deepgram, AssemblyAI, Speechmatics, Soniox, Alibaba) chưa có đường đo.

## Thêm clip mới
1. Bỏ âm thanh vào `eval/asr/audio/` (không đưa vào git).
2. Thêm một mục vào `cases.json` (`id`, `audio`, `lang`, `genre`, `title`, `gloss`, `reference`).
3. Đáp án phải do NGƯỜI rành ngôn ngữ duyệt; ghi vào `referenceStatus` nếu chưa duyệt.
Nên có đủ: thoại có nhạc nền, thoại yên tĩnh, câu dài, phim 18+ (thể loại `sex`/`softcore`), tiếng Nhật, Hàn, Anh.

## Dữ liệu mẫu `tieu-hoa-thuong/` (clip 34 giây, large-v3 trừ file turbo)
- `ref-noprompt-11.srt`: đáp án tạm = kết quả không prompt, 11 câu (CHƯA duyệt tay; chữ cuối «后天/后点» còn nghi).
- `turbo-11.srt`: whisper-large-v3-turbo trên v5.17.6, 11 câu.
- `chunk15-6.srt`: cắt đoạn 15 giây có prompt: ảo giác + mất lời.
- `noprompt-chunk15-13.srt`: không prompt + cắt 15 giây: 13 câu nhưng lặp/vụn.
Nhãn gán theo nội dung file Chủ gửi (tên file gốc trùng nhau), không phải theo nhãn Chủ ghi.

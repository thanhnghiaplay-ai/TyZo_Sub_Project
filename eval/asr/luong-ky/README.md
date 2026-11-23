# Luồng nhận dạng nhiều lớp (thử nghiệm 23/11/2026)

Thử nghiệm của Claude theo yêu cầu Chủ: «tạo chuỗi luồng xử lý để Whisper Turbo nhận dạng chuẩn từng chữ», rồi «dùng hết khả năng để giảm tỉ lệ lỗi thấp nhất, độ trễ thấp nhất» trên bộ video thử 4 thứ tiếng của Chủ.
Đây là code thử (Python) để đo, CHƯA nằm trong app. Không đổi hành vi app, không đổi điều khoản.

## 1. Kết quả

Tỉ lệ lỗi chữ (tiếng Anh: lỗi từ). Không chấm hai câu `[La hét]` và `[Rên rỉ]` vì giọng đọc thật ra có nói chữ ở đó (ví dụ «my stomach hurts»), chỉ ghi riêng luồng ra chữ gì ở vùng ấy.

| Luồng | Trung* | Nhật* | Hàn | Anh | Thời gian cho clip 30 giây |
|---|---|---|---|---|---|
| Như app hiện nay (turbo, một lần) | 21,5% | 15,7% | 28,2% | 34,4% | ~1 s |
| large-v3 thay turbo | 17,7% | 16,3% | 25,4% | 36,7% | ~1 s |
| Nhanh (không tách giọng, 2 bản) | 14,6% | 15,1% | 36,6% | 26,7% | ~5 s |
| **Cân bằng** | 12,3% | 14,5% | 21,8% | 26,7% | ~20–25 s |
| **Kỹ** | **2,3%** | **9,0%** (6,4% nếu bỏ khác kanji/kana) | **19,7%** | 26,7% | ~55–60 s |

\* Trung và Nhật chấm trên clip LÀM LẠI (`remake.py`, giọng Qwen TTS, cùng kịch bản và cùng bẫy). Clip gốc của Chủ dùng giọng Kokoro phát âm sai: cùng câu đáp án đọc bằng giọng Qwen không nhạc thì turbo chỉ sai 2,3% (Trung) và 8,4% (Nhật); trên clip gốc, luồng Kỹ vẫn sai 67,7% (Trung) và 90,4% (Nhật), vì lỗi nằm trong tiếng. Cần thay hai clip đó bằng giọng thật hoặc TTS tốt.

Luồng Kỹ không ra chữ ở chỗ im lặng hay chỉ có nhạc; ở vùng tiếng hét, rên chỉ còn câu có lời thật hoặc gần thật («My stomach hurts», «누아야 왜요»). «Như app» ra chữ ở vùng hét, rên ở cả 4 thứ tiếng (ví dụ «까아 까아», «别忘了»). Số đầy đủ và chữ ra của từng luồng: `ket-qua/tong-hop.json`. Phụ đề luồng Kỹ: `ket-qua/*_luong_ky.srt`.

Thử 1 (clip kiếm hiệp 133 giây tiếng Trung, `thu-1-kiem-hiep/`): như app 27,7% có một câu bịa «请不吝点赞 订阅 转发…» 30 giây; luồng nhiều lớp 11,6%, không bịa.

## 2. Luồng Kỹ (`pml.py`, hàm `run`)

1. **Tách giọng Demucs** (htdemucs, CPU), rồi **Silero VAD** trên phần giọng (dùng chung model `public/models/silero_vad.int8.onnx` của app). Gộp câu gần nhau thành nhóm ≤ 25 s để Whisper có ngữ cảnh.
2. **Dò khoảng trống**: Demucs XÓA giọng thì thầm (coi là tiếng ồn), nên mọi khoảng VAD bỏ qua ≥ 1 s được gửi lại 6 bản (gốc, cân âm lượng, lọc giọng, dải 1,5–7 kHz; turbo và large-v3). Chỉ nhận khi các bản khớp nhau.
3. **Turbo × 4 bản tiếng** mỗi nhóm: gốc; giọng đã tách và đưa mỗi câu về cùng độ to (cứu câu thì thầm); lọc giọng kiểu app; giọng làm chậm 0,85. Nhóm mà các bản khác nhau (> 0,12) gọi thêm large-v3 hai bản.
4. **Lọc bịa**: danh sách câu bịa từng thứ tiếng (`BAIT`, `HALLU_ONLY`: «感谢观看», «优优独播剧场», «감사합니다», «ご視聴ありがとうございました», «Thank you»…), chỉ số `compression_ratio` > 2,4, `no_speech_prob` > 0,6 kèm `avg_logprob` < -0,8.
5. **Tách hai người nói SepFormer** (speechbrain/sepformer-libri2mix) trên từng đoạn VAD ≥ 1 s; khi hai kênh cùng to ≥ 0,8 s thì thêm lời từng người làm ứng viên. Lấy lại câu nói chồng mà Whisper luôn bỏ (Trung 12,3% → 2,3%). Không tách được hai giọng cùng âm sắc (clip Hàn làm giọng nam bằng đổi cao độ giọng nữ).
6. **Hợp nhất bằng model chữ**: Qwen4-Max (Alibaba) gọi 3 lần song song, lấy bản ở giữa (giống hai bản kia nhất). Model nhận mọi ứng viên kèm cách đọc (pinyin cho Trung, hiragana cho Nhật), độ tin cậy, chọn chữ theo âm và ngữ cảnh. Một lần gọi lẻ dao động mạnh (Hàn 22–39%), lấy bản giữa thì ổn định.
7. **Chắn**: bỏ đầu ra có lời giải thích, dài hơn 1,4 lần hay ngắn hơn 0,6 lần các ứng viên (lùi về ứng viên được đồng ý nhiều nhất); bỏ câu chỉ toàn tiếng kêu (啊, 까아, ugh…); các bản khác nhau quá 0,6 thì không đoán.
8. **Thời gian phụ đề**: khớp từng câu với mốc thời gian từng chữ Groq trả về (`timestamp_granularities[]=word`).

Cân bằng = Kỹ bỏ bước 5. Nhanh = không Demucs, không VAD (cắt đoạn ≤ 25 s ở chỗ nhỏ tiếng), 2 bản, 1 lần hợp nhất.

## 3. Điều đã thấy (dùng khi làm thật)

- Khai ngôn ngữ và temperature 0 không đổi gì; large-v3 không tốt hơn turbo một cách ổn định.
- VAD trên tiếng gốc bị nhạc đánh lừa; trên giọng đã tách thì tốt, nhưng mất giọng thì thầm (phải có bước dò khoảng trống).
- Prompt thuật ngữ cho Whisper giúp ít; sửa tên riêng, từ đồng âm hiệu quả hơn ở bước model chữ.
- Model chữ: Qwen4-Max tốt nhất nhưng gọi lẻ không ổn định; Qwen3.8-27B (Groq) ổn định, nhanh (0,3 s) nhưng sửa đồng âm kém hơn; GPT-OSS-120B kém hơn cả hai ở tiếng Trung, Hàn.
- Không cứu được: câu thì thầm tiếng Anh dưới nhạc to (đã thử dải cao, trừ phổ, phần nhạc Demucs, SepFormer: chỉ ra «Thank you»), giọng địa phương (Tứ Xuyên ở thử 1), tiếng lóng nghe sai («kinda goated» → «kinda good»).
- Không dùng cho Dịch trực tiếp: cần cả nhóm câu và hàng chục giây.

## 3b. Thử DeepFilterNet 3 (đề xuất 8 và 12 bước của Google)

`dfn.py` (model lấy từ Hugging Face `fal/DeepFilterNet3`, GitHub bị chặn). Nhanh: 0,9 s cho clip 29 s trên CPU. Chạy cùng lúc với luồng Kỹ để so công bằng:

| Luồng | Trung | Nhật | Hàn | Anh |
|---|---|---|---|---|
| Kỹ (chạy lại) | 5,4% | 9,0% | 23,2% | 26,7% |
| Kỹ + DeepFilterNet thêm 2 bản ứng viên | 2,3% | 11,4% | 31,0% | 26,7% |
| Kỹ + DeepFilterNet nối tiếp sau Demucs (kiểu Google) | 5,4% | 12,7% | 34,5% | 26,7% |

Kết luận: KHÔNG dùng. DeepFilterNet coi giọng thì thầm là tiếng ồn (clip Hàn: câu 3 từ -23 dB xuống -37 dB, câu 10 từ -28 dB xuống -35 dB), và hai bản khử ồn ra chữ giống nhau nên «áp đảo số đông» khi hợp nhất. Luồng Kỹ tự nó cũng dao động giữa các lần chạy (Trung 2,3–5,4%, Hàn 19,7–23,2%), nên chênh dưới ~4 điểm chưa chắc là thật.

## 4. Thời gian và chi phí

Đo trên 4 nhân CPU, clip 38,5 s: Demucs 21,2 s; VAD 0,65 s; SepFormer mọi đoạn 32,1 s; một lần gọi turbo (22 s tiếng) ~1,1 s; Qwen4-Max ~2,2 s; Qwen3.8 trên Groq 0,33 s.
- Phim 2 giờ: Cân bằng ~66 phút CPU; Kỹ ~2,8 giờ CPU. Kỹ chỉ hợp clip ngắn hoặc việc xếp hàng ban đêm.
- Tiền Groq: luồng nhiều lớp khoảng 0,175 USD / giờ phim (thử 1), gấp ~4 lần cách hiện nay (0,04 USD).
- Key Groq gói miễn phí: 2.000 lượt / ngày, có giới hạn lượt mỗi phút và giây tiếng mỗi giờ; mỗi nhóm câu cần 4–10 lượt, chạy thật phải dùng gói trả phí.

## 5. Chạy lại

Cần Python 3.11+, ffmpeg và các gói: `numpy scipy soundfile jiwer opencc-python-reimplemented cn2an pykakasi pypinyin onnxruntime torch torchaudio demucs speechbrain`.
Biến môi trường: `GROQ_API_KEY`; `ALI_API_KEY` và `ALI_BASE` (địa chỉ Workspace Alibaba Model Studio, dạng `https://…aliyuncs.com`) cho Qwen4-Max và Qwen TTS. Không ghi key vào file.

Chạy trong một thư mục làm việc ngoài git (code tạo `cache/`, `sep/`, `pretrained/`):

    cp eval/asr/luong-ky/*.py <thư mục>/ && cp public/models/silero_vad.int8.onnx <thư mục>/
    # đặt <tên>.wav (16 kHz mono), <tên>44.wav (44,1 kHz stereo) và in/<tên>_dap_an.json (từ dap-an/)
    SETS="zh2:zh,ja2:ja,ko:ko,en:en" python3 runml.py '{"KỸ":{"n":4,"ovl":"all","fuse":[["qwen4-max","ali"],["qwen4-max","ali"],["qwen4-max","ali"]]}}' ket-qua.json
    python3 base.py      # mức nền: như app, large-v3 (sửa danh sách trong file)
    python3 remake.py    # dựng lại clip Trung/Nhật bằng Qwen TTS

Video, âm thanh thử không vào git (theo `eval/asr/audio/`). Đáp án: `dap-an/` (`zh`, `ja`, `ko`, `en` của Chủ; `zh2`, `ja2` là bản làm lại, thời gian khác bản gốc).

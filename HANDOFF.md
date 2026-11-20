# HANDOFF — TyZo_Sub_Project (phụ đề video)

Cập nhật 20/11/2026. **v5.17.7, `main` = `work`** (đã đẩy chính thức lần 5, Chủ nói «đẩy chính thức»). Điều khoản `2026-11-18.1`.
File này ngắn có chủ ý: chỉ ghi việc đang làm, việc còn lại và cách tiếp tục. Nhật ký cũ đã chuyển sang `docs/lich-su/` (xem mục 7).

## 1. Bắt đầu nhanh (người hoặc AI tiếp theo)
1. Đọc theo thứ tự: `BANG_DIEU.md` → `huongdan.txt` → file này → bảng đầu `PROJECT_STATUS.md`. Đối chiếu với code; tài liệu sai thì sửa tài liệu.
2. Lấy code: clone nhánh `work` của `thanhnghiaplay-ai/TyZo_Sub_Project`. Mọi việc làm trên `work`.
3. Kiểm nền: `npm ci`, `npm run typecheck`, `npm run lint` (0 lỗi; 31 cảnh báo có sẵn), `npm test` (1282 pass), `npm run build`.
4. Mỗi bước: sửa → typecheck → lint → test → (nếu đổi hành vi khách: nâng `APP_VERSION`, thêm `CHANGELOG` mỗi dòng ≤ 100 ký tự và không có từ nội bộ, thêm `ADMIN_LOG`) → commit → đẩy `work` → ghi một dòng ở mục 3.
5. Chỉ đẩy `main` khi Chủ nói đúng câu «đẩy chính thức» (kéo thẳng `main` = `work`, chạy typecheck, lint, test và build trước). Lần gần nhất: `main` từ `81eac01` (v5.17.6) lên cùng commit với `work` (v5.17.7, kèm dòng nhắc «sót lời», khối «Chấm nhận dạng» ở Admin, dọn tài liệu).
6. KHÔNG ghi token hay mật khẩu vào file, commit hay remote; truyền token ở dòng lệnh rồi bỏ. Token GitHub từng dán trong chat phải được Chủ thu hồi.
7. Lưu ý môi trường Claude: không gọi được `api.groq.com`, Alibaba, Deepgram (nên không tự kiểm với nhà thật); `github.com` thì được. Trong shell, `cut -c`/`head -c` cắt hỏng chữ tiếng Việt, dùng Python.
8. `AGENTS.md` là mẫu chung của một công cụ khác, không phải quy tắc dự án. Quy tắc dự án: `AGENTS.project.md`, `BANG_DIEU.md`, `huongdan.txt`.

## 2. Việc còn lại (theo thứ tự nên làm)
Các mục 1, 2, 4, 5 cần Chủ, clip thật, key Groq hoặc máy thật nên không làm được trong sandbox.
1. **Phim 18+**: chưa có clip nên chưa biết `ASR_GUARD` (vẫn gửi cho sex/softcore/adult) có làm Whisper bỏ lời không. Chủ đặt clip vào `eval/asr/audio/`, thêm vào `eval/asr/cases.json`, chạy `GROQ_API_KEY=... npm run asr:bench -- --variants default,noguard,guard`. Nếu `noguard` ra nhiều lời đúng hơn thì rút hoặc viết lại `ASR_GUARD` (`src/lib/sub/text.ts`). Thể loại `auto` không có guard: phim 18+ chọn `auto` có thể ra «A/Ah» lẻ (chưa đo).
2. **Bộ đo chưa kiểm với thật**: chưa chạy `asr:bench` với Groq thật; đáp án `eval/asr/tieu-hoa-thuong/ref-noprompt-11.srt` chưa người rành tiếng Trung duyệt; mới một clip. Cần thêm clip Nhật/Hàn/Anh, thoại có nhạc, câu dài.
3. **Còn lại của «đo nhận dạng»**: lịch chạy `asr:bench` định kỳ vì Groq đổi model ngầm (cần key Groq và nơi chạy định kỳ; chưa làm). Theo dõi xem dòng nhắc «sót lời» (v5.17.7) có nhắc oan thoại thưa thật không; chỉnh `DEFAULT_THRESHOLDS` (`asr-score.ts`) hoặc `SPARSE_MIN_SECONDS` (`sparse-note.ts`) nếu có.
4. **Kiểm bằng tay trên máy thật** (chưa ai chụp giao diện): điện thoại đứng, máy tính bảng, máy tính (tấm công cụ, nút vàng lướt công cụ, tab Phim/Ngữ cảnh, popover (i) trên màn cảm ứng, cỡ chữ «Rất lớn», giao diện tối/Tương lai); nghe thử giọng đọc (edge, Orpheus, Aura, giọng máy) và chỉnh `LATENCY_DEFAULT`/`FIT_MAX_BOOST`; chạy với key và CSDL thật (đồng bộ model key phòng, ước Token); tour «Thuật ngữ»; bấm thử hai thứ mới của v5.17.7 (mục 5). Nếu lệch mắt thì chỉnh trong `styles.css` (khối SHEET_PORTRAIT, `.studio-wallet-tab`).
5. **Chưa sửa (nhỏ, theo dõi)**: `needsLangCheck`/`chooseBetter` (không thấy lệch ngôn ngữ ở v5.17.6); xưng hô «bạn/cậu» lẫn lộn (lần chạy gần nhất đã nhất quán); «后天» dịch thành «ngày mai/hôm sau» (có thể do nhận dạng nghe nhầm).
6. **Việc của Chủ**: bấm «Khôi phục» ở Admin để nạp thuật ngữ mới vào CSDL (seed lần đầu không tự nạp); thu hồi token GitHub đã dán trong chat; thử `listKeyModels` với key Alibaba và Deepgram thật rồi đổi `KEY_LIST_TRUSTED` ở `src/lib/sub/key-list.ts` (một dòng mỗi nhà).
Đã xong, đừng làm lại: `HANDOFF_NANG_CAP.md` (A, B, C đều xong); thuật ngữ zh (mỗi bộ 55–104 mục).

## 3. Tiến độ phiên gần nhất (20/11/2026, từ v5.17.6)
- v5.17.6: sửa Whisper large-v3 bỏ lời. `ASR_GUARD` chỉ gửi cho thể loại sex/softcore/adult (`ASR_GUARD_GENRES` ở `text.ts`); thể loại khác chỉ gửi tên phim + thuật ngữ. Clip «Tiểu hòa thượng» từ 2 câu lên 11 câu cả large-v3 và turbo, Chủ đã xác nhận trên bản chính thức.
- Bộ đo nhận dạng (không đổi hành vi): `npm run asr:score -- file.srt --lang zh [--ref ..] [--duration ..]` (không mạng) và `GROQ_API_KEY=... npm run asr:bench` (so prompt × model). Mã ở `src/lib/sub/asr-score.ts`, `scripts/asr-bench.ts`, dữ liệu ở `eval/asr/` (xem `eval/asr/README.md`).
- Sửa test đỏ `no-native-dialog` (chữ «prompt (» trong `ADMIN_LOG` bị regex hiểu là gọi `prompt()`).
- **v5.17.7**: khi nhận dạng quá thưa (nguồn zh/ja/ko/en, tổng đoạn ≥ 20 giây, dưới 1,5 chữ/giây với zh/ja/ko hoặc 6 với en, hoặc có câu dài mà ít chữ) kết quả có thêm dòng nhắc «có thể đã sót lời». Mã: `src/lib/sub/sparse-note.ts`, nối ở biến `retryBit` trong `use-pipeline.ts`. Cố ý không báo vì câu bịa hay lệch ngôn ngữ.
- Admin → Chất lượng có khối «Chấm nhận dạng (dán SRT)» (`src/components/asr-score-panel.tsx`, logic `src/lib/sub/asr-score-view.ts`). Chạy trong trình duyệt, không lưu. Làm thành khối chứ không phải tab riêng; muốn tab riêng thì thêm vào `AdminTab`, `ADMIN_TABS`, `ADMIN_GROUPS` và test tương ứng. Kiểm tay: dán các file ở `eval/asr/tieu-hoa-thuong/` (Tiếng Trung, độ dài 34): `ref-noprompt-11.srt` và `turbo-11.srt` «Đạt» (4,4 chữ/giây); `chunk15-6.srt` «Không đạt» (câu bịa); `noprompt-chunk15-13.srt` «Đạt, có cảnh báo» (lặp + vụn).
- Dọn tài liệu: nhật ký chuyển sang `docs/lich-su/`; `PROJECT_STATUS.md`, `BANG_DIEU.md`, `huongdan.txt`, `AGENTS.project.md` cập nhật số phiên bản.

## 4. Dữ kiện đo nhận dạng cần nhớ (clip «Tiểu hòa thượng», 34 giây, thoại có nhạc nền, Groq large-v3)
- Thủ phạm bỏ lời là câu `ASR_GUARD` tiếng Anh («Ignore breathing… Only transcribe clear words…»), không phải tên phim/thuật ngữ, không phải nén Opus, không phải độ dài. Bỏ nó (`?asrtest=noguard`) ra 11 câu giống hệt không prompt.
- Cắt đoạn 15 giây (`?asrtest=chunk15`) XẤU HƠN: ảo giác «请不吝点赞…», lặp ở chỗ nối. Giữ `CHUNK_SECONDS = 60`.
- `prompt` chỉ đi qua đường Groq Whisper (`transcribe`/`transcribeOnce` trong `groq.ts`, 4 chỗ gọi `asrPrompt` ở `use-pipeline.ts`). Deepgram, AssemblyAI, Speechmatics, Soniox, Alibaba không dùng prompt/từ khóa tăng cường (soát bằng grep, chưa đọc từng lời gọi API).
- Công tắc thử `?asrtest=noprompt | chunkN | noguard | off` (`src/lib/sub/asr-test.ts`), mặc định TẮT, lưu trong trình duyệt.
- Ngưỡng chữ/giây là mức chung nên có thể chấm oan clip thưa lời. Chấm trên câu thô của Whisper, chưa qua bộ lọc `appFiltered` của app.

## 5. Chưa thấy trên giao diện thật (v5.17.7)
Dòng nhắc «sót lời» sau khi dịch xong; khối «Chấm nhận dạng» ở Admin → Chất lượng. Test, typecheck, lint, build đều xanh nhưng chưa ai bấm thử.

## 6. Bản đồ file tài liệu
| File | Dùng để |
|---|---|
| `BANG_DIEU.md` | Thứ tự ưu tiên, bảng «Đang chạy», ba vai, ý Chủ đã nêu. Đọc đầu tiên |
| `huongdan.txt` | Quy tắc làm việc, quy ước kỹ thuật (không hộp thoại mặc định, nút quay lại, điều khoản…) |
| `HANDOFF.md` (file này) | Việc đang làm và việc còn lại |
| `PROJECT_STATUS.md` | Hồ sơ: bảng chức năng, cấu trúc code, quy tắc bắt buộc, kế hoạch kinh doanh (13), mục chưa được code (14, 15) |
| `PROVIDERS.md` | Cách thêm một nhà nhận dạng |
| `HANDOFF_NANG_CAP.md` | Kế hoạch trau chuốt bản dịch + thuật ngữ. ĐÃ XONG, chỉ tra cứu (code còn trỏ tới tên file này) |
| `eval/asr/README.md` | Cách dùng bộ đo nhận dạng |
| `docs/lich-su/` | Nhật ký và báo cáo cũ (mục 7) |

## 7. Lưu trữ (`docs/lich-su/`, nguyên văn, không phải lệnh)
- `HANDOFF_2026-11.md`: toàn bộ HANDOFF cũ (từ phiên 1 đến v5.17.6). Mỗi mục `## BÀN GIAO (ngày, nhánh) — tiêu đề`, mới nhất trên cùng. Tìm bằng `grep -n`.
- `PROJECT_STATUS_nhat-ky.md`: lịch sử thay đổi (mục 6 cũ), glossary thể loại cũ (9), hàng đợi báo cáo v4 (10), kế hoạch Bước 5 (11), đề xuất ASR/giọng (12), ghi chú sửa nhận dạng 11/11.
- `BAO_CAO_KIEM_TRA_v3.10.9.md`: báo cáo kiểm tra 11/11/2026.
- `DONG_TRANG_THAI_DA_THAY.md`: các dòng trạng thái cũ đã được thay trong `BANG_DIEU.md`, `huongdan.txt`, `PROJECT_STATUS.md`.

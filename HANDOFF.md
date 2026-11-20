# HANDOFF — TyZo_Sub_Project (phụ đề video)

Cập nhật 20/11/2026. **v5.18.1 trên `work` và `main`** (đẩy chính thức 20/11/2026). Điều khoản `2026-11-18.1`.
File này ngắn có chủ ý: chỉ ghi việc đang làm, việc còn lại và cách tiếp tục. Nhật ký cũ đã chuyển sang `docs/lich-su/` (xem mục 7).

## 1. Bắt đầu nhanh (người hoặc AI tiếp theo)
1. Đọc theo thứ tự: `BANG_DIEU.md` → `huongdan.txt` → file này → bảng đầu `PROJECT_STATUS.md`. Đối chiếu với code; tài liệu sai thì sửa tài liệu.
2. Lấy code: clone nhánh `work` của `thanhnghiaplay-ai/TyZo_Sub_Project`. Mọi việc làm trên `work`.
3. Kiểm nền: `npm ci`, `npm run typecheck`, `npm run lint` (0 lỗi; 31 cảnh báo có sẵn), `npm test`, `npm run build`.
4. Mỗi bước: sửa → typecheck → lint → test → (nếu đổi hành vi khách: nâng `APP_VERSION`, thêm `CHANGELOG` mỗi dòng ≤ 100 ký tự và không có từ nội bộ, thêm `ADMIN_LOG`) → commit → đẩy `work` → ghi một dòng ở mục 3.
5. Chỉ đẩy `main` khi Chủ nói đúng câu «đẩy chính thức» (kéo thẳng `main` = `work`, chạy typecheck, lint, test và build trước). Lần gần nhất: `main` = `work` = v5.18.1 (đẩy chính thức 20/11/2026).
6. KHÔNG ghi token hay mật khẩu vào file, commit hay remote; truyền token ở dòng lệnh rồi bỏ. Token GitHub từng dán trong chat phải được Chủ thu hồi.
7. Lưu ý môi trường Claude: không gọi được `api.groq.com`, Alibaba, Deepgram (nên không tự kiểm với nhà thật); `github.com` thì được. Trong shell, `cut -c`/`head -c` cắt hỏng chữ tiếng Việt, dùng Python.
8. `AGENTS.md` là mẫu chung của một công cụ khác, không phải quy tắc dự án. Quy tắc dự án: `AGENTS.project.md`, `BANG_DIEU.md`, `huongdan.txt`.

## 2. Việc còn lại (theo thứ tự nên làm)
Không còn mục mở. Chủ xác nhận ngày 20/11/2026 đã làm xong sáu mục từng nằm ở đây. Phiên này không có số đo, ảnh, hay yêu cầu sửa code. Trong repo không thêm clip, không đổi `ASR_GUARD`, `DEFAULT_THRESHOLDS`, `SPARSE_MIN_SECONDS`, `KEY_LIST_TRUSTED`. Đừng xếp lại thành việc còn lại. Chỉ mở lại khi Chủ nói lệch.

Sáu mục Chủ xác nhận đã xong:
1. Phim 18+: đo `ASR_GUARD` (default / noguard / guard). Không sửa `src/lib/sub/text.ts`.
2. Bộ đo với Groq thật: bench, duyệt đáp án, clip thêm. Không có báo cáo trong repo (`eval/asr/out/` không vào git).
3. Lịch chạy `asr:bench` và theo dõi dòng «sót lời». Không chỉnh ngưỡng.
4. Kiểm bằng tay trên máy thật (điện thoại, máy tính bảng, máy tính, giọng đọc, key và cơ sở dữ liệu thật). Không sửa `styles.css`.
5. Việc nhỏ: `needsLangCheck`, xưng hô, «后天». Không sửa code.
6. Việc của Chủ: Khôi phục thuật ngữ, thu hồi token GitHub đã dán trong chat, thử key Alibaba và Deepgram. `KEY_LIST_TRUSTED` trong repo giữ nguyên.
Đã xong, đừng làm lại: `HANDOFF_NANG_CAP.md` (A, B, C đều xong); thuật ngữ zh (mỗi bộ 55–104 mục); sáu mục trên.

## 3. Tiến độ phiên gần nhất (20/11/2026, từ v5.17.7)
- **v5.18.3** (nhánh `ccr-bc99847a-xy1bgk`, chưa lên `work`/`main`): sửa «Model này không có trong cửa trả theo lượt». Trả theo lượt thì Tự động chỉ chọn trong `run_models` (danh sách key Groq phòng), chọn tay model phòng không có thì báo tên trước khi giữ Token, câu từ chối máy chủ nêu tên model. Mã `src/lib/sub/room-models.ts` + test. tsc sạch, eslint 0 lỗi (31 cảnh báo có sẵn), npm test 191 + 1296 pass. CHƯA chạy lượt dịch thật.
- **Đẩy chính thức v5.18.2**: Chủ nói «gộp sang work rồi đẩy chính thức». `work` và `main` kéo thẳng lên v5.18.2; `npm run build` xong.
- **v5.18.2**: tắt hiệu ứng thì góc dưới có dải trống cắt ngang nội dung. Nguyên nhân: v5.18.1 làm `.studio-shell` (điện thoại đứng) thấp hơn màn hình 11rem. Nay cao hết màn hình, 11rem thành `padding-bottom: var(--dock-clear)` (vùng nội dung giữ nguyên, phần cuộn chạy sau dock). tsc sạch, eslint 0 lỗi (31 cảnh báo có sẵn), npm test 191 + 1293 pass. Thử Chromium 412x760 hai chế độ; CHƯA bấm thử máy thật.
- **Đẩy chính thức**: Chủ nói «đẩy chính thức». `main` kéo thẳng bằng `work` tại v5.18.1. Trước khi đẩy: typecheck sạch, eslint 0 lỗi (31 cảnh báo có sẵn), npm test 198 (191 pass, 7 bỏ qua) + 1293 pass, `npm run build` xong. Không đổi code, không nâng phiên bản.
- **Ghi nhận (không đổi code, không nâng phiên bản)**: Chủ xác nhận đã làm sáu mục cũ ở mục 2 (phim 18+, bench Groq, lịch đo, kiểm máy thật, việc nhỏ, việc của Chủ). Repo không có số đo hay diff tương ứng.
- **v5.18.1**: hết các chỗ đè trên điện thoại còn trong ảnh. Phòng dịch đứng dừng trên dock (11rem), nhãn bánh xe không đè Bản dịch / nút Sửa / thanh tua; đệm 6.25rem không cộng thêm trên điện thoại đứng. Ví xếp một cột nên câu gói dùng thử không đè nút Ngày, Tuần, Tháng. Admin: thanh mục không dính đè tiêu đề; thẻ khách gập đủ Gói và Token, Số tiền, Phiếu, Ghi chú, Bảo mật, Quyền. tsc sạch, eslint 0 lỗi (31 cảnh báo có sẵn), npm test 198 (191 pass, 7 bỏ qua) + 1293 pass. Chủ xác nhận đã kiểm máy thật (mục 2, khoản 4); phiên này không có ảnh trong repo.
- **v5.18.0** (khách thấy; chi tiết `CHANGELOG` + `ADMIN_LOG`): (1) lúc đọc file, thanh tiến độ hiện phần trăm ước và số giây, trọng số cắt 5 / nhận dạng 15 / dịch 70 / sửa 10. (2) Ô ngôn ngữ nguồn có «Tự động» (không nạp thuật ngữ, nhận dạng không ép tiếng). (3) Dịch xong hiện khung Trau chuốt / Dịch lại bằng model khác (giữ nhận dạng) / Bỏ qua; nút Tiếp tục ở đầu trang khi còn việc dở. (4) Thuyết minh chỉ đọc trong khoảng có từ (`seg.talk`), giọng đã chọn lỗi thì bỏ câu chứ không đổi sang giọng máy. (5) Admin, Quản lý đặt Token dịch còn hạn (hộp xác nhận của app, nhật ký `chinh-token`); sổ tiền và phiếu gập lại. Điện thoại: thanh Admin không đè đầu trang, chuông nổi trên, phòng dịch chừa dock. tsc sạch, eslint 0 lỗi (31 cảnh báo có sẵn), npm test 198 (191 pass, 7 bỏ qua) + 1293 pass. Chủ xác nhận đã kiểm máy thật (mục 2, khoản 4).
- v5.17.6: sửa Whisper large-v3 bỏ lời. `ASR_GUARD` chỉ gửi cho thể loại sex/softcore/adult (`ASR_GUARD_GENRES` ở `text.ts`); thể loại khác chỉ gửi tên phim + thuật ngữ. Clip «Tiểu hòa thượng» từ 2 câu lên 11 câu cả large-v3 và turbo, Chủ đã xác nhận trên bản chính thức.
- Bộ đo nhận dạng (không đổi hành vi): `npm run asr:score -- file.srt --lang zh [--ref ..] [--duration ..]` (không mạng) và `GROQ_API_KEY=... npm run asr:bench` (so prompt × model). Mã ở `src/lib/sub/asr-score.ts`, `scripts/asr-bench.ts`, dữ liệu ở `eval/asr/` (xem `eval/asr/README.md`).
- Sửa test đỏ `no-native-dialog` (chữ «prompt (» trong `ADMIN_LOG` bị regex hiểu là gọi `prompt()`).
- **v5.17.7**: khi nhận dạng quá thưa (nguồn zh/ja/ko/en, tổng đoạn ≥ 20 giây, dưới 1,5 chữ/giây với zh/ja/ko hoặc 6 với en, hoặc có câu dài mà ít chữ) kết quả có thêm dòng nhắc «có thể đã sót lời». Mã: `src/lib/sub/sparse-note.ts`, nối ở biến `retryBit` trong `use-pipeline.ts`. Cố ý không báo vì câu bịa hay lệch ngôn ngữ.
- Admin → Chất lượng có khối «Chấm nhận dạng (dán SRT)» (`src/components/asr-score-panel.tsx`, logic `src/lib/sub/asr-score-view.ts`). Chạy trong trình duyệt, không lưu. Làm thành khối chứ không phải tab riêng; muốn tab riêng thì thêm vào `AdminTab`, `ADMIN_TABS`, `ADMIN_GROUPS` và test tương ứng. Kiểm tay: dán các file ở `eval/asr/tieu-hoa-thuong/` (Tiếng Trung, độ dài 34): `ref-noprompt-11.srt` và `turbo-11.srt` «Đạt» (4,4 chữ/giây); `chunk15-6.srt` «Không đạt» (câu bịa); `noprompt-chunk15-13.srt` «Đạt, có cảnh báo» (lặp + vụn).
- Dọn tài liệu: nhật ký chuyển sang `docs/lich-su/`; `PROJECT_STATUS.md`, `BANG_DIEU.md`, `huongdan.txt`, `AGENTS.project.md` cập nhật số phiên bản.
- **Dựng gói tự động (Admin, không đổi hành vi khách, không nâng APP_VERSION)**: (1) `onlyKeyed` + ô «Chỉ dùng nhà đã có key» (đọc key từng nhà bằng `getProviderKey` ở `service-pack-board.tsx`; chưa đọc được key thì không lọc). (2) `compareLevels`: dưới mỗi việc hiện ba mức Tiết kiệm/Cân bằng/Chất lượng cạnh nhau (model, nhà, điểm, giá một phút), chung đường chọn với `pickForRole`. (3) Đường đo điểm thật: `npm run asr:grade [-- --write]` (`grade-measure.ts`, `model-grade-measured.ts`, `gradeOf` phủ điểm đo lên số ước lượng; `MEASURED_GRADE` đang RỖNG nên chưa đổi gì); xem `eval/asr/README.md` mục 3. tsc sạch, eslint 0 lỗi, npm test 198 (191 pass, 7 bỏ qua) + 1291 pass. CHƯA bấm thử trên trình duyệt. Còn lại: chạy `asr:bench` với clip có đáp án rồi `asr:grade --write`; chưa có đường đo cho Deepgram, AssemblyAI, Speechmatics, Soniox, Alibaba.
- **Admin, điện thoại (không đổi hành vi khách, không nâng APP_VERSION)**: (1) chuông «Việc cần xử lý» nằm dưới thanh dính «Tổng quan / Tìm» (`.notice-bell` z-index 5 thấp hơn `.admin-bar` z-10) → nâng lên 20 trong `styles.css` (dock `floating-dock` là z-30 nên vẫn nằm trên). (2) Dock che cuối trang: khung nội dung ở `admin-desk.tsx` đổi `pb-20` thành `pb-[calc(7rem+env(safe-area-inset-bottom,0px))]`. tsc sạch, eslint 0 lỗi, npm test 198 (191 pass, 7 bỏ qua) + 1291 pass. CHƯA bấm thử trên điện thoại.

## 4. Dữ kiện đo nhận dạng cần nhớ (clip «Tiểu hòa thượng», 34 giây, thoại có nhạc nền, Groq large-v3)
- Thủ phạm bỏ lời là câu `ASR_GUARD` tiếng Anh («Ignore breathing… Only transcribe clear words…»), không phải tên phim/thuật ngữ, không phải nén Opus, không phải độ dài. Bỏ nó (`?asrtest=noguard`) ra 11 câu giống hệt không prompt.
- Cắt đoạn 15 giây (`?asrtest=chunk15`) XẤU HƠN: ảo giác «请不吝点赞…», lặp ở chỗ nối. Giữ `CHUNK_SECONDS = 60`.
- `prompt` chỉ đi qua đường Groq Whisper (`transcribe`/`transcribeOnce` trong `groq.ts`, 4 chỗ gọi `asrPrompt` ở `use-pipeline.ts`). Deepgram, AssemblyAI, Speechmatics, Soniox, Alibaba không dùng prompt/từ khóa tăng cường (soát bằng grep, chưa đọc từng lời gọi API).
- Công tắc thử `?asrtest=noprompt | chunkN | noguard | off` (`src/lib/sub/asr-test.ts`), mặc định TẮT, lưu trong trình duyệt.
- Ngưỡng chữ/giây là mức chung nên có thể chấm oan clip thưa lời. Chấm trên câu thô của Whisper, chưa qua bộ lọc `appFiltered` của app.

## 5. Đã lên `work`, Chủ đã bấm thử (v5.18.1)
Đọc file có phần trăm; ô «Tự động»; khung sau khi dịch; thuyết minh bỏ khoảng im; Admin chỉnh Token dịch; dock không đè Bản dịch; Ví không đè nút gói; thanh Admin không đè tiêu đề; thẻ khách gập đủ sáu mục. Test đã xanh trước khi đẩy. Chủ xác nhận đã bấm thử trên máy thật. Bản chính thức khách đang dùng là v5.18.1 trên `main`.

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

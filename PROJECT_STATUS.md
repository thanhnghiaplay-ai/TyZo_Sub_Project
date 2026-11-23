# PROJECT STATUS — Dịch phụ đề video (TyZo_Sub_Project, tên cũ: phudedep)

> **Nhìn nhanh:** đọc `BANG_DIEU.md` trước, rồi `huongdan.txt`, rồi `HANDOFF.md`. File này là hồ sơ. Bảng đầu là trạng thái hiện tại. Mục 6 cũ và các mục 9–12 đã chuyển sang `docs/lich-su/`; các mục 7, 8, 13, 14, 15 còn ở đây và vẫn có hiệu lực.

| Thông tin | Giá trị |
|-----------|---------|
| **Cập nhật lần cuối** | 2026-11-23 — đẩy chính thức v5.42.6 + ứng dụng 0.7 (điều khoản 2026-11-23.1). Trước: 2026-11-22 23:20 — đẩy chính thức v5.42.5 + ứng dụng 0.6. Trước: đẩy chính thức v5.42.4: Dịch trực tiếp quay về cách của v5.41.0 theo Chủ yêu cầu. Trước: 22:33 — đẩy chính thức v5.42.3: cầu nối chờ êm khi Alibaba cắt vì im lặng. đẩy chính thức v5.42.2: sửa cầu nối sập vì ECONNRESET. đẩy chính thức v5.42.1 (menu điện thoại, cách tra ứng dụng không ra chữ, điều khoản 2026-11-22.8). đẩy chính thức v5.42.0 đợt 1 tối ưu độ trễ (A1–A7). đẩy chính thức v5.41.0 (phát hiện vi phạm có hồ sơ bằng chứng) và v5.40.0 (cộng tác viên, hoa hồng tính trên lời). đẩy chính thức v5.38.0 (ứng dụng Android 0.4 đồng bộ với web). đẩy chính thức v5.37.0 (ứng dụng Android: liên kết máy bằng mã, phụ đề nổi). đẩy chính thức v5.36.0 (Dịch trực tiếp: phụ đề nổi, chữ lớn, từ cần giữ đúng). v5.35.2 (lưu được key ElevenLabs giới hạn quyền). v5.35.1 (thông báo lỗi gọn, lỗi key rõ). Trước đó v5.35.0: `main` = `work` (v5.34.0–v5.35.0: ElevenLabs nhận dạng và giọng đọc, điều khoản 2026-11-22.1) trên nhánh `ccr-6b6ee13d-637k1h`. 2026-11-21 — đẩy chính thức v5.33.0: `main` = `work` (v5.32.1–v5.33.0: giữ lượt chạy trên điện thoại, bớt hỏi dồn lần đầu, lỗi dưới nút chính, dòng gói ở trang chủ, khôi phục phụ đề sau khi tải lại; điều khoản 2026-11-21.3). |
| **Người báo cáo lỗi** | User (Thanh Khanh) |
| **Phiên bản code** | **v5.42.6** + ứng dụng 0.7 trên `work` và `main` (điều khoản 2026-11-22.9) (điều khoản `2026-11-22.8`, đẩy chính thức 22/11/2026). Trước đó v5.41.0 (đẩy chính thức 22/11/2026). Điều khoản `2026-11-22.6`. Ứng dụng Android 0.5. Cầu nối trên VPS realtimehub.tyzo.site. |
| **Trạng thái tổng** | Phòng dịch và thuê phòng đã gắn. Giá 9.000 / 39.000 / 99.000 đ, giá tay. Mua Token dịch và thuê phòng bằng mã QR đúng giá, không giữ số dư để chi. Trả theo lượt, dịch trực tiếp và Orpheus (key phòng) trừ Token dịch. Thuê phòng bằng key riêng: Chủ tick model nhận dạng, dịch và giọng Orpheus ở Admin, app chặn thật (rent-show-rule.ts, narration.ts); Aura chỉ trả bằng Token dịch. Neural không trừ. Không còn giá riêng từng model và không còn phần chênh Groq/Alibaba (markup luôn 0). Alibaba lấy giá Singapore khi đọc được. Số dư test đã về 0, không hoàn. Mục 13.2 không được code. v2.19.1 đã sửa các lỗi còn mở sau báo cáo Claude, trừ T6 (không khóa máy thật) và S9 (HE-AAC, elst chỉ bản 0). VAD đã đối chiếu tên tensor bằng wasm, chưa bấm trên điện thoại. Quy trình cho AI nằm ở `huongdan.txt`. |

---

## Còn mở

### Quét theme 2026-11-16

Nguồn đúng: `PALETTE_KEYS` / `DARK_DEFAULT` / `LIGHT_DEFAULT` trong `src/lib/theme/theme.ts`, biến trong `@theme` của `src/styles.css`, và `ICON_SLOTS`. 36 mã hex trong `theme.ts` là mặc định của token, không tính là lệch.

Màu hex còn cứng ngoài nguồn đó: **20** chỗ (đồng bộ màu 4/4 xong).

| File | Số | Ghi chú |
|---|---|---|
| `src/components/studio.tsx` | 15 | Bảng màu phụ đề khách chọn (`#ffe14d`…) cộng `#fff` / `#000`. Không gộp vào màu chrome |
| `src/lib/maintenance-scene.ts` | 5 | Chỉ còn màu dự phòng khi trình duyệt chưa tính được màu chờ |

Màu Tailwind bảng (`red-500`…), không qua token: **0** (bước 5). Trang lỗi (`error-component.tsx`) đã tiếng Việt (v3.46.6). Còn câu tiếng Anh trong `lib/app-data/errors.ts` và nút «Continue with» ở `gates.tsx`; cả hai không gắn vào trang đang chạy.

Bo góc còn cố ý không theo thanh: **176** `rounded-full` (nút tròn, chấm) và **1** `rounded-none` (video toàn màn). `rounded-md` / `lg` / `3xl` đã chuyển ở v3.46.13. Trong `styles.css` còn `999px`, `50%`, `0.45rem`, `6px`, `2px` (viên thuốc, huy hiệu, thanh tiến độ). Bóng nổi `shadow`, `shadow-lg`, `shadow-xl` và quầng sáng màu theo `Theme.shadow` (v3.47.1, mặc định 1). Viền huy hiệu vai trò, bóng chữ trang bảo trì và màn tối hướng dẫn theo độ dày viền và độ đậm bóng (v3.47.13, mức 1 không đổi hình). Vòng focus đã dùng màu nhấn. Màu phụ đề khách chọn và 5 màu dự phòng tia lửa không đưa vào giao diện.

Icon: không còn file import `lucide-react` (v3.46.18). Mục Icon có ô tìm, lưới xem trước, đặt lại từng chỗ (v3.47.2), cỡ nhỏ/vừa/lớn và màu theo chữ hoặc màu nhấn (v3.47.3, mặc định vừa và theo chữ).

Độ dày viền khung theo `Theme.line` (v3.47.4, mặc định 1 px): lớp `.border` và 22 khung trong `styles.css`. Viền huy hiệu và viền 2 px không theo.

Kiểu nút `Theme.button` (v3.47.5): đặc, viền, mờ. Mặc định đặc. Tám bộ màu, bộ Vàng là màu gốc.

Phần chữ (v3.47.6): phông tiêu đề, độ đậm tiêu đề (mặc định như hiện tại), giãn dòng (mặc định 1.5). Cỡ chữ chung nay áp vào trang, mức 100% không đổi.

Phần bố cục (v3.47.7): độ rộng trang rộng 40–120 rem (mặc định 120), menu trái hoặc phải (mặc định trái). Phòng dịch không bị thu.

Phần chuyển động (v3.47.8): bật hoặc tắt, tốc độ chậm/vừa/nhanh. Mặc định bật và vừa. Máy giảm chuyển động thì luôn tắt.

Phần bảo trì (v3.47.9): chữ biển, màu biển, hiệu ứng mạnh, robot hoặc chỉ biển. Mặc định «BẢO TRÌ», màu lỗi, có robot và hiệu ứng mạnh. Favicon chưa làm.

Phần tách tab (v3.47.10): mục Giao diện chia Màu, Chữ, Hình khối, Biểu tượng, Chuyển động, Trang riêng. Xem trước vẫn hiện. Không thêm trường.

Phần icon nhóm (v3.47.11): điều hướng, hành động, trạng thái, giao diện. Nét riêng mặc định theo nét chung.

Phần xem trước cả trang (v3.47.12): khi mở tab Giao diện, bản nháp phủ lên trang ngay. Rời tab thì trở lại bản đã công bố. Nút Hoàn tác tối đa 30 bước trong phiên. Khách vẫn cần Công bố.

Phần chỗ để riêng (v3.47.13): viền huy hiệu vai trò, bóng chữ bảo trì và màn tối hướng dẫn theo token. Mức 1 không đổi hình. Tám phần yêu cầu đã xong.

Bước 4 (07:21): đèn chất lượng, đường thu/chi, chấm phiếu đã chuyển. Còn robot, nền đêm, phụ đề, thư HTML. Git `main` vẫn có thể lệch bản đang deploy; bảng «Đang chạy» còn dòng khách v2.20.0 chưa được kiểm bằng deploy.

Chưa làm: chuyển các chỗ trên sang token / `ICON_SLOTS`. Không nâng phiên bản (chỉ tài liệu).

---

## 1. Tổng quan dự án

Ứng dụng web **dịch phụ đề video** hoạt động chủ yếu phía client + gọi API Groq:

**Luồng chính:**
1. Upload video hoặc audio riêng
2. Cắt đoạn audio → **ASR (Whisper qua Groq)**
3. **Dịch** bằng LLM Groq (có bước repair)
4. Hiển thị phụ đề đồng bộ trên player
5. Tùy chọn thuyết minh (TTS / Orpheus)
6. Phân tích ngữ cảnh phim (`analyzeFilm`) → tạo “bible” nhân vật (tên + gender + self + addressed) để cải thiện dịch

**Stack kỹ thuật:**
- Frontend: React + TanStack Start/Router. Bản HTML standalone không còn trong gói giao.
- ASR & Translate: Groq API (`whisper-large-v3-turbo` / `whisper-large-v3` + các model chat)
- Xử lý media: `src/lib/sub/mp4.ts`, `codec.ts`
- Lưu settings / API key: localStorage
- File này: `PROJECT_STATUS.md` ở gốc gói giao. Thư mục `attachments/` trong gói để **rỗng** và **không có** `dich-phu-de-4.html`.

---

## 2. Bảng trạng thái chức năng

| # | Tính năng | Trạng thái | Ghi chú chi tiết |
|---|-----------|------------|------------------|
| 1 | Upload video / audio riêng | ✅ Hoàn thành | Hỗ trợ file lớn, có hint MKV / AC3 / DTS |
| 2 | ASR Whisper (Groq) | ✅ Có | Turbo / Large. Prompt có câu chặn non-speech (cuối prompt, không lấn glossary) |
| 3 | Dịch phụ đề (có repair) | ✅ Có | `translateWithRepair` + bible + gender lock mỗi batch |
| 4 | Phân tích phim / bible tên + gender | ✅ Có | Thêm `self` + `addressed`. `applyNameFixes` giữ nguyên |
| 5 | Hiển thị phụ đề realtime trên player | ✅ Có | |
| 6 | Chỉnh style phụ đề (font / size / màu / nền / vị trí) | ✅ Có | Có box mẫu trong panel |
| 7 | Thuyết minh (TTS / Orpheus) | ✅ Có | Có giọng dự phòng. Ô đọc theo video lấy `seg.voice` từ cao độ, không gọi `voiceGenderForLine`. Chi tiết mục 12. |
| 8 | Fullscreen player | ✅ Có | |
| 9 | Gesture tua video (kéo ngang) | ✅ Đã sửa | Chạy cả khi không fullscreen. HUD hiện mốc thời gian |
| 10 | Gesture tăng/giảm âm lượng (kéo dọc) | ✅ Đã sửa | Kéo dọc **nửa phải**. Có HUD % |
| 11 | Gesture / điều khiển độ sáng màn hình | ✅ Đã thêm | Kéo dọc **nửa trái**, khoảng 30–200%. Phím `[` `]` |
| 12 | Lọc tiếng thở / rên / non-speech | ✅ Đã lọc phía client | Bỏ cả câu chỉ là A/Ah/Uh/Hmm/Mm, thẻ [Music], thở/rên. Không đợi confidence thấp. **Chưa có test đơn vị** cho `isNonSpeech`. |
| 13 | Giữ đúng danh xưng nam / nữ | ⚠️ Prompt đã siết | Chưa có bước LLM thứ hai (tốn token). Cần user test hội thoại nhiều người |
| 14 | Box mẫu (preview live) khi chỉnh phụ đề | ✅ Đã có | Trong panel cài đặt, cập nhật theo phông/cỡ/màu/nền/vị trí |
| 15 | Glossary thuật ngữ theo thể loại phim (genre × ngôn ngữ) | ✅ Độc lập | Mỗi thể loại một file, không trộn `common.json` / `global.json`. 4 ngôn ngữ nguồn: ja, ko, zh, en. Đích cứng trong file là tiếng Việt, **kể cả khi ngôn ngữ đích của app không phải tiếng Việt**. Ngôn ngữ lời nói «Tự nhận dạng» (mã rỗng) thì **không nạp** file thuật ngữ. |
| 16 | Box mẫu phụ đề kiểu floating | ✅ Đã sửa | Mẫu ghim trên đầu panel, không nằm trong vùng cuộn. Vị trí trong ô mẫu bị kẹp để không bay ra khỏi khung; video vẫn dùng đúng % đáy |
| 17 | Đổi mặc định style phụ đề | ✅ Đã sửa | Mặc định mới: độ mờ nền 0%, cỡ chữ 50%, vị trí đáy 3%. Ai đã chỉnh style thì giữ nguyên. Ai còn đúng bộ cũ (nền 70 / cỡ 100 / đáy 12) được chuyển sang mặc định mới |
| 18 | Tách phân tích cả phim ra ngoài | ✅ Đã sửa | Khối "Phân tích phim" nằm trên form chính. Bật/tắt, nút Phân tích ngay, sửa tên / giới / tự xưng / được gọi / thuật ngữ. Mặc định dừng để bấm Dịch tiếp trước khi dịch |
| 19 | Nâng cấp TTS giọng đọc (tự nhiên hơn, free) | ✅ Đã sửa | Giọng neural Edge (tiếng Việt: Hoài My / Nam Minh), không API key. Lỗi mạng thì đọc bằng giọng máy, ưu tiên giọng neural/Google nếu máy có. Orpheus giữ nguyên. Không nhúng Piper (model lớn, giấy phép GPL) |
| 20 | 14 bộ thuật ngữ tách riêng + thể loại Hằng ngày | ✅ Bước 1 | 15 file/ngôn ngữ: action, adventure, crime, scifi, horror, romance, psychological, comedy, costume, historical, mystery, sports, adult, series, daily. Khoảng 1.900 mục. Chọn «Tự động» thì không nạp file có sẵn. |
| 21 | Bảng nhân vật: nhãn từng ô + gõ không mất focus | ✅ Bước 2 | Mỗi hàng có tiêu đề «Nhân vật N» và 4 ô có nhãn hiện rõ: Tên nhân vật / Nam / nữ / Tự xưng / Được gọi. `key` của hàng đổi từ `${name}-${index}` sang `character-${index}` nên gõ tên không dựng lại hàng. Cần user thử trên điện thoại thật. |
| 22 | Panel tùy chỉnh phụ đề dùng được khi không toàn màn hình | ✅ Bước 3 | `Stage` trong `studio.tsx`: panel tách thành `panelNode`. Toàn màn hình: phủ lên video như cũ (`absolute`, `max-h-75%`). Không toàn màn hình: nằm dưới khung video, chảy bình thường, `max-h-[80dvh]`, tự cuộn vào tầm nhìn khi mở. Cần user thử trên điện thoại thật. |
| 23 | Thuyết minh theo bảng nhân vật | 🟡 Đã có test, chưa nghe phim thật | Khóa từng câu thắng bảng. Bảng thắng cao độ. Không đoán anh/em. Nút Đổi giọng lưu trên máy. Test: `cast-voice.test.ts`, `pitch-voice.test.ts`. |
| 24 | Khôi phục placeholder thuật ngữ | ✅ Đã sửa 2026-11-04 | `restoreTerms` không xóa khoảng trắng quanh `{{G0}}`. Nhận `{{G0}}`, `{{ G0 }}`, `{{g0}}`, `{G0}`, `[[G0]]`. Không nhầm G1 với G10. Prompt dịch bắt giữ token. Câu mất token hoặc còn sót thì dịch lại **một lần** không protect, rồi xóa token còn lại. Test: `src/lib/sub/glossary.test.ts`. |
| 25 | Chẩn đoán câu ASR bị loại (Bước 5 Pha 0) | 🟡 Đã có test | UI có danh sách, xuất JSON, nút Nghe / Giữ / Bỏ từng câu. Giữ không gửi lại cả phim. **Chưa chạy trên phim thật.** |
| 26 | Batch dịch thiếu câu (Bước 5 Pha 1d) | 🟡 Đã có test | `parseTranslations` nhận mảng ngắn hơn hoặc ô không phải chuỗi, không ném cả batch. Chỉ dịch lại vị trí trống, kèm ctx và khối addressLock/bible. Câu lỗi hiện «Không dịch được», không hiện câu gốc như bản dịch. Nút «Dịch lại các câu lỗi». Test: `src/lib/sub/translate-batch.test.ts`. **Chưa chạy trên phim thật.** |
| 27 | Thử lại đoạn không giải mã (Bước 5 Pha 1a) | 🟡 Đã có test | Chỉ đoạn `decode_fail`. Mỗi đoạn một lần. Ngân sách 180 giây cho cả lần chạy, đoạn không vừa thì để nguyên. UI và dòng trạng thái ghi chỉ số, khoảng thời gian còn thiếu, và số giây đã dùng. Không thử lại im lặng, Whisper trống, hay câu bị lọc. Test: `src/lib/sub/asr-retry.test.ts`. **Chưa chạy trên phim thật.** |
| 28 | Biên đoạn chồng (Bước 5 Pha 1c) | 🟡 Đã có test | Mốc vẫn là giữa vùng chồng 2 giây. Câu được giữ khi **điểm giữa** nằm từ mốc đó trở đi, không còn bị bỏ chỉ vì bắt đầu trong 1 giây đầu. Câu đã có thì không thêm lần nữa. Câu đoạn sau dài hơn thì nối vào câu bị cắt. Không đổi ngưỡng ảo giác / im lặng. Test: `src/lib/sub/overlap.test.ts`. **Chưa chạy trên phim thật.** |
| 29 | Im lặng theo cửa sổ (Bước 5 Pha 1b) | 🟡 Đã có test, chưa số liệu phim | Ngưỡng vẫn `0.005`. RMS tính từng cửa sổ 1 giây, không lấy trung bình cả đoạn. Chỉ bỏ khi mọi cửa sổ đều dưới ngưỡng. Một giây có tiếng trong đoạn 60 giây không còn bị bỏ. Bộ lọc A/Ah và lời ngắn không đổi. Test: `src/lib/sub/silence.test.ts`. **Chưa so trên phim thật.** |
| 30 | Dò khoảng trống (Bước 5 Pha 2) | 🟡 Đã có test | Sau khi có phụ đề, nút «Dò khoảng trống» chỉ chạy trên máy. Khoảng ≥ 2 giây có tiếng mà không có câu được liệt kê kèm ước tính $. Ngân sách 120 giây cho cả lần chạy, không cắt khoảng. Nút «Nhận dạng các khoảng này» mới gửi, và còn hộp xác nhận. Không tự gửi khi nhận dạng xong. Test: `src/lib/sub/gap-scan.test.ts`. **Chưa chạy trên phim thật.** |
| 31 | Đánh giá Silero (Bước 5 Pha 3) | 🟡 Bước 2 đã gắn, tắt mặc định | Model int8 nằm ở `public/models`, WASM 15 MB ở `public/vad`. Không nằm trong JS lúc mở app. Bật ô thì mới tải. Lỗi tải thì dùng RMS. Test: `vad.test.ts`. Chưa chạy trên phim thật. |
| 32 | Xếp lại màn hình (Bước 6.1) | 🟡 Đã có test | Key, ngôn ngữ, thể loại, file và nút chạy đứng trước trong thẻ Phim. Trạng thái và Xuất file Vietsub nằm trên khung xem. «Tốc độ và chi phí» và «Thuật ngữ thể loại» đóng sẵn. Test: `src/components/studio-layout.test.ts`. |
| 33 | Khung Phụ đề (Bước 6.2) | 🟡 Đã có test | Thanh chức năng chỉ có Phụ đề. Video và bảng câu nằm trong `data-workspace`, một player, không nằm trong tab. |
| 34 | Tab công cụ (Bước 6.3) | 🟡 Đã có test | Chỉ một tab hiện: Phim, Chất lượng, Nhân vật, Nghe, Kiểm tra. Đổi tab không gỡ form. Một nút Dịch tiếp trên khung xem. Dò khoảng trống và câu lỗi nằm ở Kiểm tra. |
| 35 | Ba cỡ màn hình (Bước 6.4) | 🟡 Đã có test | Dưới 700px: video tối đa 33dvh, tab là tấm dưới không đè hình, có nút Đóng. 700–1023px: video ghim, tối đa 42dvh. Từ 1024px: video và bảng câu cạnh nhau. Chừa tai thỏ. Ô chữ 16px, nút 44px. |
| 36 | Chuyển tab (Bước 6.5) | 🟡 Đã có test | Panel hiện ra trượt nhẹ 180ms. Nút tab đổi màu 160ms. `prefers-reduced-motion` thì tắt cả hai. Mũi tên trái/phải, Home và End chọn tab. Test: `src/components/studio-layout.test.ts`. |
| 37 | Trình duyệt (Bước 6.6) | 🟡 Đã có test | `vh` đứng trước `dvh`, `env(safe-area-inset-*, 0px)`. `styles.css` không có tiền tố một hãng. Không còn câu bắt dùng Chrome. Âm thanh vẫn `AudioContext` hoặc `webkitAudioContext`. |
| 38 | Hết chồng khung (Bước 7.1) | 🟡 Đã có test | Video không còn lớp nổi. Điện thoại: tab nằm dưới bảng câu, bảng câu co lại chứ không bị phủ. Màn thấp hơn 520px: không dùng lưới máy tính, video là dải nhỏ, tab chiếm phần còn lại và tự cuộn. |
| 39 | Tab theo thứ tự dùng (Bước 7.2) | 🟡 Đã có test | Key Sub (key, đồng bộ, model, Whisper, luồng), Phim (ngôn ngữ, thể loại, file, chạy), Nhân vật (ngữ cảnh đóng sẵn + phân tích), Nghe, Kiểm tra. Bỏ tab Chất lượng. Không xóa tên phim, tóm tắt, thuật ngữ tay. |
| 40 | Không giật khung (Bước 7.3) | 🟡 Đã có test | Trang không cuộn cả khung. Chọn file xong thì bỏ focus. Nút đóng trên điện thoại là dấu X 44px, góc phải tab. Dòng trạng thái khóa 2 hàng; bấm để xem đủ, không đẩy video. |
| 41 | Số nổi và nút X trong khung (Bước 7.4) | 🟡 Đã có test | Số thuật ngữ nằm trong viên vàng, chữ đen. Nút X nằm trong khung tab, chỉ hiện trên điện thoại và màn thấp. |
| 42 | Giọng theo cao độ (Bước 7.5) | 🟡 Đã có test | Lúc nhận dạng, mỗi câu đo cao độ. Dưới 160 Hz là nam, trên 190 Hz là nữ, khoảng giữa hoặc ít tiếng thì giữ giọng dự phòng. Không hỏi model, không chọn tay. |
| 43 | Giọng so trong video (Bước 7.6) | 🟡 Đã có test | Bỏ mốc Hz cố định. So các câu trong cùng video: nhóm thấp là nam, nhóm cao là nữ, câu nằm giữa hoặc cả phim một nhóm thì giữ giọng dự phòng. Bỏ hai đầu mỗi câu. Chưa nghe trên phim thật. |
| 44 | Thuê phòng | 🟡 Đã gắn, chưa thu tiền thật | Đăng ký email, không đăng nhập Google. Dùng thử: 1 tệp, 10 phút, không quá 100 MB, không xuất file. Gói còn hạn thì không giới hạn số tệp và được xuất file. Giá đã chốt: 9.000 / 39.000 / 99.000 đ. SePay và Casso có khung nhập API ở Admin. Chưa nhập API thì trang khách hiện bảo trì. Key Groq vẫn của khách. |
| 45 | Cửa vào điều khoản | 🟡 Đã gắn | Màn chờ logo, rồi điều khoản. Phiên bản hiện tại `2026-11-08.3`. Chưa đồng ý thì không vào phòng. Đổi `TERMS_VERSION` thì phải đồng ý lại. Khi đã đăng nhập, máy chủ ghi `room_accounts.terms_version`. Từ 2026-11-06 13:09, việc nào đổi dịch vụ thì phải sửa bảng Tóm tắt, bảng giá hoặc mục liên quan trong cùng lần đó (`huongdan.txt` mục 12b). |
| 46 | Giá model bằng đồng | 🟡 Đã gắn | Lúc mở app, máy chủ đọc trang model Groq và tỷ giá đô. Thẻ model hiện giá đồng, cửa sổ token, hạn mức tiếng Việt. Hạn mức là gói công khai, không phải số riêng của từng key. |
| 47 | Trang Admin | 🟡 Đã gắn | `/admin` tách khỏi phòng. Bốn cấp: Người dùng, Hỗ trợ, Quản lý, Chủ. Chủ xem được log cấp dưới. Cấp dưới không xem log cấp trên. Sơ đồ và doanh thu chỉ Chủ sửa. Lịch sử chỉ 6 dòng, có xem thêm. |
| 48 | Thẻ quyền | 🟡 Đã gắn | Mười kiểu. Chỉ Chủ chọn, có ô minh họa, thu gọn được. Màu theo cấp, cùng màu với sơ đồ. |
| 49 | Khung video | 🟡 Đã sửa trong code | Giữ 16:9 khi xoay ngang và khi bật chế độ máy tính. Câu hướng dẫn xuống dòng dưới khung. Cần user xem lại trên điện thoại. |
| 50 | Nghe / thuyết minh | 🟡 Đã gắn | Mặc định bật. Khách tắt thì lần sau giữ tắt. Chưa nghe trên phim thật. |
| 51 | Nút Quản lý | 🟡 Đã gắn | Nằm trong danh sách của nút ba gạch, chỉ hiện khi có quyền. Tên mục đang mở hiện cạnh nút. |
| 52 | Ghi nhớ email | 🟡 Đã gắn | Ô trên form đăng nhập. Chỉ lưu email trên máy, không lưu mật khẩu. |
| 53 | Tóm tắt phiên bản | 🟡 Đã gắn | Bấm hoặc rê chuột vào Vx.x.x ở điều khoản, phòng dịch và Admin. Danh sách nằm ở `CHANGELOG` trong `src/lib/app-version.ts`. Từ v2.5.1, mỗi dòng viết đủ ý và có mốc thời gian. Bản chưa xem thì số sáng nhẹ. |
| 54 | Nâng cấp nhận dạng và dịch | ⚪ Để sau | User chốt 2026-11-06: làm sau, chưa code. Thứ tự và việc cấm nằm ở mục 14. Không đổi Whisper Turbo trước khi có số đo. |
| 59 | Trang Hướng dẫn (phần 1 trong 3) | 🟡 Đã có test và đã mở thật bằng Chrome ở 390 và 1280 px, chưa thử Safari, điện thoại thật, Vercel, tab Cấu hình bằng Chủ thật | v3.40.0. `/huong-dan`: mục lục, tìm không dấu, 9 mục và 6 câu hỏi, nút «Chỉ tôi» ở Bắt đầu nhanh (chạy tuyến `quick-start` của `GuidedTour`), mục mật khẩu đổi theo việc phòng có gửi thư. Menu trái và Ctrl+K có mục Hướng dẫn. Liên hệ hỗ trợ: Chủ nhập ở tab Cấu hình (`support-board.tsx`, khóa `support_contact`). Chưa làm: tuyến cho các mục khác và làm mờ nền (phần 2), gom điều khoản (phần 3). |
| 60 | Điều khoản gom một chỗ (phần 3 trong 3) | 🟡 Có test (`terms.test.ts`, `entry-gate.test.ts` giữ dấu vân tay chữ điều khoản), `tsc` sạch, `vite build` qua; chưa mở bằng trình duyệt thật (Safari, điện thoại thật, Vercel) | v3.41.0. Chữ điều khoản ở `components/terms-document.tsx` (nguyên văn), `TERMS_VERSION`/`TERMS_KEY` và `termsGate` ở `lib/terms.ts`. Đăng ký/Đăng nhập có ô tích (`routes/login.tsx`), chưa tích thì không gọi đăng nhập. Trang `/dieu-khoan` không qua cửa hỏi. Liên kết `TermsLink` ở chân trang đăng nhập, menu trái, Tài khoản, cuối trang Hướng dẫn. `EntryGate` chỉ hỏi lại người đã có tài khoản khi `TERMS_VERSION` đổi. Chưa làm: sửa chữ §2, §6, §7 cho khớp ô tích (phải nâng `TERMS_VERSION`), bỏ lớp `EntryGate` ở `/huong-dan`. |
| 58 | Giao diện mới, giai đoạn 1: nền móng | 🟡 Đã có test, chưa thử tab bằng Chủ thật | Token sáng/tối, phông trong danh sách, icon theo chỗ đặt (Phosphor, 6 độ đậm), nháp/công bố/lịch sử, chặn chữ khó đọc. Tab Admin «Giao diện» (chỉ Chủ). Mặc định tối nên khách chưa thấy đổi. Từ v3.29.1 khách tự đổi sáng/tối và gọn/thoải mái được ở mọi cấu hình; Admin chỉ đặt mặc định lúc mở. Chưa dựng lại bố cục Studio và các trang (giai đoạn 2 trở đi). Màu cứng còn lại: `quality-view`, `top-up`, `admin-desk`, ô màu phụ đề trong `studio.tsx`, logo SVG. Test: `src/lib/theme/theme.test.ts`. |
| 57 | Số liệu chất lượng về Admin | 🟡 Đã có test và build, chưa thử đăng nhập thật | v3.13.0. Tab «Chất lượng» (Chủ): đèn, thanh ba màu, theo ngày, ngôn ngữ, model, phiên bản, riêng key riêng/key phòng và tổng. Điều khoản 2026-11-12.3. |
| 56 | Kiểm tra ngôn ngữ từng đoạn | 🟡 Đã có test, chưa chạy phim thật | v3.12.0. Ô tùy chọn, mặc định tắt. Đoạn nghi lệch ngôn ngữ hoặc độ tin thấp được nhận dạng lại một lần không ép ngôn ngữ, ngân sách 120 giây, chỉ đổi khi tốt hơn rõ. Test: `lang-check.test.ts`. Chưa đo trên phim lẫn tiếng. |
| 55 | Trả theo lượt | 🟡 Trừ gói giây, không giữ ví | v4.1.0: dịch trực tiếp cũng trừ gói giây. Thuê phòng giữ giá tay. Không còn giá riêng từng model. Alibaba kéo giá Singapore. v4.0.0: mua gói giây bằng số dư đồng. Phiếu đồng cũ và thuyết minh vẫn trừ ví. |

---

## 3. VẤN ĐỀ HIỆN TẠI (Ưu tiên cao – User báo cáo)

Giữ nguyên mô tả gốc để đối chiếu. Phần **đã xử lý** ghi ở mục 4 và 6. Chưa xóa cho đến khi user xác nhận.

### 3.10. Tách nhà phát hành (user chốt 2026-11-12, làm từng bước)

Nguyên văn:

«1. Các model AI của Groq, Alibaba hay sau này có thêm nhà phát hành nào khác, phải tách riêng ra, hoạt động độc lập tùy theo người dùng có chọn không.
2. Ở trang Admin có quản lý key API của từng nhà phát hành ở đây là Groq và Alibaba và các nhà phát hành khác (nếu có hợp tác)
3. Trang Admin có thể cho người dùng lựa chọn theo cách Admin muốn ( duy nhất 1 nhà phát hành, 1 model nhất định hoặc tùy chọn 1 model của nhà phát hành nào để làm chức năng riêng biệt để tạo thành 1 gói dịch vụ cho người dùng)
4. Gói thuê phòng là dùng key api của người dùng và tất cả model admin cho phép hiển thị mới dùng được, người dùng có quyền dùng model nào, của AI nào để tùy chỉnh nhận diện, dịch,v.v... nếu họ có api key
5. Gói trả theo lược là dùng key, API của admin và các gói tùy chỉnh do admin phát hành.
6. Giá bán của model là lấy giá gốc của nhà phát hành + % chênh lệch admin tùy chỉnh, giống như của Groq.
7. Người dùng chỉ thấy giá tổng sau khi đã cộng chênh lệch.
Chấp nhận nâng cấp, làm từng bước»

Bước 5 (v3.23.0): trả theo lượt chọn gói. Bước 6 và 7 (v3.24.0): giá = giá gốc cộng phần trăm, khách chỉ thấy số đã cộng. Gói Alibaba vẫn chưa gọi.

### 3.12. Gói Alibaba vẫn bị chặn khi trả theo lượt (user 2026-11-13)

Nguyên văn:

«Tôi đã thêm api alibaba, set gói, tải link phim. Nhưng vẫn báo như hình»

Hình báo: «Gói này có việc Alibaba. Cửa trả theo lượt chưa gọi key Alibaba của phòng.»

### 3.11. Đơ và sai quyền sau mỗi lần cập nhật (user 2026-11-13)

Nguyên văn:

«Nó làm cho web bị đơ, hiển thị sai dữ liệu truy cập admin hay bị lỗi.
Có phải do lỗi này không.
Mỗi lần build, nâng cấp, cập nhật lên hay bị.
Xác nhận lại giúp tôi»

«Sửa triệt để, để những lần sau khi nâng cấp, fix lỗi và build lại không bị nữa»

Đã xác nhận: 504 cắt hàm lúc máy chủ mới khởi động làm trang đứng và hiện sai quyền. Cảnh báo SSL không phải nguyên nhân. Thiếu thư không làm đơ.

### 3.1. Nhận diện giọng nói & ngữ cảnh (ASR)
- Độ chính xác còn thấp, thiếu nhiều câu. **Chưa đụng thuật toán cắt đoạn / model** — chỉ lọc rác và prompt. Nếu vẫn thiếu câu, không được siết filter thêm (dễ nuốt lời ngắn như “Ừ”, “Em”).
- Tiếng **thở dốc, tiếng rên, âm thanh không lời** thường bị Whisper nhận thành chữ **“A”**. **Đã lọc sau ASR** (kể cả khi model tự tin).
- Ngữ cảnh hội thoại chưa được nắm tốt → dịch sai ý. Bible + gender lock giảm một phần; không đảm bảo hết.

### 3.2. Chất lượng dịch
- Dịch chưa chuẩn — phụ thuộc model Groq, không có ground truth trong repo.
- **Lẫn lộn danh xưng nam/nữ**: đã bắt buộc gender / self / addressed trong system prompt và từng batch. User cần xem lại trên phim thật.
- Vẫn còn nhiều lỗi khác user chưa liệt kê hết.

### 3.3. Điều khiển player bằng cử chỉ
- Tăng/giảm **âm lượng** bằng kéo dọc → **đã sửa** (nửa phải, không cần fullscreen).
- Tăng/giảm **độ sáng màn hình** → **đã thêm** (nửa trái = `filter: brightness()` trên thẻ video, không phải đèn máy).
- **Tua video** bằng kéo ngang → **đã sửa**. Chạm đúp mé trái/phải ±10 giây.

### 3.4. UI chỉnh phụ đề
- **Đã có box mẫu** trong panel. Trước đó câu mẫu vẽ trên video nhưng panel che mất đáy hình, nên nhìn như không có preview.

### 3.5. Chất lượng thuật ngữ theo thể loại phim (yêu cầu mới – 2026-11-03)
- User báo dịch còn nhiều thuật ngữ chưa chính xác. Đề xuất: thêm thư viện thuật ngữ phân loại theo **thể loại phim × ngôn ngữ nguồn**.
- Khi user chọn thể loại (vd phim tâm lý) + ngôn ngữ (vd tiếng Nhật), hệ thống nạp file thuật ngữ tương ứng; từ/cụm khớp trong file được **ưu tiên ghi đè** lên bản dịch máy bình thường.
- Bộ thể loại hiện tại còn thiếu nhiều thể loại → cần bổ sung danh sách đầy đủ.
- Phương án kỹ thuật chi tiết + việc cần làm: xem **mục 9**.
- **Trạng thái:** đã xử lý (bước 1, mục 9). Giữ nguyên mô tả gốc cho đến khi user xác nhận.

### 3.6. UI chỉnh phụ đề (yêu cầu mới – 2026-11-03) — đã xử lý trong code
- **Box mẫu (preview) bị chạy lên trên:** mẫu giờ ghim phía trên các thanh kéo, không cuộn theo panel. Chữ mẫu không còn dùng `%` thô (kéo vị trí lên cao thì chữ bay khỏi ô).
- **Đổi giá trị mặc định** thành độ mờ nền 0%, cỡ chữ 50%, vị trí từ đáy 3%. Style đã tùy chỉnh được giữ.

### 3.7. Phân tích ngữ cảnh phim (yêu cầu mới – 2026-11-03) — đã xử lý trong code
- `analyzeFilm` vẫn nằm trong `groq.ts`. Giao diện đưa ra khối riêng "Phân tích phim".
- Khi bật và chọn "dừng để sửa", app nhận dạng xong → phân tích → dừng. User sửa bible rồi bấm **Dịch tiếp**. Tắt ô dừng thì dịch ngay như trước.
- Nút **Phân tích ngay** chạy khi đã có lời thoại và job không đang chạy.

### 3.8. Giọng đọc máy (TTS) (yêu cầu mới – 2026-11-03) — đã xử lý trong code
- Thêm lựa chọn **Neural**: Edge Read Aloud qua server của app (gói `node-edge-tts`, MIT). Tiếng Việt mặc định Hoài My / Nam Minh theo giới đã chọn.
- Không cần API key. Nếu Edge lỗi hoặc chậm quá ~12 giây, app đọc bằng giọng máy trong 20 giây rồi thử lại.
- Giọng máy được xếp hạng: ưu tiên Neural / Google / đúng ngôn ngữ và đúng giới.
- **Không** nhúng Piper-WASM: model tiếng Việt khoảng vài chục MB và giấy phép GPL. Edge là nguồn neural miễn phí; giọng máy là fallback cuối. Orpheus (có phí, Anh/Ả Rập) giữ nguyên.
- Đây là API không chính thức của Microsoft. Có thể bị chặn. Fallback giọng máy là bắt buộc và đã có.

---

## 4. Hướng xử lý đã chọn (khác đề xuất cũ ở chỗ ghi rõ)

### Nguyên nhân gốc (không chỉ là `full === true`)
1. `onPointerMove` return sớm khi `!full`. Bản HTML cũng chặn bằng `isFull()`. User kéo trên player thường (chưa phóng to) nên cử chỉ “chết”.
2. `#stage` / player dùng `touch-action` cho phép trình duyệt nuốt vuốt dọc thành scroll. Đã đặt `touch-action: none` trên khung hình và `setPointerCapture`.
3. Không có nhánh brightness trong React (HTML thì có, nhưng cũng chỉ khi fullscreen).
4. Preview “Đây là phụ đề xem thử” đã nằm trên video khi mở panel, nhưng panel `max-h: 75%` che phụ đề. Cần một sân khấu mẫu **bên trong** panel.

### Đã làm
- Cử chỉ: ngang = tua, dọc phải = âm lượng, dọc trái = độ sáng. HUD chữ (không emoji). Phím mũi tên / `[` `]` / `F` / `M` / Space.
- Không bắt đầu cử chỉ khi chạm `button, input, select, textarea, label` hoặc `[data-nogesture]` (panel + box mẫu).
- `isNonSpeech()` trong `src/lib/sub/text.ts` (và bản JS tương đương trong HTML). Whisper hay gán logprob khá cao cho chữ “A”, nên **không** chờ `no_speech_prob`.
- Giữ lời ngắn thật: “Ừ”, “Em”, “Anh”, “Có”, “Dạ”, “OK”, “I”, “No”.
- Prompt Whisper: glossary/tên phim đứng trước, câu “Ignore breathing…” đứng cuối và bị cắt 420 ký tự. API Groq **không** có `no_speech_threshold` (chỉ có file, model, language, prompt, temperature, response_format). Không gửi tham số tưởng tượng.
- Nếu prompt bị Whisper đọc thành câu, `isNonSpeech` bỏ các dòng chứa “Ignore breathing” / “non-speech”.
- `analyzeFilm` trả thêm `self` và `addressed`. `addressLock()` nhét vào từng batch dịch. Không thêm lượt LLM consistency (nhân đôi phí) — ghi là việc còn lại nếu user vẫn thấy lẫn xưng hô.
- Lúc đó hai nguồn (React + HTML) được kéo cùng logic; HTML nay không còn trong gói giao. App người dùng mở là React.

### Yêu cầu mới 2026-11-03 — đã làm
- **Box mẫu (#16):** panel phụ đề là cột flex. Ô mẫu `shrink-0` nằm trên vùng `overflow-auto` của các thanh. `sampleBottom()` kẹp vị trí chữ trong ô (8–62%) để không bị cắt; video dùng `sub.pos` thật.
- **Mặc định style (#17):** `SUB_DEF` = `{ op: 0, size: 50, pos: 3 }`. Khóa `gset_v=2`. Bản lưu đúng bộ cũ được đổi sang mặc định mới. Bản đã sửa từng thông số thì giữ.
- **Phân tích phim (#18):** khối riêng trong `studio.tsx`. `use-pipeline.ts` chờ ASR xong, gọi `analyzeFilm`, nếu `reviewBefore` thì đặt `reviewHold` và không dịch cho đến khi `approveBible()`. Sửa bible ghi thẳng vào `job.bible` nên batch dịch sau đó dùng bản đã sửa. Logic `analyzeFilm` / `addressLock` không đổi.
- **TTS (#19):** `src/lib/sub/edge-speech.ts` (server function) + `edge-voice.ts` + nhánh `engine: "edge"` trong `narration.ts`. Người chưa từng đổi giọng được chuyển sang Neural (`gnarr_v=2`). Người đã chỉnh tốc độ/giọng thì giữ lựa chọn cũ.
- **Thuyết minh bước 4 (#23):** `src/lib/sub/cast-voice.ts` chọn nam/nữ khi câu có «Tên:» hoặc tự xưng duy nhất đứng đầu câu **và không trùng cách gọi (`addressed`) của nhân vật khác**. `studio.tsx` chỉ đọc câu đang hiện trên hình; `lead` là số giây chờ sau khi câu hiện, không còn đọc sớm. `gnarr_v=3` đưa `lead` đã lưu về 0.

### Chưa làm / không làm (gộp các lượt)
- VAD riêng trước Whisper (nặng, cần WASM; silence RMS đã có).
- Đo lại chất lượng ASR trên file phim của user (không có file mẫu trong workspace).
- Lượt “consistency pass” sau khi dịch xong.
- Glossary: không nhúng kuromoji. Đuôi nói thường gặp xử lý bằng luật (`jaVerbSurfaces` + đuôi danh từ). Biến thể kính ngữ hiếm vẫn có thể trượt.
- Piper-WASM.
- File HTML không có trong gói giao. Không tạo lại HTML. Prompt dịch lần 2026-11-04 chỉ sửa trong React (`text.ts`).
- **T6, đã chốt 2026-11-08 19:21, không làm:** không khóa lượt thử theo máy thật. Mã máy do trình duyệt tự sinh. Xóa dữ liệu trang hoặc ẩn danh là máy mới. Không bịa fingerprint, cookie hay captcha. Khóa thật chỉ có khi thư đã xác minh, và gửi thư chỉ bật khi phòng đã cấu hình nhà cung cấp thư.
- **S9, đã chốt 2026-11-08 19:21, không làm:** không viết bộ giải HE-AAC, không đọc hết mọi bản `elst`. Chỉ bù mục đầu, bản 0. AAC-LC vẫn đọc. HE-AAC để trình duyệt giải.
- **Captcha yêu cầu công khai, không làm.** Đã có trần email, trần chung và trần IP khi máy chủ thấy địa chỉ.

---

## 5. Cấu trúc code quan trọng (định vị nhanh)

```
src/
├── components/
│   ├── studio.tsx              ← player, gesture, HUD, box mẫu phụ đề, chọn thể loại
│   └── use-pipeline.ts         ← ASR → dịch; gọi asrPrompt + addressLock + glossary protect/restore
└── lib/sub/
    ├── groq.ts                 ← transcribe, translateWithRepair, analyzeFilm
    ├── text.ts                 ← isNonSpeech, asrPrompt, addressLock, translationMessages, GENRES
    ├── glossary.ts             ← loadGenreGlossary, protectTerms, restoreTerms, settleGlossaryLines
    ├── glossary.test.ts
    ├── models.ts
    ├── mp4.ts / codec.ts
    ├── narration.ts
    ├── cast-voice.ts           ← giọng nam/nữ theo bảng; bỏ tự xưng nếu trùng addressed
    ├── cast-voice.test.ts
    └── types.ts

public/glossaries/              ← một file / ngôn ngữ nguồn / thể loại (không còn common hay global)
PROJECT_STATUS.md               ← file này, nằm ở gốc gói giao
huongdan.txt
AGENTS.project.md               ← nhắc model sau đọc file này trước
```

Không có trong gói giao: file HTML standalone (`attachments/` để rỗng).

**Vị trí code:**
- Gesture + box mẫu: `studio.tsx` (`Stage`, `cueStyle`)
- Lọc rác ASR: `text.ts` → `isNonSpeech` + `acceptSegment`
- Prompt Whisper: `text.ts` → `asrPrompt`, gọi từ `use-pipeline.ts`
- Prompt dịch: `text.ts` → `translationMessages`, `ADDRESS_RULE`, `addressLock`
- Bible: `groq.ts` → `analyzeFilm`
- Glossary: `glossary.ts` + `use-pipeline.ts` (trước `translateWithRepair`, rồi `settleGlossaryLines`; câu hỏng dịch lại một lần không protect)

---

## 6. Lịch sử thay đổi — đã chuyển

Lịch sử thay đổi cũ (mục 6), glossary thể loại cũ (9), hàng đợi báo cáo v4 (10), kế hoạch Bước 5 (11), đề xuất ASR/giọng (12) và ghi chú sửa nhận dạng 11/11 nay nằm ở `docs/lich-su/PROJECT_STATUS_nhat-ky.md` (nguyên văn, không phải lệnh). Số mục giữ nguyên. Việc đang làm: `HANDOFF.md`; nhật ký bản khách: `CHANGELOG` trong `src/lib/app-version.ts`; nhật ký nội bộ: `ADMIN_LOG` trong `src/lib/admin-log.server.ts`.

### Máy đã chạy và máy chưa chạy (trình duyệt, cập nhật 20/11/2026)

- Đã chạy: Chromium trong sandbox. Đo 390×844, 844×390, 980×500, 768×1024, 1280×800: không chồng khung, không tràn ngang (`npm run check:layout`).
- Chưa chạy: Firefox, Safari iPhone, điện thoại và máy tính bảng thật. Danh sách việc kiểm tay: `HANDOFF.md` mục 2.4.

---

## 7. Quy tắc làm việc bắt buộc cho AI tiếp theo

1. **Đọc `BANG_DIEU.md` trước**, rồi `huongdan.txt`, rồi `HANDOFF.md`, rồi bảng đầu file này. Nhật ký ở `docs/lich-su/` không phải lệnh.
2. Khi sửa code: nâng `APP_VERSION` theo `huongdan.txt` mục 10, thêm một câu vào `CHANGELOG` trong `src/lib/app-version.ts`, cập nhật mục 2, ghi một dòng vào `HANDOFF.md` mục 3 (và `ADMIN_LOG`), chạy `npx tsc --noEmit` nếu đụng `src/`. Đẩy nhánh `work`. Chỉ vào `main` khi user nói «đẩy chính thức». Chỉ đóng zip khi user yêu cầu.
3. Nếu phát hiện nguyên nhân gốc khác với mục 4 → ghi rõ kèm cách đã chọn.
4. **Không xóa** các mục “Vấn đề hiện tại” cho đến khi user xác nhận đã hết lỗi.
5. Đừng siết `isNonSpeech` thêm nếu chưa có ví dụ câu bị nuốt. Lời một chữ (“Ừ”, “Em”) phải sống.
6. Khi đụng ASR, prompt dịch hoặc cử chỉ: sửa bản React. Không tạo lại file HTML.
7. Mỗi lần bàn giao cho AI khác: `BANG_DIEU.md`, file này và `huongdan.txt` phải khớp code. Không ghi token hay mật khẩu vào các file đó.
8. Độ sáng là filter trên video, không phải độ sáng OS.
9. **Mục 13.2 không được code** trừ khi user yêu cầu đúng phần đó. Mục 13.5 đã gắn. Giá đang bán là 9.000 / 39.000 / 99.000 đ, không dùng bảng giá cũ 19.000 / 59.000 / 149.000.
10. **Mục 14 chưa được code** cho đến khi user yêu cầu đúng một việc trong mục 14.2 hoặc 14.3. Không đổi model nhận dạng trước khi có số đo.
11. **Mục 15, từ v2.17.0:** Khách còn hạn gói, chọn trả theo lượt, thì phòng gọi Groq bằng key Chủ đã lưu. Khách không thấy key. Cửa đã giữ khoản ước tính và trừ số thực khi xong, trả phần thừa. Không bán key. Không nhận link video. Hoàn vào ví và sửa giá vẫn theo quyền đã chốt. Câu «chưa trừ ví» ở các đoạn cũ là quá khứ, không được làm theo.

---

## 8. Checklist nhanh trước khi bàn giao

- [x] Gesture volume hoạt động (code: nửa phải, không cổng `full`, có capture + touch-action none + HUD)
- [x] Gesture seek (tua) hoạt động (code: kéo ngang)
- [x] Có điều khiển độ sáng và hoạt động (code: nửa trái + phím `[` `]`)
- [x] Có box mẫu preview style phụ đề (realtime, trong panel)
- [x] Các segment chỉ là “A” / thở / rên bị lọc (`isNonSpeech` — **chưa có test đơn vị**)
- [ ] Danh xưng nam/nữ nhất quán hơn — prompt đã siết, **chưa test trên hội thoại thật**
- [x] Glossary theo thể loại phim — **mỗi thể loại một bộ**, không trộn chung; có thêm Hằng ngày (bước 1)
- [x] Bảng nhân vật: nhãn ô tên + sửa bàn phím ảo (bước 2) — code xong, **chưa thử trên điện thoại thật**
- [x] Panel phụ đề không bị cắt khi thoát toàn màn hình (bước 3) — code xong, **chưa thử trên điện thoại thật**
- [x] Thuyết minh theo giới trong bảng + không đọc trước câu (bước 4). Đã vá: tự xưng trùng cách gọi thì không đoán (`cast-voice.test.ts`)
- [x] Placeholder thuật ngữ không dính chữ, không lọt `{{G` (`glossary.test.ts`)
- [ ] ASR thiếu đoạn / câu không dịch (bước 5)
- [x] Box mẫu phụ đề kiểu floating (ghim, không bị kéo mất khi chỉnh thanh)
- [x] Mặc định style phụ đề: nền 0% / cỡ chữ 50% / đáy 3% (không ghi đè style đã sửa)
- [x] Tách phân tích phim ra giao diện chính, sửa bible, dừng trước khi dịch
- [x] Giọng neural miễn phí (Edge) + fallback giọng máy. Không dùng Piper
- [x] Đã cập nhật `PROJECT_STATUS.md`

---

## 13. Phương án kinh doanh

> **2026-11-06 01:01:** Mục 13.5 đã gắn vào app đang chạy, bản **v2.4.1**. Mục 13.2 vẫn chỉ là ghi chú, không được code trừ khi user yêu cầu đúng phần đó.
>
> User chốt 2026-11-05 13:42: sửa webapp đang chạy ưu tiên trước. Phần kinh doanh chỉ làm khi user yêu cầu.

Thảo luận cùng ngày, hai lượt. Lượt đầu hỏi đăng nhập Google để tạo key Groq. Lượt sau đổi sang tài khoản webapp và Google, ví tiền, giá bằng chi phí Groq cộng chênh, và dán link tính theo phút tiếng.

### 13.1 Không làm

- Không dùng tài khoản Google của khách để tạo key Groq. Google chỉ để biết người đó là ai. Key Groq tạo tay tại [console.groq.com/keys](https://console.groq.com/keys), trong tài khoản Groq. Không có cách để app cấp key Groq hộ.
- Không bán hạn mức Groq theo ngày và không bán key Groq. Phần đó vẫn do Groq tính với đúng người giữ key. Câu này không cấm thuê phòng dịch theo ngày. Thuê phòng là mục 13.5.
- Không tách «phí tải» cộng «phí dịch» trên cùng một phút. Dễ bị hiểu là tính hai lần.
- Không trả file ảnh hoặc tiếng cho khách ở đường dán link. Khách chỉ tải file phụ đề `.srt`.
- Bản đầu không tải bản sao từ YouTube, TikTok, Facebook hay trang phim. Thu phí không làm việc tải đó thành hợp pháp. Không có nút tải chỉ chặn người tiện tay. Trình duyệt vẫn nhận dữ liệu để phát, nên không chặn được người cố tình.
- Không ghi điều khoản kiểu miễn trừ tuyệt đối. Với dịch vụ có thu tiền, chủ web vẫn có thể phải chịu lỗi cố ý, lộ dữ liệu cá nhân, và nghĩa vụ với người tiêu dùng. Chưa viết bản điều khoản. Trước khi nhận tiền, nhờ luật sư ở Việt Nam xem.

### 13.2 Hướng để sau, khi được yêu cầu

**Tài khoản**

- Đăng ký trên webapp, và đăng nhập Google. Cùng một email thì cùng một hồ sơ, một số dư. Không tạo hai ví.
- Trang quản lý: email, tên, số dư, lịch sử cộng và trừ, đổi mật khẩu.
- Nút đổi mật khẩu chỉ hiện với người đăng ký bằng email. Tài khoản Google không có mật khẩu trên web này.
- Xác nhận email trước khi cho nạp tiền.

**Tiền**

- Khách nạp đồng vào ví trả trước.
- Máy chủ gọi Groq bằng key của chủ web. Key chỉ ở máy chủ. Khách không thấy key và không gọi thẳng Groq. Nếu trình duyệt vẫn gọi thẳng như hiện tại, khách đi vòng qua phần tính tiền.
- Niêm yết đơn giá đồng mỗi phút tiếng. Đơn giá đã gồm chi phí Groq và phần chênh. Khách thấy đơn giá, ước tính trước khi chạy, và số đã trừ sau khi xong. Không cần hiện hóa đơn gốc của Groq.
- Khi Groq hoặc tỷ giá đổi, sửa đơn giá. Không sửa số đã trừ của lần cũ.
- Giữ chỗ bằng số ước tính trước khi gửi Groq. Hết số dư thì dừng ở đoạn kế tiếp, không chạy cả phim rồi mới báo thiếu tiền.
- Hai đơn giá. Chọn file trên máy thì thấp hơn, vì máy khách chịu phần tải. Dán link thì cao hơn, vì chủ web thêm băng thông, máy chủ và chỗ lưu tạm.
- Một phút link là một giá trọn: đưa link vào, nhận dạng và dịch.

**Link**

- Link là file trực tiếp mà khách có quyền dùng: tải tạm, nhận dạng, xóa file.
- Trang như YouTube, nếu làm sau: chỉ nhúng trình phát chính thức để xem, không tải bản sao về máy chủ.
- Khách xác nhận có quyền với video đó trước khi chạy.

**Điều khoản, khi viết**

- Bám đúng chức năng đang bật. Không quảng cáo quá mức.
- Có số phiên bản. Chức năng đổi thì bản điều khoản đổi theo. Khách phải bấm đồng ý bản mới trước lần trả tiền tiếp theo. Không tự coi là khách đã chịu.
- Nói thẳng: phòng nhận dạng, dịch, xuất file và các chức năng đang bật. Không hứa dịch đúng hết, không hứa giữ giọng đúng hết. Khách chịu quyền của video. Bản dịch là gợi ý, khách tự kiểm trước khi đăng hoặc bán. App không phải Groq, Google, hay trang chứa video. Video và tiếng chỉ giữ lúc xử lý, rồi xóa. Giá là ước tính trước, số trừ sau là số thực tế, tỷ giá có khoản đệm.

### 13.3 Vì sao khác app đang chạy

App hiện để khách dán key Groq. Key nằm trên máy khách. Trình duyệt gọi Groq thẳng. Groq tính tiền người giữ key, không tính chủ web. Chủ web không có khoản chênh từ cách này. Muốn thu theo phút như mục 13.2 thì mọi lệnh Groq phải qua máy chủ. Thuê phòng theo ngày như mục 13.5 thì không cần, vì cước Groq vẫn do khách trả.

Nhận dạng turbo trong code là 0,04 USD mỗi giờ tiếng (`ASR_PRICE` trong `src/lib/sub/types.ts`). Large là 0,111 USD mỗi giờ. Ví dụ tỷ giá 25.000 đ một đô thì turbo khoảng 1.000 đ mỗi giờ tiếng, chưa kể câu dịch. Đây là số để hiểu độ lớn, không phải giá bán đã chốt. Giá bán lấy tỷ giá trong ngày, cộng đệm, rồi chủ web đặt đơn giá.

### 13.4 Thứ tự khi được yêu cầu

1. Bảng giá đồng mỗi phút, hai mức: file trên máy và dán link.
2. Ví trả trước và giữ chỗ.
3. Đăng nhập email và Google, một hồ sơ.
4. Điều khoản có số phiên bản, khách bấm đồng ý.
5. Link file trực tiếp, không trả file ảnh hay tiếng.
6. Trang có bản quyền để sau cùng.

### 13.5 Hướng mới — thuê phòng theo ngày, key Groq của khách

> User nêu 2026-11-05 14:33. Hướng này hợp app đang chạy hơn mục 13.2, vì trình duyệt gọi Groq bằng key khách dán.
>
> **2026-11-06 01:01:** Đã gắn. Giá đã chốt bên dưới. SePay và Casso chưa có API thì nút nạp hiện bảo trì.

**Khách trả tiền cho cái gì**

- Trả tiền để mở phòng trong một khoảng thời gian. Gợi ý bán 24 giờ kể từ lúc thanh toán, không bán theo ngày lịch. Mua lúc 23:50 mà khóa lúc 24:00 thì khách thấy bị hớ.
- Có thể thêm gói 7 ngày và 30 ngày sau, khi gói 24 giờ đã chạy.
- Trong thời gian đó dùng hết các chức năng đang bật. Không tính thêm theo phút, theo câu, hay theo model.
- Key Groq khách tự tạo hoặc tự mua trên Groq. Phòng không bán key, không tạo key hộ, không nạp hạn mức hộ. Có link tới trang key của Groq.
- Hết hạn mức key thì Groq từ chối. Phòng không hoàn tiền thuê vì việc đó. Trang giá phải nói trước.

**Vì sao đỡ lỗ hơn ví theo phút**

- Cước Groq do khách chịu. Phim dài hay model đắt không làm chủ web lỗ.
- Không cần đưa mọi lệnh Groq qua máy chủ chỉ để tính tiền. Key vẫn nằm trên máy khách, như hiện tại.
- Giá bán không bám 1.000 đ mỗi giờ nhận dạng. Khách đang mua công cụ, không mua token. Giá là một số tiền đồng cho 24 giờ, chủ web tự đặt.

**Việc bắt buộc nếu thu tiền thật**

- Có tài khoản. Hạn dùng lưu trên máy chủ. Chỉ giấu nút trên trình duyệt thì xóa bộ nhớ máy là vào lại được.
- Một tài khoản, một hoặc hai máy cùng lúc. Tránh một người mua rồi đưa mật khẩu cho cả nhóm.
- Cổng nạp tự mở khóa khi tiền vào. Chuyển khoản tay rồi chờ bật hộ thì gói theo ngày dễ chậm.
- Điều khoản riêng, khác bản cửa vào hiện tại. Nói rõ: tiền thuê là tiền mở phòng. Tiền Groq là tiền Groq. Không hứa đúng câu, đúng giọng. Khách chịu quyền video. Lỗi phòng kéo dài thì cộng giờ, không đền phần Groq vì không thu phần đó.
- Chưa có cổng nạp thì chưa thu. Việc này vẫn cần người biết luật ở Việt Nam xem trước lần nhận tiền đầu.

**Không kéo vào bản thuê đầu**

- Không tải video từ link về máy chủ. Phí theo ngày mà chủ web chịu băng thông thì người ta có thể đẩy file rất lớn.
- Không tắt lối dùng hiện tại trước khi cửa trả tiền chạy. Lối dán key dành cho người đang thử và cho chính chủ web.

**Thứ tự riêng của hướng này, khi được yêu cầu**

1. Chốt giá 24 giờ, bằng đồng.
2. Tài khoản và hạn dùng.
3. Cổng nạp, tiền vào thì mở phòng.
4. Điều khoản bản thuê.
5. Gói 7 ngày hoặc 30 ngày, nếu gói một ngày đã có người mua.

**Giá đã chốt 2026-11-06 00:54**

Bảng 19.000 / 59.000 / 149.000 và bảng 39.000 / 129.000 / 299.000 đều bỏ. Không dùng lại.

| Gói | Giá bán | Nếu mua lẻ từng ngày | Ưu đãi |
| --- | --- | --- | --- |
| Xem thử | 0 đ | — | 1 tệp, tối đa 10 phút, không quá 100 MB, không xuất file |
| 24 giờ | 9.000 đ | 9.000 đ | Một buổi |
| 7 ngày | 39.000 đ | 63.000 đ | Rẻ hơn bảy ngày lẻ |
| 30 ngày | 99.000 đ | 270.000 đ | Rẻ hơn ba mươi ngày lẻ |

VEED và Kapwing khoảng 16–25 đô một tháng, tức trên 400.000 đ, và giá đó đã gồm phần nhận dạng. Phòng này không gồm tiền Groq, nên tháng nên ở dưới 150.000 đ, ngang hoặc thấp hơn CapCut. 149.000 đ nằm đúng khoảng đó.

Đừng trông giá để kéo người tò mò quay lại mỗi ngày. Họ không có việc thì họ không quay lại. Người quay lại là người có tập sau. Muốn họ quay lại thì tài khoản phải giữ bảng nhân vật và thuật ngữ của bộ phim, lần sau không phân tích lại từ đầu. Gói tuần dành cho người làm vài tập trong tuần. Gói tháng dành cho người làm đều.

### 13.6 Dữ liệu tài khoản để ở đâu

Hiện chưa có đăng ký. Key, điều khoản đã bấm, thuật ngữ và cài đặt nằm trên trình duyệt của khách (`localStorage`). Đổi máy hoặc xóa dữ liệu trang là mất. Không quản lý được từ phía chủ web.

Khi làm đăng ký, dữ liệu khách để trên **Postgres Neon**. Code đã có đường này: đặt `DATABASE_URL` thì `getSql()` trong [src/lib/db.ts](src/lib/db.ts) nối Neon. Không đặt thì bản xem thử dùng PGLite, chỉ để chạy thử, tắt là mất. Không giữ khách thật trên PGLite.

Lưu trên Neon: email, tên, mật khẩu đã băm hoặc mã Google, hạn gói, số dư, lịch sử nạp. Bảng nhân vật và thuật ngữ theo bộ phim cũng để đây nếu muốn khách quay lại đúng bộ đó.

Không lưu trên máy chủ: file video, file tiếng, và key Groq. Key vẫn chỉ trên máy khách, như hiện tại. Video xử lý xong thì không giữ.

Chủ web xem và sửa qua trang quản trị của Neon lúc đầu. Chứng từ tiền nằm ở cổng nạp. Chưa làm trang quản trị riêng trong app.

### 13.7 Có cần thuê VPS không

Không, với hướng thuê phòng hiện tại. Web để trên Vercel. Dữ liệu tài khoản để trên Neon. Video và key Groq không lên máy chủ.

VPS chỉ đáng thuê nếu sau này máy chủ phải tải video, cắt tiếng hoặc giữ file lớn. Vercel không có ổ cứng lâu dài và mỗi lệnh có giới hạn thời gian. Bản thuê đầu không làm việc đó.

Bảo mật: `DATABASE_URL` và khóa đăng nhập chỉ đặt trong phần biến môi trường của Vercel, không ghi vào code, không để biến nào bắt đầu bằng `VITE_` chứa mật khẩu. Bật đăng nhập khi đã có `DATABASE_URL`. Chọn vùng Singapore cho Vercel và Neon cho gần Việt Nam. Bật bản sao lưu của Neon. Cổng nạp phải kiểm tra chữ ký trước khi cộng hạn gói.

Dời khỏi Vercel được. Chỗ gắn Vercel trong app chỉ là kiểu build (`preset: "vercel"` trong `vite.config.ts`). Không dùng kho file, kho khóa hay hàng đợi riêng của Vercel. Tài khoản nằm ở Neon, nên đổi chỗ chạy web không phải chuyển dữ liệu khách. Việc còn lại là đổi kiểu chạy sang máy Node, chép biến môi trường, trỏ tên miền. Nên chạy thử bản mới song song trước khi tắt bản Vercel.

### 13.8 Tài khoản, đăng nhập, ví

Trang `/goi` chỉ là màn bấm thử. Không tạo tài khoản, không giữ số dư.

Đăng nhập có khung sẵn nhưng đang tắt (`VITE_AUTH_ENABLED` không bật, email/mật khẩu trong `src/lib/auth/email-password.ts` đang `false`). Nút Google trong khung đó đi qua môi giới đăng nhập của Grok, chỉ có khi web được nền đó cấp khóa. Web tự đưa lên Vercel để kinh doanh thì không có môi giới đó. Muốn nút Google trên tên miền riêng thì phải tự tạo ứng dụng Google. Đường chắc hơn cho bản đầu là email và mật khẩu của chính web, lưu trên Neon.

Trang của khách, khi làm: tên, email, số dư, hạn gói, lịch sử nạp và mua, đổi mật khẩu, đăng xuất. Key Groq không hiện và không lưu trên máy chủ.

Nạp tiền chưa có cổng. Không cộng hạn gói chỉ vì trang báo đã trả. Cổng phải gửi thông báo có chữ ký, máy chủ kiểm tra xong mới cộng. Chưa chọn MoMo, VNPay hay chuyển khoản. Chưa có chỗ gửi thư đặt lại mật khẩu.

---

## 14. Nâng cấp nhận dạng và dịch — để sau, chưa code

User chốt ngày 2026-11-06: chất lượng nhận dạng và dịch là cốt lõi của phòng, sẽ nâng dần. Phiên này chỉ ghi kế hoạch. Không sửa `src/` cho đến khi user yêu cầu đúng một việc trong mục 14.2.

Key của chủ web và ví trả trước vẫn là mục 13.2. Không nằm trong mục này.

### 14.1. Không lấy làm đường nâng cấp của phòng này

Bản đặc tả «Nhận diện lời thoại + Dịch thuật video» 1.1, ngày 2026-11-06, mô tả sản phẩm khác: `pipeline_asr.py`, API Dola, Qwen3-ASR trên GPU thuê, key không ở trình duyệt, video luyện nghe, pinyin, HSK, Anki. App đang chạy là Whisper qua Groq, key của khách, xuất `.srt`. Không gắn đặc tả đó lên **v2.5.1**.

Không làm trong các lần tới, trừ khi user yêu cầu lại và đã có số đo của mục 14.3: thuê GPU, Qwen, ghép hai ASR, denoise mặc định, diarization, OCR chữ cứng, pinyin, HSK, Anki, chạy nhận dạng trên Vercel, đưa Dola làm mặc định.

### 14.2. Thứ tự khi được yêu cầu

Mỗi lần chỉ một việc. Xong, đo, rồi mới sang việc sau.

1. **Ngắt dòng file `.srt`.** Tối đa hai dòng, khoảng 42 ký tự một dòng. Chỉ dùng thuật toán trên câu đã dịch. Không dịch lại, không gọi thêm Groq. Vẫn là `.srt` đã hứa, không đổi điều khoản.
2. **Hồ sơ xưng hô cho cả phim**, chỉ điền khi ô tự xưng của nhân vật còn trống. Bảng nhân vật giữ nguyên. Bốn hồ sơ: thầy trò (tôi / em, thầy / cô), bạn bè (mình / cậu), cấp trên (tôi / anh / chị), trung tính (tôi / bạn). Đổi hồ sơ thì dịch lại, không vá từng đại từ. Không ghi vào điều khoản là bản dịch sẽ đúng xưng hô.

3. **Kiểm tra ngôn ngữ từng đoạn** — user yêu cầu «Claude sửa» ngày 2026-11-11 sau khi thẩm định; đã làm ở v3.12.0, mặc định tắt. Việc kế: đo trên phim lẫn tiếng có phụ đề chuẩn (mục 14.3) trước khi cân nhắc bật mặc định.

Chưa làm xuất VTT hoặc JSON. Thêm định dạng là thêm lời hứa, phải sửa điều khoản.

### 14.3. Công cụ đo, làm trước khi đổi model

Công cụ nội bộ, chưa đưa ra trang khách. Một bộ câu cố định, có lời đúng và bản dịch đã chấm. Không dùng file của khách. Không lấy số benchmark của hãng để ghi lên trang.

Sau mỗi lần nâng cấp, chạy lại bộ đó và ghi ba số, gắn với `APP_VERSION`:

- Số câu nghe sai.
- Số câu sai xưng hô, sai tên hoặc sai số.
- Số câu phụ đề quá dài so với thời gian hiện.

Whisper Turbo vẫn là mặc định cho đến khi ba số này cho thấy bản mới hơn bản đang chạy, và không có loại câu chính nào tệ đi rõ. Một phim nghe có vẻ ổn thì chưa đủ để đổi model.

Bật cơ sở dữ liệu mà vẫn tắt đăng nhập thì app cố ý chặn. Hai thứ phải bật cùng lúc. Lối dán key hiện tại giữ đến khi cửa trả tiền chạy được.

Không cần Google. Đăng ký và đăng nhập bằng email với mật khẩu là đủ, và làm được trên Neon.

MoMo và VNPay không có API miễn phí để nhận tiền thật. Phải có tài khoản người bán, giấy hộ kinh doanh hoặc doanh nghiệp, rồi mới được khóa. Thử nghiệm trên môi trường giả thì miễn phí, nhưng không vào ví thật. Ví MoMo cá nhân không gắn được vào API.

Đường nhận tiền sớm hơn là chuyển khoản ngân hàng qua SePay hoặc Casso. Đăng ký và môi trường thử miễn phí. Khi nhận tiền thật, SePay tính khoảng 200 đến 500 đồng mỗi lần, không theo phần trăm. Một số ngân hàng cho liên kết tài khoản cá nhân. Khách chuyển đúng số tiền, đúng nội dung, máy chủ nhận thông báo rồi mới mở gói.

Chưa làm cả ba cổng một lúc. Làm email, ví, hạn gói trước. Nạp tiền thật để sau, khi đã có tài khoản ngân hàng nối SePay.

**Dùng thử, chưa chốt (2026-11-05 17:59).** User muốn 1 tệp, tối đa 10 phút, không quá 50 MB, đủ chức năng, không xuất file Vietsub. Gợi ý: đo 10 phút theo thời lượng phát. 50 MB dễ loại nhầm video điện thoại đủ ngắn. Key Groq của bản thử vẫn là key khách, không phải key chủ web. Một email một lượt. Bản thử không chạy lại nhận dạng và không dò khoảng trống.

---
*File này nên được commit hoặc gửi kèm mỗi lần chuyển model AI.*

---

## 15. Trả theo lượt — khung đã dựng, chưa dùng được

User chốt ngày 2026-11-06, buổi tối. Đây là lát cắt đầu của mục 13.2, không thay mục 13.2. Dán link, đơn giá link, và đăng nhập Google vẫn để sau.

Từ **v2.10.0**, Chủ bấm Lưu key thì key nằm trong `room_settings`, không đưa ra trang khách. Khách còn hạn, chọn trả theo lượt, thì trình duyệt gọi đường của phòng và máy chủ gắn key đó khi nói chuyện với Groq. Tải lại trang quản trị thì Chủ thấy lại key. Chưa trừ ví.

Phần dưới là việc sẽ làm khi user yêu cầu đúng mục này. Không coi khung là cửa đã mở.

Không làm cổng cho thuê API. Điều khoản Groq, sửa ngày 22/06/2026, cho gắn Groq vào ứng dụng của phòng cho người dùng cuối, và cấm bán lại hoặc cho thuê tài khoản Groq nếu chưa có chấp thuận bằng văn bản. Khách không nhận key. Không có khóa cho lập trình viên.

### 15.1. Hai cửa

Một lần chạy chỉ một cửa. Không cộng gói ngày và ví vào cùng một lần.

| | Cửa 1, đang chạy | Cửa 2, trả theo lượt |
|---|---|---|
| Key | Của khách, trên trình duyệt | Của chủ, chỉ ở máy chủ |
| Tiền phòng | 9.000 / 39.000 / 99.000 đ | Không bán gói ngày cho lần này |
| Tiền Groq | Groq tính khách | Khách trả phòng, bằng đồng |
| Tệp | Chọn trên máy khách | Vẫn chọn trên máy khách |

Dùng thử không đi qua cửa 2. Cửa 2 chỉ mở khi SePay hoặc Casso đã cộng tiền thật. Hết hạn mức Groq thì Chủ đóng cửa 2. Cửa 1 vẫn chạy.

Khách thấy một đơn giá mỗi phút tiếng, đã gồm nhận dạng, dịch và phần chênh. Không hiện hóa đơn gốc của Groq. Turbo và Large có hai ô giá, vì cước Groq khác nhau. Nội bộ vẫn ghi giờ tiếng và token để đối soát. Phim dài thì tiền dịch có thể lớn hơn tiền nhận dạng, nên đơn giá phải có đệm. Đổi đơn giá không sửa phiếu cũ.

Trước khi gửi Groq, hiện thời lượng, đơn giá, số giữ chỗ và số dư còn lại. Khách bấm giữ chỗ thì mới chạy. Hết số đã giữ thì dừng ở đoạn kế. Phần đã dịch trên máy khách không xóa. Đoạn Groq lỗi không tính tiền. Xong thì trừ số thực, nhả phần giữ thừa. Khách xuất được file của đúng lần đã trả, kể cả khi không có gói ngày.

### 15.2. Chỗ trên màn hình

Tab Key Sub có hai lựa chọn: **Key của tôi** và **Trả theo lượt**. Cửa 2 thì ẩn ô key, hiện số dư, đơn giá của model đang chọn, và nút nạp tiền.

Trong Tài khoản thêm số dư, đơn giá đang áp, và sổ phiếu. Có nút xem thêm. Không thêm trang mới.

### 15.3. Phiếu

Mỗi lần chạy một phiếu. Ghi giờ, tên tệp, cửa đã chọn, phút tiếng, đơn giá lúc chạy, số giữ, số trừ, số nhả. Không ghi lời thoại, không ghi video, không ghi key.

Trạng thái chỉ dùng: Đang giữ, Đã trừ, Đã nhả, Dừng vì hết tiền, Lỗi nhận dạng, Đã hoàn vào ví.

Nút **Hỏi về lần này** tạo yêu cầu kèm mã phiếu. Phòng không giữ tệp, nên không chạy lại giúp. Khách muốn chạy tiếp thì chọn lại tệp trên máy.

### 15.4. Quyền trên sổ lượt

Hỗ trợ, khi tìm email, thấy sổ lượt của người đó. Được trả lời và ghi chú. Không khóa, không hoàn tiền, không đổi giá. Không thấy key, phụ đề, hay video. Việc hỏi về tiền chuyển thẳng cho Quản lý, không chờ hai giờ.

Câu trả lời sẵn: lần này trừ đúng số phút đã chạy, đơn giá là giá lúc bấm chạy. Phần giữ thừa đã về số dư. Đoạn lỗi không tính tiền. Tệp không còn trên phòng. Cửa trả theo lượt đang đóng thì key của khách vẫn dùng được.

Quản lý, trên một phiếu, được nhả khoản đang giữ nếu phiếu kẹt, và được hoàn vào ví một phần hoặc toàn bộ số đã trừ của đúng phiếu đó. Bắt buộc có lý do. Không hoàn quá số đã trừ. Không hoàn ra ngân hàng ở bản này. Khóa, mở hạn và mật khẩu tạm giữ như hiện tại. Quản lý không xem sổ của Chủ.

Chủ sửa hai đơn giá, đóng hoặc mở cửa 2, và viết câu khách thấy khi cửa đóng. Đặt hạn mức đồng mỗi khách mỗi ngày. Đủ hạn thì chỉ khách đó dừng. Ba số trong ngày: tổng đang giữ, tổng đã trừ, số phiếu lỗi. Không có nội dung phim. Trang Quản lý không hiện key của phòng. Key chỉ là biến môi trường của máy chủ, không bắt đầu bằng `VITE_`.

Nhân viên không chấm phụ đề đúng hay sai. Phòng không giữ lời thoại. Chất lượng nằm ở mục 14.3.

### 15.5. Điều khoản khi bật

Phải nâng `TERMS_VERSION`. Viết rõ tiếng và chữ đi qua máy chủ rồi tới Groq, chỉ giữ lúc xử lý rồi xóa. Giá là ước tính, số trừ là số thực. Khách đồng ý bản mới trước lần trả tiền đầu của cửa 2. Không hứa dịch đúng hết.

### 15.6. Chưa làm trong lát cắt này

Không nhận link video. Không có khóa API cho lập trình viên. Không hiện hóa đơn Groq. Không cộng tiền gói ngày vào lần trả theo lượt. Không hoàn ra ngân hàng.

---

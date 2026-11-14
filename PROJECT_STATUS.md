# PROJECT STATUS — Dịch phụ đề video (TyZo_Sub_Project, tên cũ: phudedep)

> **Nhìn nhanh:** đọc `BANG_DIEU.md` trước. File này là hồ sơ. Bảng đầu là trạng thái hiện tại. Từ mục 6 trở đi là nhật ký, không được làm theo.

| Thông tin | Giá trị |
|-----------|---------|
| **Cập nhật lần cuối** | 2026-11-14 23:55 (UTC+7) — v3.38.0 trên nhánh work: màn hình Dịch trực tiếp (bước 5 đến 8: chữ chạy, số dư và còn N phút, tải SRT/VTT/TXT, chọn ngôn ngữ, menu). Trước đó v3.37.0 trên nhánh work: chạy tốt theo từng loại thiết bị (device-caps, khóa sáng màn hình, toàn màn hình iPhone). Trước đó v3.36.0 trên nhánh work: trang chủ thoáng hơn, chữ lớn hơn, kéo thả có hiệu ứng. Trước đó v3.35.0 trên nhánh work: Thuật ngữ và Gói dịch vào nhóm Nâng cao của menu trái. Trước đó v3.34.0 trên nhánh work: thẻ tiền (số dư, còn khoảng bao nhiêu phút, ước tính trước khi chạy, nạp nhanh). Trước đó v3.33.0: thanh tiến trình liền, sửa câu tại dòng, menu tải SRT/VTT/TXT. Trước đó v3.32.0: trang chủ một ô thả lớn, dán link tự bắt đầu, Ctrl+K cho trang khách. Trước đó v3.31.2 trên nhánh work: menu ba gạch trái cho Admin và trang khách, Đăng xuất ở cuối menu; mọi tab Admin thẻ cùng khung, key Groq/Alibaba xếp đôi. Trước đó v3.31.1 trên nhánh work: tab Admin xếp lưới đều, tab Cấu hình mới. Trước đó v3.31.0 trên nhánh work: Admin giai đoạn 2 (thanh bên trái, Ctrl+K, mobile, Doanh thu có biểu đồ, ARPU, chuyển đổi, giá vốn mỗi phút, chi phí theo loại). Trước đó v3.30.0 trên nhánh work: Admin giai đoạn 1 (tab Tổng quan, lọc và tìm phiếu, Nhật ký thao tác tách riêng). Trước đó v3.29.4 trên nhánh work: sửa 6 lỗi báo lỗi và trạng thái (đăng nhập, nút đăng nhập, xuất file rỗng, link, mất mạng, model key chưa mở). Trước đó v3.29.3 trên nhánh work: P3-14, lỗi giải mã âm thanh nói rõ loại file và đưa lệnh ffmpeg. Trước đó v3.29.2 trên nhánh work: P3-13, hạn chót đọc hết phản hồi Groq (đầu 120 giây, thân 120 giây, phía máy chủ 100 giây). Trước đó v3.29.1 trên nhánh work: sửa mục 11 (nút sáng/tối luôn hiện, chế độ gọn không đè Tailwind). Trước đó v3.29.0 trên nhánh work: P3 (sáng/tối + mật độ do khách chọn, kiểm tra key và model trước khi dịch). Trước đó v3.28.0 P2 (kéo thả video + ảnh xem trước, tiến trình theo bước, hướng dẫn lần đầu). Trước đó v3.27.0 P1 (giá vốn phiếu cũ, ngưỡng chất lượng Chủ chỉnh, thuật ngữ nền tự bật). Điều khoản 2026-11-13.4. |
| **Người báo cáo lỗi** | User (Thanh Khanh) |
| **Phiên bản code** | **v3.38.0** trên nhánh `work`. Điều khoản `2026-11-13.4`. |
| **Trạng thái tổng** | Phòng dịch và thuê phòng đã gắn. Giá 9.000 / 39.000 / 99.000 đ. Cửa trả theo lượt đã giữ và trừ ví. Mục 13.2 không được code. v2.19.1 đã sửa các lỗi còn mở sau báo cáo Claude, trừ T6 (không khóa máy thật) và S9 (HE-AAC, elst chỉ bản 0). VAD đã đối chiếu tên tensor bằng wasm, chưa bấm trên điện thoại. Quy trình cho AI nằm ở `huongdan.txt`. |

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
| 58 | Giao diện mới, giai đoạn 1: nền móng | 🟡 Đã có test, chưa thử tab bằng Chủ thật | Token sáng/tối, phông trong danh sách, icon theo chỗ đặt (Phosphor, 6 độ đậm), nháp/công bố/lịch sử, chặn chữ khó đọc. Tab Admin «Giao diện» (chỉ Chủ). Mặc định tối nên khách chưa thấy đổi. Từ v3.29.1 khách tự đổi sáng/tối và gọn/thoải mái được ở mọi cấu hình; Admin chỉ đặt mặc định lúc mở. Chưa dựng lại bố cục Studio và các trang (giai đoạn 2 trở đi). Màu cứng còn lại: `quality-view`, `top-up`, `admin-desk`, ô màu phụ đề trong `studio.tsx`, logo SVG. Test: `src/lib/theme/theme.test.ts`. |
| 57 | Số liệu chất lượng về Admin | 🟡 Đã có test và build, chưa thử đăng nhập thật | v3.13.0. Tab «Chất lượng» (Chủ): đèn, thanh ba màu, theo ngày, ngôn ngữ, model, phiên bản, riêng key riêng/key phòng và tổng. Điều khoản 2026-11-12.3. |
| 56 | Kiểm tra ngôn ngữ từng đoạn | 🟡 Đã có test, chưa chạy phim thật | v3.12.0. Ô tùy chọn, mặc định tắt. Đoạn nghi lệch ngôn ngữ hoặc độ tin thấp được nhận dạng lại một lần không ép ngôn ngữ, ngân sách 120 giây, chỉ đổi khi tốt hơn rõ. Test: `lang-check.test.ts`. Chưa đo trên phim lẫn tiếng. |
| 55 | Trả theo lượt | 🟡 Đã trừ ví theo giá Groq cộng chênh | Từ v2.17.0 giữ tiền trước, trừ số thực, nhả phần thừa. v2.18.0: hoàn và nhả giữ không cộng hai lần. Key phòng không trả nguyên văn về trình duyệt. |

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

## 6. Lịch sử thay đổi / Tiến độ

> Từ 2026-11-08 20:03, mục này là nhật ký. Không làm theo các dòng cũ. Lệnh hiện tại nằm ở `BANG_DIEU.md`.

- 2026-11-14 10:03 — v3.30.0 trên work (theo yêu cầu: gói cải tiến Admin A–F, giai đoạn 1). Làm: A (tab Tổng quan mặc định, bộ lọc Hôm nay/7/30 ngày, doanh thu, lượt chạy và tỷ lệ lỗi, chất lượng cần chú ý, đơn nạp chờ, cảnh báo, top 5 chi tiêu và lỗi, nút Xem chi tiết), B (phiếu lọc theo trạng thái, tìm email/tên tệp, cột Model và Thời gian xử lý nhờ migration 0022, lịch sử bảo trì từ audit), E (tách Nhật ký thao tác khỏi Nhật ký hệ thống, nhãn tiếng Việt cho các hành động). Test mới `overview-data.test.ts` (9 ca, PGLite); `npm test` 416 pass, 0 fail; `npx tsc --noEmit` còn đúng 5 lỗi có sẵn. Không đổi điều khoản. Chưa làm: C, D, F, «chặn toàn bộ phòng»; D đụng thiết kế riêng tư của quality_runs (không lưu tài khoản và chữ phụ đề). Cảnh báo key hết hạn và rate-limit chưa làm được vì không có dữ liệu. Chưa thử trình duyệt thật và Neon thật (chỉ PGLite); migration 0022 sẽ tự chạy khi build.
- 2026-11-14 09:15 — v3.29.4 trên work (theo yêu cầu: 6 lỗi báo lỗi và trạng thái). Làm: (1) đăng nhập sai báo «Email hoặc mật khẩu chưa đúng…»; (2) nút Đăng nhập disabled + spinner + «Đang đăng nhập… Đừng tắt trang», chốt chống gửi đôi; (3) «Xuất file Vietsub» khóa khi chưa có phụ đề, bấm vào ra toast; (4) cảnh báo link khi rời ô hoặc dán, chỉ nhắc, không chặn (start() chỉ chặn link hỏng hẳn); (5) banner đỏ mất mạng ở __root, khóa các nút gọi mạng; (6) lối và model key chưa mở mờ, nhãn «Key chưa mở», không chọn được. Test `link-check.test.ts` (6 ca) thêm vào `npm test`; `npm test` 407 pass, 0 fail; `npx tsc --noEmit` còn đúng 5 lỗi có sẵn (watch-run, watch-save, room-alibaba); eslint còn 3 lỗi có sẵn ở studio.tsx. Không đổi điều khoản. Chưa thử bằng trình duyệt thật và điện thoại thật. Chưa khóa hết mọi nút khi mất mạng, chỉ các nút gọi mạng chính.
- 2026-11-14 07:22 — v3.29.3 trên work (theo yêu cầu: P3 mục 14, thêm codec hoặc báo lỗi rõ kèm hướng dẫn convert). Chọn báo lỗi rõ, không thêm bộ giải mã (AC3/DTS/TrueHD/WMA trình duyệt không đọc; không mang ffmpeg.wasm, trái mục «Không làm» về bộ giải mã riêng). `src/lib/sub/media-sniff.ts`: nhận gói file và loại âm thanh từ 2 MB đầu (MP4 theo fourcc, MKV theo CodecID, AC3 thô theo bsid...), `describeDecodeFailure` ra câu tiếng Việt kèm lệnh `ffmpeg -i "tên file" ... am-thanh.m4a`. `decodeTo16k` dùng câu này thay câu chung chung; `mp4.ts` ghi loại mẫu âm thanh đã thấy. Test mới `media-sniff.test.ts` (15 ca), đã thêm vào `npm test`. Giới hạn: MKV có bảng track sau 2 MB thì chỉ báo tên gói. Không đổi điều khoản. Chưa chạy `npx tsc --noEmit` và `npm test` đầy đủ (không cài được node_modules); tsc riêng các file đụng tới không lỗi. Chưa thử với file MKV/AC3 thật.
- 2026-11-14 07:19 — v3.29.2 trên work (theo yêu cầu: P3 mục 13, timeout đọc full response Groq). Lỗi: hạn 120 giây chỉ bao tới lúc có đầu phản hồi, `response.json()` / `blob()` không có hạn, nên Groq gửi đầu rồi đứng thân thì lần dịch treo mãi. Sửa: `src/lib/sub/http-deadline.ts` (hai hạn riêng, đầu và thân), `requestWithRetry` đọc thân trong vòng thử lại (quá hạn thì thử lại, hủy vẫn là AbortError), `listModelIds` 30 giây, `speakOrpheus` có hạn, `room-groq.ts` đặt 100 giây cho yêu cầu gửi Groq và trả 504 khi quá hạn. Test mới `http-deadline.test.ts` (7 ca, máy chủ HTTP cục bộ), đã thêm vào `npm test`. Không đổi điều khoản. Chưa chạy `npx tsc --noEmit` và `npm test` đầy đủ (không cài được node_modules); tsc riêng `groq.ts` và `http-deadline.ts` không lỗi. Chưa thử với Groq thật.
- 2026-11-14 07:00 — v3.29.1 trên work (theo yêu cầu: sửa mục 11, sáng/tối + gọn/thoải mái). (a) `modeScript` đọc lựa chọn khách ở mọi chế độ Admin, `DisplayToggle` luôn hiện hai nút và đồng bộ `theme-color` lúc mở; nhãn Admin «Luôn tối/sáng» đổi thành «Mặc định tối/sáng». Trước đó nút sáng/tối ẩn khi Admin để tối, mà mặc định là tối. (b) Khối CSS mật độ ở cuối `styles.css` đè Tailwind vì nằm ngoài `@layer`: lớp phủ `p-2 sm:p-3` ép 8px thay 12px, ô tìm kiếm `px-3 pl-9` mất padding icon. Nay bọc `:where()` và loại phần tử có lớp cùng loại. Đo bằng Chrome thật: 15 màn ở mật độ 1, 0 phần tử bị đổi; chế độ Gọn co gap 8px còn 6,8px, không tràn ngang. Test `theme.test.ts` (18 ca). Ngoài phạm vi, chưa sửa: 5 lỗi `tsc` có sẵn (`watch-run.ts`, `watch-save.ts`, `room-alibaba.ts`) (`routeTree.gen.ts` đã sinh lại, commit kèm); ghi ở `BANG_DIEU.md` mục «Còn mở». Không đổi điều khoản.
- 2026-11-14 05:46 — v3.29.0 trên work (theo yêu cầu). P3: (11) nút sáng/tối và nút Gọn/Thoải mái ở đầu trang (`display-toggle.tsx`), lưu `tyzo_mode` và `tyzo_density`; Admin đặt «Luôn sáng/tối» thì nút sáng/tối ẩn; `--density` giờ có tác dụng thật lên gap và padding (không đổi chiều cao nút, giữ vùng chạm 44px). (12) Dán key Groq thì 0,8 giây sau tự gọi danh sách model, báo dưới ô key: key sai, bị giới hạn 429, thiếu model nhận dạng hoặc dịch. `start` kiểm lại trước khi giữ tiền hay trừ lượt thử, mất mạng hoặc Groq 5xx thì không chặn. Groq không có lệnh hỏi số dư hạn mức nên chỉ hiện số còn lại khi Groq gửi kèm. Không đổi điều khoản. Chưa thử trên trình duyệt thật (không vào được phòng chiếu vì cần đăng nhập).
- 2026-11-14 05:07 — v3.28.0 trên work (theo yêu cầu). P2: (8) khung chọn video lớn trên player, kéo thả, ảnh xem trước lấy trên máy; (9) thanh tiến trình Cắt / Nhận dạng / Dịch / Sửa lại; (10) hướng dẫn lần đầu 4 bước, nút dấu hỏi mở lại. Không đổi điều khoản. Chưa thử trình duyệt thật.
- 2026-11-14 04:34 — v3.27.0 trên work (Claude sửa theo yêu cầu). P1: (5) migration 0021 `base_est`, nút Chủ «Ước tính giá vốn» cho phiếu cũ, Lời lỗ ghi rõ phần ước tính. (6) Chủ chỉnh 10 ngưỡng chất lượng trong Admin, chưa chỉnh theo số đo thật vì chưa có số. (7) Thể loại thường tự kèm bộ `auto` của ngôn ngữ nguồn, khách tắt được; adult, sex và auto đứng riêng. Chỉ đổi chữ và hành vi mặc định, không đổi điều khoản. Chưa thử trên điện thoại thật.
- 2026-11-14 04:25 — v3.26.0 trên work (Claude sửa theo yêu cầu). P0: ô email đăng nhập type=email, dán nguyên địa chỉ; viết lại câu changelog 3.24.1; che tên tệp trong Admin → Việc và nút Hoàn phiếu (`mask-file-name.ts`); ghi chú và tooltip cho Key của tôi / Trả theo lượt. Chỉ đổi chữ, không đổi điều khoản. `tsc` còn 10 lỗi cũ ở watch-run, watch-save, relay-alibaba, room-alibaba, tai-video, tai-khoan (không thuộc các file đã sửa, chưa xử lý). Test liên quan 22/22 xanh. Chưa thử trên điện thoại thật.
- 2026-11-13 01:38 — v3.25.0 trên work. Trả theo lượt nhận dạng Alibaba bằng key phòng, cần link file trực tiếp. Việc Alibaba ngoài nhận dạng vẫn chặn. Điều khoản 2026-11-13.4.
- 2026-11-13 00:49 — v3.24.1 trên work. Sau bản mới: không giữ khóa migration khi không có file mới, bảng giá không chờ tải dài, trang quản lý tự thử lại và không hiện sai quyền khi đang khởi động.
- 2026-11-13 00:25 — v3.24.0 trên work, bước 6 và 7. `quoteTurnPacks` trả ước tính và khoản giữ, không trả giá gốc. Chủ sửa phần trăm Alibaba trên khung gói. Phần trăm Groq vẫn ở bàn Việc. Điều khoản 2026-11-13.3.
- 2026-11-13 00:20 — v3.23.0 trên work, bước 5. Cửa trả theo lượt hiện gói đã bật. Khách chọn gói thì model nhận dạng và dịch theo gói, chạy bằng key của phòng. Gói có việc Alibaba bị chặn, chưa gọi. Chưa có gói thì vẫn Whisper. Không hiện giá gốc. Điều khoản 2026-11-13.2.
- 2026-11-13 00:10 — v3.22.0 trên work, bước 4. Chủ lưu `rent_show`. Khách thuê phòng chỉ chọn model trong danh sách, dùng key của mình. Whisper khóa theo Groq, Filetrans khóa theo Alibaba. Dịch Alibaba chưa nối. Điều khoản 2026-11-13.1. Cửa trả theo lượt không đổi.
- 2026-11-13 00:01 — v3.21.0 trên work, bước 3. Tab Việc của Chủ hiện khung gói (`ServicePackBoard` chỉ phần gói). Mỗi việc chọn Groq hoặc Alibaba và một model. Lưu bằng `saveServicePacks`. Khách chưa chọn gói. Không đổi điều khoản.
- 2026-11-12 23:55 — v3.20.0 trên work, bước 2. Tab Việc của Chủ có ô key Alibaba (`alibaba-key-board.tsx`), lưu `alibaba_key`, không đè key Groq. `listModelIds` gọi đúng máy Alibaba khi đồng bộ. Không đổi điều khoản. Cửa trả theo lượt chưa dùng key này.
- 2026-11-12 23:44 — v3.19.0 trên work, bước 1 tách nhà nhận dạng. Danh sách model Groq không còn khóa Alibaba. Key của khách chọn Alibaba Filetrans được. Cửa trả theo lượt không nhận dạng Alibaba và báo rõ. Bàn giá Groq bỏ dòng Alibaba. Điều khoản 2026-11-12.4. Chưa làm quản lý key từng nhà, gói tùy chọn, giá chênh Alibaba cho cửa trả theo lượt.
- 2026-11-12 17:21 — v3.18.0 trên work (lệnh «Claude sửa», giai đoạn 1 dựng lại giao diện). Nền móng, chưa đổi bố cục Studio: `src/lib/theme/theme.ts` (token sáng/tối, phông, icon theo chỗ đặt, làm sạch, chặn tương phản), `src/lib/theme-room.ts` (lưu ở `room_settings`, nháp/công bố/lịch sử 10 bản, chỉ Chủ), `src/components/ui/*` (Icon Phosphor, Button, Card, Badge, Field, Segmented), tab Admin «Giao diện» (`theme-board.tsx`), `__root.tsx` tiêm theme lúc tải. Mặc định tối nên khách không thấy đổi. Test mới `theme.test.ts` 11 ca. Kiểm tra: `tsc --noEmit` sạch; `npm test` 191 + 321 pass, 0 fail; mở `/` trên điện thoại và máy tính, ép chế độ sáng, dựng thử khung xem trước hai chế độ. Chưa thử tab Giao diện bằng tài khoản Chủ thật (đăng nhập đi qua dịch vụ ngoài), chưa thử trên Vercel, chưa chạy `npm run build`. Không đổi điều khoản. Sao lưu bản trước: thư mục v3.13.0 ngoài gói.
- 2026-11-12.38:18 — v3.12.1 và v3.13.0 trên work (lệnh «Claude sửa», Chủ duyệt: báo cả key riêng lẫn key phòng, hiện riêng từng loại và tổng, chỉ Chủ xem, không xem video và key). v3.12.1: `src/lib/sub/quality.ts` (độ tin từ `avg_logprob`: cao từ -0,5, thấp dưới -0,8 hoặc nén trên 2,4; đèn xanh/vàng/đỏ theo ngưỡng ước lượng đặt thành hằng số), khối «Chất lượng» và «Kiểm tra ngôn ngữ» trong tab Kiểm tra, thêm vào Xuất JSON, `components/quality-view.tsx`. v3.13.0: bảng `quality_runs` (migration 0019, chỉ số, không có mã tài khoản, tên tệp, chữ, key), `src/lib/quality-room.ts` (`reportQuality` kiểm tra và giới hạn 30 lần/giờ/tài khoản, `getQualityBoard` chỉ Chủ), `src/lib/quality-board.ts` (kiểm tra bản báo, gộp số, gợi ý chỉnh), tab Admin «Chất lượng» (`quality-board.tsx`), `use-pipeline.ts` gửi một bản sau khi nhận dạng xong mọi đoạn (một lần mỗi lần chạy, lỗi thì bỏ qua). Điều khoản nâng `2026-11-12.3`, thêm hai đoạn ở mục 4. Đã chạy: `tsc` sạch, `npm test` 191 + 310 đạt, `npm run build` được, truy vấn SQL thử trên PGLite, kết xuất thử HealthPill và BandBar. Chưa thử: đăng nhập thật, gửi từ trình duyệt thật, hiển thị tab Chất lượng, Postgres thật. Số do trình duyệt khách báo nên không kiểm chứng được; ngưỡng đèn chưa chỉnh theo số đo.
- 2026-11-12.32:16 — v3.12.0 trên work (Claude sửa theo lệnh «Claude sửa», sau khi thẩm định đề xuất ChatGPT về backend Python/GPU và quyết định không làm đường đó): thêm ô «Kiểm tra ngôn ngữ từng đoạn», mặc định tắt, nhớ trên máy (`glang`). Mới: `src/lib/sub/lang-check.ts` (đếm chữ Hán/Kana/Hangul/Latin, `needsLangCheck`, `chooseBetter`, ngân sách 120 giây) và `lang-check.test.ts` (12 test, đã thêm vào `npm test`). `use-pipeline.ts`: sau lần nhận dạng đầu của một đoạn, nếu chữ lệch ngôn ngữ đã chọn hoặc trung bình `avg_logprob` dưới -0,8 thì gửi lại đúng đoạn đó một lần, không ép ngôn ngữ, không prompt; chỉ đổi khi ngôn ngữ đoán thuộc Trung/Hàn/Nhật/Anh, khác ngôn ngữ đã chọn, và chữ khớp lại hoặc độ tin cao hơn từ 0,2. Lỗi gửi lại thì giữ kết quả cũ. Không đổi Whisper Turbo, không đổi điều khoản (tính năng tùy chọn, mặc định tắt, không đổi lời hứa dịch vụ). Giới hạn đã biết: Whisper bị ép ngôn ngữ thường dịch/phiên âm sang đúng chữ viết đã ép nên dấu hiệu chữ viết không bắt được ca đó, chỉ độ tin thấp bắt được; câu đổi ngôn ngữ vẫn được dịch với `sourceLang` chung của phim. Đã chạy `npx tsc --noEmit` sạch và `npm test` (191 pass, 7 bỏ qua; 291 pass). Chưa gọi Groq thật, chưa thử trên điện thoại, chưa có số đo CER/WER trước và sau.
- 2026-11-11 05:20 — v3.10.10 trên work (Claude sửa theo ảnh chụp user): trang Tài khoản trên điện thoại mất đầu trang, trống giữa, cụt đáy. Nguyên nhân: `.account-grid` dùng `column-width` (cột kiểu báo) nhưng cùng phần tử bị ép `flex-1 overflow-y-auto`, nên trình duyệt xếp nội dung theo chiều cao khung rồi đẩy phần dư sang cột ẩn bên phải (lỗi có từ v3.10.6). Sửa `account-panel.tsx`: khung cuộn ở ngoài, `.account-grid` ở trong với chiều cao tự nhiên. Chưa thử trên điện thoại thật.
- 2026-11-11 04:58 — v3.10.9 trên work (Claude sửa theo lệnh user, kiểm tra toàn bộ): (1) `studio.tsx`: danh sách bản dịch tách thành `CueRow` có memo và `content-visibility`, ô sửa nhớ câu theo nội dung chứ không theo số thứ tự. (2) `use-pipeline.ts`: bản dịch máy không ghi đè câu người dùng vừa sửa tay; đặt cờ `data-tyzo-busy` khi đang chạy. (3) `idle-sign-out.tsx`: không đăng xuất khi đang phát video hoặc đang chạy. (4) `pay-match.ts`, `pay-store.ts`: mã đơn nạp lấy trọn byte ngẫu nhiên (32^6 mã thay vì khoảng 16 triệu). Chưa chạy `tsc` đầy đủ và 9 file test cần pglite, jose, nodemailer, tanstack vì thiếu node_modules và không có mạng. Chi tiết: `BAO_CAO_KIEM_TRA.md`.
- 2026-11-11 04:19 — v3.10.8 trên work (Claude sửa theo lệnh user): lỗi đứng máy. (1) `use-pipeline.ts`: nhận dạng và dịch dùng chung một tín hiệu hủy, một bên lỗi thì bên kia dừng; trước đó `inner` tạo ra mà không luồng nào dùng, nên dịch chờ nhận dạng mãi. (2) `groq.ts`, `mp4.ts`: fetch Groq chờ tối đa 120 giây, tải Range 60 giây, quá hạn thì thử lại hoặc báo. (3) `update-banner.tsx`: bỏ tự `reload` khi quay lại tab sau 5 phút. Chưa chạy `tsc` và `npm test` vì gói không có node_modules và không có mạng. Chưa làm: giải mã quá 25 giây vẫn tính đoạn lỗi; kết quả nhận dạng vẫn hiện theo thứ tự đoạn.
- 2026-11-11 03:28 — v3.10.7 trên work: sửa layout lệch theo ảnh chụp. Ô tick và ô màu tab Thư, chữ đè nút phát, tiêu đề Gmail vô hình, khoảng trống thẻ Trả theo lượt, nửa phải trống ở Sơ đồ, Doanh thu, Thuật ngữ, Cộng tác, Nhật ký, nút Lọc, ô thống kê lẻ. Dựng thử CSS trong Chromium. `tsc` và `npm test` đủ chưa chạy được (thiếu node_modules); test chạy được pass như bản gốc.
- 2026-11-10 07:56 — v3.10.2 trên work: bỏ v3.10.1, lấy lại mã v3.10.0 rồi làm lại nút nạp, dòng chờ và lời xin lỗi. `tsc` sạch.
- 2026-11-10 07:45 — v3.10.1 trên work: nút nạp thẳng hàng, dòng chờ một hàng. Bản này bị lệch thêm, không dùng.
- 2026-11-10 07:15 — v3.10.0 trên work: thẻ nạp vừa khung điện thoại, khách hủy được đơn, cộng tiền thì hiện lời cảm ơn. `tsc` sạch.
- 2026-11-10 07:00 — v3.9.0 trên work: thẻ chuyển khoản có sao chép, đếm 15 phút, tự kiểm tra và lịch sử theo màu. Đơn quá 15 phút không được webhook cộng. `tsc` sạch.
- 2026-11-10 02:44 — v3.8.0 trên work: bốn lối dịch. Một lần dịch một model. `tsc` sạch.
- 2026-11-10 01:35 — Chỉ tài liệu. Ghi 5 mục thư còn lại vào `BANG_DIEU.md`. Xong mục nào thì xóa mục đó.
- 2026-11-09 21:39 — v3.7.1 trên work: ô số trong tab Thư xếp dọc, xem trước thư ghim phía trên. `tsc` sạch.
- 2026-11-08 18:52 — v2.19.0: Nhóm 3 và 4. Ngưỡng năng lượng theo đỉnh file; khoảng trống chọn theo giây tính tiền. Dịch nửa lô không nuốt 401/403/429. Xóa tài khoản giữ sổ, hủy đơn chờ, nhả giữ, dọn thiết bị/chuông/hiện diện. Yêu cầu công khai có trần chung; chỉ email đã xác minh đọc được trả lời của người khác. Webhook so số tài khoản khi payload có số; so khóa bằng hash. Casso 1 lần / 15 giây. Câu sửa tay không bị dịch đè. Tên riêng tối đa 4 từ không bị coi là chưa dịch. Migration bỏ qua khi `VERCEL_ENV` khác production, thiếu `DATABASE_URL` trên production thì thoát 1. Orpheus cắt 180 ký tự và rơi về giọng máy. Đã chép `ort-wasm-simd-threaded.mjs`, chưa chạy thử VAD. Từ điển không dấu cách nhận 1 ký tự. Đoán giới tính theo ranh giới từ. Hạ tần số lấy trung bình cửa sổ. Phân tích phim tối đa khoảng 40.000 ký tự. `known()` chỉ nhận model trong danh mục. Xóa mã P2P không được gọi. Phụ đề kẹp thời gian không đè câu sau. Khóa giọng theo thời điểm. MP4 bù elst bản 0; HE-AAC trả về đường giải mã của trình duyệt. VietQR khi nhận ra BIN; điều khoản `2026-11-08.3` và ghi `terms_version`. Test phụ thuộc `.grok/skills` được bỏ qua nếu thư mục không có. Chưa làm T6 (không bịa khóa thiết bị). `tsc` sạch. Test nhóm vừa sửa: 1 fail do test Orpheus nhập alias `@/` rồi đã bỏ file đó; các test còn lại trong lượt đó pass.
- 2026-11-08 17:20 — v2.17.1: `claimTrialDevice` bị chặn 403 với tài khoản khóa nên ví không hiện: `account-panel.tsx` rơi về `getRoomAccount()`. `PayQueue` nhận `owner`, chỉ Chủ thấy nút «Xác nhận đã nhận tiền». SQL webhook nạp, mua gói, hoàn tiền tách thành `src/lib/pay-flow.ts` (`creditHitWith`, `buyPlanWith`, `refundRunWith`), logic giữ nguyên, để test được (`money-flow.test.ts`). Test đồng thời hoàn tiền đang đánh dấu todo vì tái hiện lỗi C2.
- 2026-11-08 18:15 — v2.18.0: C1 trừ lượt thử sau lần nhận dạng gọi được máy dịch, Tiếp tục cùng tệp không bị chặn. C2 `refundRunWith` và `releaseHoldWith` một câu SQL có điều kiện. C6 `parseTranslations` bắt đúng số câu. C7 `getRunDesk` chỉ trả 4 ký tự cuối key. Điều khoản `2026-11-08.2`. `tsc` sạch. Test tiền và dịch 44/44.
- 2026-11-08 08:16 — v2.17.0: **N2** `/api/room-groq` kiểm tra same-site, đăng nhập, status='open', tần suất 240/phút, trần body (25 MB nhận dạng, 512 KB dịch, 20 KB đọc), model phải nằm trong `run_models`, trả lỗi JSON `{error:{message}}` và chuyển tiếp `retry-after`. Tiền: `openRunTicket` giữ nguyên tử (UPDATE có điều kiện balance >= số giữ, `run-ticket.ts`), mỗi yêu cầu gắn `x-run-ticket`, `chargeWith` (`run-gate.ts`) trừ số thực theo giá Groq cộng chênh (`run-bill.ts`: nhận dạng theo giây âm thanh, tối thiểu 10 giây; dịch theo token; đọc theo ký tự), `closeRunTicket` nhả phần thừa; Groq lỗi không tính tiền; phiếu giữ quá 6 giờ tự nhả. Bảng giá lấy từ trang Groq và tỷ giá, lưu `room_settings.run_board`. **N3/C4** quyền Chủ ở bảng `room_staff` role='chu' và chỉ tính khi `user.emailVerified`; bỏ email ghi cứng và file `.grok/admin.json`; biến `ADMIN_EMAIL` chỉ khởi tạo Chủ đầu tiên khi chưa có Chủ đã xác minh. Gửi thư qua HTTP (`auth/mailer.ts`): Resend, SendGrid, Brevo, Mailgun, Postmark hoặc webhook, cần `MAIL_FROM` và một khóa; có thì bật `requireEmailVerification`, chưa có thì không bật (nếu không không ai đăng nhập được). Chưa có SMTP trực tiếp. **C5 (một phần)** `confirmPayOrder` chỉ Chủ, ghi người xác nhận vào sổ và nhật ký, tối đa 3 đơn chờ mỗi khách, giới hạn tần suất báo đã chuyển. Điều khoản đổi sang `2026-11-08.1` vì cửa trả theo lượt có thu tiền. Sửa 2 test cũ (entry-gate, studio-layout).
- 2026-11-08 01:35 — v2.16.1: N1 xóa `creditTrial` (ai đăng nhập cũng tự cộng tiền được). N5 thêm `requireOpenAccount()` ở `src/lib/guard.server.ts` (logic ở `guard.ts`, có test) dùng trong createPayOrder, buyRoomPlan, spendTrial, claimTrialDevice, synthesizeEdge và room-groq; trả 403 khi status khác 'open'. N4 `synthesizeEdge` có authMiddleware và giới hạn 120 lần/phút/tài khoản bằng bảng `rate_hits` (migration 0013, `takeRate()`). Còn chờ: N2 (chốt cách tính tiền), N3 (chốt nhà cung cấp email).
- 2026-11-07 23:44 — v2.16.0: chuông Admin chỉ yêu cầu hỗ trợ, chuyển cấp và khách báo đã chuyển; số mới và chấm đỏ từng dòng; hộp hủy đơn và xóa tài khoản đồng bộ giao diện; giá biểu trả theo lượt ẩn hiện được.


- 2026-11-07 22:12 — v2.15.0: hộp xác nhận mã 6 ký tự đồng bộ giao diện; ô nhập tiền có dấu chấm nghìn; chuông dẫn đúng đơn nạp/yêu cầu; khung giá biểu gói trên Admin có ẩn hiện.

- 2026-11-07 21:05 — v2.14.0: lời lỗ màu xanh/đỏ; mã 6 ký tự khi reset; chỉnh số dư từng TK; chuông nạp/cộng/từ chối; lịch sử Nạp/Mua gói 9 dòng, từ chối đỏ; hạn gói cập nhật ngay sau mua/nạp.

- 2026-11-07 19:37 — v2.13.0: gói hiện giá gạch ngang + tiết kiệm nổi bật; QR nạp ghi demo; hủy xác nhận đơn nạp; reset tiền test (toàn cục + từng user).

- 2026-11-07 18:50 — v2.12.0: bỏ tab dính đè; QR nạp vẽ trên trang; đơn nạp và xác nhận tay; bật/tắt/xóa cổng có chấm; gói hiện số tiết kiệm.

- 2026-11-07 18:14 — v2.11.0: chấm xanh/đỏ cửa (phòng + Admin); canh thẻ quyền; nạp tiền trong khung tài khoản (10k–1tr); idle đăng xuất 30 phút; doanh thu tách nạp/gói/lượt/hoàn/chi; gợi ý email; tìm tên không dấu.

| Thời điểm | AI / Người | Việc đã làm | Ghi chú |
|-----------|------------|-------------|---------|
| Trước 2026-11-03 | Nhiều model | Xây dựng core: upload, ASR Groq, dịch, player, bible, style phụ đề, TTS | Bản React + HTML |
| 2026-11-03 | User | Báo cáo 4 nhóm lỗi (ASR rác, dịch sai gender, gesture chết, thiếu preview) | |
| 2026-11-03 | Grok | Tạo `PROJECT_STATUS.md` | Chưa sửa code |
| 2026-11-03 | Grok | Hợp nhất zip `phudedep` vào workspace. Vá gesture (kể cả không fullscreen), độ sáng, HUD, box mẫu. Lọc A/Ah/thở/rên. Siết prompt gender (`self`/`addressed` + lock từng batch). HTML vá cùng logic. | User cần xác nhận trên phim thật |
| 2026-11-03 | Dola | Ghi yêu cầu + phương án **glossary thuật ngữ theo thể loại phim (genre × ngôn ngữ)** vào PROJECT_STATUS (mục 3.5 + mục 9). Chưa sửa code. | User muốn nhiều model AI cùng phân tích & triển khai |
| 2026-11-03 | User + Dola | User báo 4 yêu cầu mới: box mẫu phụ đề kiểu floating, đổi mặc định style (nền 0% / cỡ chữ 50% / đáy 3%), tách phân tích phim (analyzeFilm) ra ngoài, nâng cấp TTS giọng đọc tự nhiên hơn (ưu tiên free). Dola ghi vào PROJECT_STATUS (mục 3.6–3.8 + mục 4) + khảo sát lựa chọn TTS. | Chưa sửa code lúc đó |
| 2026-11-03 | Grok | Làm 4 yêu cầu: mẫu phụ đề ghim (không cuộn mất), mặc định nền 0% / cỡ 50% / đáy 3% (giữ style đã chỉnh), khối Phân tích phim có sửa bible và nút Dịch tiếp, giọng neural Edge miễn phí + fallback giọng máy. | Glossary mục 9 vẫn chưa code. Không có file HTML trong zip |
| 2026-11-03 | Grok | **Glossary cốt lõi (mục 9)**: `src/lib/sub/glossary.ts` (load + longest-match + protect/restore placeholder). File mẫu `public/glossaries/{global,ja,ko,zh,en}/…`. Tích hợp vào `use-pipeline.ts` trước `translateWithRepair`. Mở rộng GENRES + UI chọn thể loại (psychological, historical, mystery, sports). Chưa UI quản lý term / import CSV / kuromoji. | User cần test trên phim thật (đặc biệt tiếng Nhật / Hàn) |
| 2026-11-03 | Grok | Glossary tiếp: UI chỉ báo số term + panel xem thuật ngữ đang nạp; thêm file ja (psychological/crime/horror), ko/action, zh/costume, en/action. Đóng gói zip bàn giao. | Còn import CSV / sửa term trong app |
| 2026-11-03 | Grok | **Thuật ngữ người dùng:** thêm/xóa trong panel, nhập CSV, xuất CSV. Lưu localStorage theo source×genre (`guser_…`). `overlayUserTerms` ghi đè file pack trước khi protect. | Chưa kuromoji |
| 2026-11-03 | Grok | **Bước 1 — thuật ngữ độc lập.** Bỏ trộn `common.json` và `global.json`. Xóa hai file dùng chung. Viết 60 file riêng (15 thể loại × ja/ko/zh/en), thêm thể loại **Hằng ngày** (`daily`) với tiếng đời 2020s. `loadGenreGlossary` chỉ đọc đúng một file. UI nói rõ không trộn thể loại. | Chưa làm bước 2–5 |
| 2026-11-03 | Claude | **Bước 2 — bảng nhân vật.** `studio.tsx`: đổi `key` hàng nhân vật thành `character-${index}` (không còn chứa tên → hết lỗi mất focus sau một chữ). Thêm tiêu đề «Nhân vật N» và nhãn hiện cho 4 ô (Tên nhân vật / Nam / nữ / Tự xưng / Được gọi), thêm placeholder cho ô tên. Không đổi `patchCharacter`, `analyzeFilm`, phần Tóm tắt, Thuật ngữ. | Mới kiểm tra cú pháp TSX (không có node_modules, không chạy app). User cần thử gõ tên nhân vật liên tục trên điện thoại |
| 2026-11-03 | Claude | **Bước 3 — panel phụ đề.** `studio.tsx`: gom panel thành `panelNode`; `full` thì render trong khung video (giữ nguyên), không `full` thì render ngay dưới khung video (không còn `absolute` trong `aspect-video` + `overflow-hidden` nên hết bị cắt). Thêm `panelBoxRef` + `scrollIntoView` khi mở panel ngoài toàn màn hình. Không đổi nội dung panel (ô mẫu, thanh kéo, `SUB_DEF`, `cueStyle`), cử chỉ, ASR, prompt dịch, glossary. | Mới kiểm tra cú pháp TSX bằng TypeScript transpile (0 lỗi). Không có node_modules, không chạy app. User cần thử: mở ⚙ khi chưa toàn màn hình, kéo thanh, rồi bật/tắt toàn màn hình khi panel đang mở |
| 2026-11-03 | Grok | **Bước 4 — thuyết minh theo bảng, không đọc trước câu.** `cast-voice.ts`: đổi giọng khi câu có «Tên:» hoặc cách tự xưng đứng đầu câu (tự xưng trùng nhiều người thì bỏ). Câu không khớp giữ giọng Nữ/Nam/Bất kỳ. `studio.tsx`: bỏ `currentTime + lead`; chỉ đọc đúng câu đang hiện, có thể chờ thêm. Thanh «Đọc sớm hơn hình» đổi thành «Chờ sau khi câu hiện». `gnarr_v=3` xóa giá trị đọc sớm đã lưu. | Không đụng ASR, glossary, cử chỉ, panel phụ đề. Chưa tách giọng khi một câu có hai người nói. User cần nghe trên phim đã phân tích |
| 2026-11-04 | Grok | **Sửa hai lỗi đã chạy test.** (A) `restoreTerms` không nuốt khoảng trắng; nhận `{{G0}}` `{{ G0 }}` `{{g0}}` `{G0}` `[[G0]]`; không nhầm G1/G10. Prompt giữ token. Câu mất/sót placeholder dịch lại một lần không protect rồi xóa token. (B) Tự xưng bị bỏ nếu trùng `addressed` của nhân vật khác — «Anh ơi» không còn thành giọng nam. Test: `glossary.test.ts`, `cast-voice.test.ts`. `npm run typecheck` và `npm test` pass. | Không làm bước 5. Không đổi `findMatches`. Không có HTML trong gói nên không sửa HTML. |
| 2026-11-04 | Claude | **Dọn gói giao, chỉ sửa tài liệu/cấu hình, không đổi code `src/`.** `AGENTS.project.md` viết lại (trỏ tới `PROJECT_STATUS.md` + `huongdan.txt`, bỏ HTML/`attachments/` và đường dẫn `/workspace/`). `huongdan.txt` mục 13 khớp thực tế (`attachments/` rỗng). Khôi phục `.prettierrc`. `PROJECT_STATUS.md`: bảng mục 2 xếp lại 1–24, gộp hai khối «Chưa làm» ở mục 4, mục 3.5 ghi trạng thái, mục 9.2 sửa vị trí tích hợp glossary, bỏ câu «HTML giữ để đối chiếu». | Không làm bước 5. Zip đặt tên `phudedep-2026-11-04.zip`, không kèm `node_modules`, `.vercel`, `.grok`. |
| 2026-11-04 08:15 | Claude | **Đổi tên dự án thành `TyZo_Sub_Project`** (tiêu đề `PROJECT_STATUS.md`, `AGENTS.project.md`, `huongdan.txt`; tên zip `TyZo_Sub_Project-YYYY-MM-DD-HHMM.zip`). Thêm quy tắc 17 trong `huongdan.txt`: ghi thời điểm dạng `YYYY-MM-DD HH:MM (UTC+7)`, lấy bằng lệnh `date`, không đoán giờ. Không đổi code `src/`, không đổi `name` trong `package.json`. | Các dòng lịch sử cũ chỉ có ngày, không rõ giờ (không suy đoán). Tên `phudedep` trong dòng cũ giữ nguyên làm lịch sử. |
| 2026-11-04 13:25 | Grok | **Bước 5 Pha 0 — chẩn đoán.** `acceptSegment` vẫn loại đúng các câu cũ nhưng trả lý do. `ingestAsrPart` lưu raw Groq (kể cả segment không có text) rồi mới lọc. Phân biệt: Whisper không trả câu / app lọc / im lặng không gửi Whisper / không giải mã. UI tóm tắt theo lý do và ngôn ngữ, xem danh sách, xuất JSON. Test `diagnostics.test.ts`. Không siết filter, không đụng dịch, TTS, glossary, cử chỉ. | Chưa chạy một phim thật nên chưa biết lý do mất câu trên file của user. |
| 2026-11-04 13:33 | Grok | **Bước 5 Pha 1d — batch dịch.** Model trả ít câu hơn không còn làm hỏng cả nhóm. Câu đã có giữ nguyên; chỉ câu trống / không phải chuỗi được dịch lại, vẫn kèm ctx và addressLock/bible. UI ghi «Không dịch được» và nút «Dịch lại các câu lỗi». Test `translate-batch.test.ts`. `npm run typecheck` và `npm test` pass. | Chưa thử trên phim thật. Không làm Pha 1a. |
| 2026-11-04 13:40 | Grok | **Bước 5 Pha 1a — thử lại đoạn lỗi.** Sau lượt nhận dạng, chỉ đoạn không giải mã (`decode_fail`) được thử lại đúng một lần. Ngân sách 180 giây, không cắt đoạn. Im lặng, Whisper trống và câu bị lọc không gửi lại. Bảng chẩn đoán và dòng trạng thái ghi đoạn còn thiếu (chỉ số + thời gian) và số giây đã dùng. Test `asr-retry.test.ts`. | Chưa thử trên phim thật. Không làm Pha 1c. |
| 2026-11-04 13:45 | Grok | **Bước 5 Pha 1c — biên đoạn.** `acceptSegment` so điểm giữa câu với mốc `chunkStart + 1 giây`, không so mốc bắt đầu. Câu nửa đầu vùng chồng vẫn bỏ. Câu bắt đầu sớm nhưng điểm giữa ở đoạn sau thì giữ. Câu trùng không thêm lần nữa; câu dài hơn thì nối vào câu bị cắt và xóa bản dịch cũ để dịch lại. Test `overlap.test.ts`. Không đổi RMS, ảo giác, A/Ah. | Chưa thử trên phim thật. Không làm Pha 1b. |
| 2026-11-04 16:58 | Grok | **Bước 5 Pha 1b — im lặng theo cửa sổ.** User bảo tiếp tục dù chưa có log phim thật. Ngưỡng `0.005` giữ nguyên. `isSilentChunk` bỏ đoạn chỉ khi mọi cửa sổ 1 giây đều dưới ngưỡng. Test: đoạn 60 giây chỉ có 1 giây tiếng thì RMS cả đoạn dưới ngưỡng (cũ sẽ bỏ) nhưng cửa sổ giữ lại. A/Ah vẫn loại. | Chưa có số liệu trước/sau trên phim thật. Không làm Pha 2. |
| 2026-11-04 17:08 | Grok | **Bước 5 Pha 2 — khoảng trống.** `planSpeechGaps` tìm chỗ có tiếng ≥ 2 giây mà không có câu. Dò không gọi Groq. UI hiện số giây và ước tính $, rồi hỏi lại trước khi gửi. Trần 120 giây, khoảng không vừa thì để nguyên. Câu mới bấm Tiếp tục mới được dịch. Test `gap-scan.test.ts`. | Chưa thử trên phim thật. Không làm Pha 3. |
| 2026-11-04 17:11 | Grok | **Bước 5 Pha 3 — đo Silero, không gắn.** Tải model: int8 212860 byte (gzip 148120), v5 2313101 byte (gzip 1942942). `onnxruntime-web@1.31.1` WASM `ort-wasm-simd-threaded.wasm` 14848852 byte (gzip 3792479). Cả cụm gzip khoảng 4.0 MB, app hiện gzip khoảng 0.19 MB. RMS 10 phút: 25.1 ms. Quyết định không đưa vào bundle. `isNonSpeech` giữ nguyên. | Chưa có ví dụ thán từ ja/ko/zh từ phim thật. |
| 2026-11-04 20:13 | Grok | **Bước 6.1 — xếp lại thẻ thiết lập.** Key, hai ngôn ngữ, thể loại, file và nút chạy lên trên. Trạng thái ngay dưới nút. «Tốc độ và chi phí» (model, Whisper, số luồng) và «Thuật ngữ thể loại» đóng mặc định. Không đổi pipeline. | Chưa làm 6.2. Chưa user thử trên điện thoại. |
| 2026-11-04 20:38 | Grok | **Bước 6.2 — khung Phụ đề.** Thanh trên chỉ có Phụ đề. Video và bảng câu đứng trên tab, một player. Trạng thái và Xuất SRT nằm trên khung xem. Năm tab cuộn tới phần tương ứng, chưa giấu phần khác. Mũi tên trái/phải đổi tab. Cuộn mượt tắt khi máy xin giảm chuyển động. | Chưa làm 6.3. Chưa ghim video khi cuộn. |
| 2026-11-04 20:41 | Grok | **Bước 6.3 — mỗi tab một phần.** Phim, Chất lượng, Nhân vật, Nghe, Kiểm tra ẩn lẫn nhau nhưng không gỡ khỏi cây, nên ô đang gõ không mất. Một nút Dịch tiếp trên khung xem. Dò khoảng trống, câu lỗi và chẩn đoán nằm ở Kiểm tra. Đổi tab không cuộn trang. | Chưa ghim video. Chưa animation tab. |
| 2026-11-04 20:48 | Grok | **Bước 6.4 — ba cỡ màn hình.** Khung cao đúng một màn hình, không cuộn mất video. Điện thoại: video tối đa một phần ba, tab mở từ dưới và có nút Đóng. Máy tính bảng: video ghim trên. Màn rộng: video và bảng câu cạnh nhau, công cụ ở dưới. Chừa vùng tai thỏ. | Chưa thử Safari iPhone. Chưa animation tab. |
| 2026-11-04 20:55 | Grok | **Bước 6.5 — chuyển tab.** Panel trượt 180ms, nút đổi màu 160ms. Máy xin giảm chuyển động thì đứng yên. Thêm Home và End cạnh mũi tên trái/phải. Không đổi pipeline. | Chưa đối chiếu Safari iPhone và Firefox. |
| 2026-11-04 20:58 | Grok | **Bước 6.6 — trình duyệt.** Thêm đường lùi `vh` trước `dvh` và `0px` cho vùng tai thỏ. Không thêm tiền tố một hãng. Câu lỗi âm thanh không còn bắt dùng Chrome. Ghi bảng máy đã chạy: chỉ Chromium trong sandbox. | Firefox và Safari iPhone chưa chạy. |
| 2026-11-04 21:48 | Grok | **Bước 7.1 — hết chồng khung.** Bỏ lớp nổi của video và bỏ tấm tab phủ lên bảng câu. Màn thấp hơn 520px không dùng bố cục máy tính: video là dải nhỏ, tab ở dưới và tự cuộn. Chromium đo 390×844, 844×390, 980×500, 768×1024, 1280×800: không chồng, không tràn ngang. | Chưa thử lại trên điện thoại thật. Chưa xếp lại tab (7.2). |
| 2026-11-04 21:53 | Grok | **Bước 7.2 — xếp tab.** Key Sub đứng đầu: key, Đồng bộ key, model, Whisper, số luồng. Phim: hai ngôn ngữ, thể loại, thuật ngữ thể loại, file và nút chạy. Nhân vật: ngữ cảnh đóng sẵn rồi tới phân tích. Bỏ tab Chất lượng. Ba ô tên phim, tóm tắt, thuật ngữ tay vẫn lưu và vẫn gửi khi dịch. | Chưa user thử thứ tự mới trên điện thoại. |
| 2026-11-04 22:43 | Grok | **Bước 7.3 — không giật khung.** Khóa trang để hộp chọn file không kéo mất đầu hoặc cuối form. Nút đóng điện thoại đổi thành dấu X. Dòng trạng thái luôn hai hàng; câu dài bấm để xem, không đẩy phần dưới. | Chưa user thử lại trên điện thoại lúc đang nhận dạng. |
| 2026-11-04 23:01 | Grok | **Bước 7.4 — số nổi, nút X trong khung.** Số thuật ngữ dùng viên vàng chữ đen, đọc được trên nền tối lẫn sáng. Nút X chuyển vào trong khung tab. Không sửa giọng nam/nữ. | Giọng đọc để thảo luận sau. Chưa thử điện thoại thật. |
| 2026-11-04 23:12 | Grok | **Bước 7.5 — giọng theo cao độ.** Mỗi câu được đo lúc nhận dạng. Thấp rõ thì Nam Minh, cao rõ thì Hoài My. Không chắc thì giọng dự phòng. Không dùng bảng nhân vật, không tốn key. | Mới thử trên tiếng sin và tiếng xung. Chưa nghe trên phim thật. Phải nhận dạng lại thì câu cũ mới có số đo. |
| 2026-11-04 23:25 | Grok | **Bước 7.6 — so giọng trong cùng video.** Không còn mốc 160/190 Hz. Các câu được so với nhau: nhóm thấp nam, nhóm cao nữ. Một nhóm hoặc câu nằm giữa thì không đổi. Bỏ 0,1 giây hai đầu mỗi câu. | Chưa nghe trên phim thật. Phải nhận dạng lại. |
| 2026-11-04 23:42 | Grok | **Thuật ngữ tiếng Trung.** Nạp file mở rộng, 713 mục, 17 thể loại. Thể loại Tự động có file riêng. Sex là mục riêng, không gộp vào Người lớn. Dịch sang Việt, Hàn, Nhật, Anh thì dùng cột tương ứng. | File kia là tập con, không thêm mục riêng. Thuật ngữ chung không trộn vào thể loại khác. |
| 2026-11-05 07:38 | Grok | **Thu gọn ngôn ngữ.** Ô đích đổi tên thành «Dịch sang tiếng», chỉ còn tiếng Việt. Ô nguồn đổi tên thành «Nhận diện ngôn ngữ», chỉ còn Trung, Hàn, Nhật, Anh. Máy đã lưu ngôn ngữ khác thì về Trung và tiếng Việt. | Không còn tự nhận dạng. |
| 2026-11-05 07:48 | Grok | **Sex cho Anh, Hàn, Nhật.** Thêm thể loại Sex, từ gốc là tiếng trong phim, bản dịch là tiếng Việt. Anh 98 mục, Nhật 92, Hàn 91. | Từ Hàn một âm «빼» không đưa vào vì dễ khớp nhầm. Hai từ trùng một cách viết thì giữ một bản dịch và ghi cách khác. |
| 2026-11-05 10:30 | Grok | **Sửa lỗi đã rà.** Câu gốc ngắn không còn bị coi là dịch xong. Dịch lại vẫn khóa thuật ngữ, không xóa bản đã có khi lần sau trống. Giọng nam/nữ tách theo khoảng trống cao độ, kể cả khi một bên nói ít. Thuyết minh và SRT không lấy câu gốc khi chưa dịch, và đọc lại khi bản Việt vừa về. Câu Trung bị cắt được gộp. Câu lặp sau khoảng lặng được giữ. Nhóm dịch là các câu liền nhau. Nửa lô đã dịch không bị mất khi nửa kia lỗi. Thử nhận dạng lại chỉ trừ giờ khi có kết quả. Ghi chú thuật ngữ đi vào ngữ cảnh. Tự động có file cho Anh, Hàn, Nhật. Từ một chữ không được tính. Neural không còn nút Bất kỳ. | Câu ngắn hơn nửa giây vẫn không đo được cao độ. |
| 2026-11-05 10:40 | Grok | **Kiểm tra lại.** Câu giống nhau ở đoạn sau không còn làm mất câu giống ở đoạn trước khi hai đoạn nhận dạng xong không theo thứ tự. Câu thuật ngữ lỗi không liền nhau được dịch lại theo từng cụm, vẫn khóa từ. | Chưa chạy một phim thật qua Groq trong lần này. |
| 2026-11-05 10:59 | Grok | **Gộp thuật ngữ.** 15 thể loại Anh, Hàn, Nhật nhận thêm từ trong file gốc. Từ cũ giữ nguyên cách dịch. Cách dịch mới khác thì chỉ ghi vào chú thích. Sex và Tự động không đổi. | Từ một chữ vẫn không thêm. |
| 2026-11-05 12:04 | Grok | **Chỉ tài liệu.** Thêm mục 12, đề xuất ASR thiếu câu và chọn giọng. Đối chiếu code rồi mới ghi. Sửa hàng 7 và 23 vì đường đọc giọng không còn gọi bảng nhân vật. Không sửa `src/`. | Chưa được duyệt để làm. |
| 2026-11-05 12:10 | Grok | **Mục 12 bước 1.** Đọc: bảng nhân vật thắng, không khớp thì cao độ. Câu ngắn một chữ hoặc dưới 0,8 giây được giữ khi `avg_logprob` từ −0,6 trở lên; «A» vẫn loại. Tab Kiểm tra thêm Nghe, Giữ, Bỏ. Không gắn Silero. | Chưa nghe trên phim thật. Bước 2–4 chưa làm. |
| 2026-11-05 12:21 | Grok | **Mục 12 bước 2.** Ô «Chỉ gửi đoạn có tiếng người», tắt mặc định. Bật thì tải Silero int8 và WASM lúc chạy, cắt đầu/cuối không phải lời, mỗi đoạn vẫn một lần gửi. Không tải được thì dùng RMS. | Chưa chạy trên phim thật. Bước 3–4 chưa làm. |
| 2026-11-05 12:28 | Grok | **Mục 12 bước 3.** Cắt theo khoảng ngừng 1,5 giây, trần vẫn 60 giây. Đường xem file dò năng lượng riêng, không chỉ sửa `splitAudio`. Bật lọc thì dùng vùng Silero khi có PCM. Thử lại câu không chắc và Whisper trống, ngân sách 120 giây riêng, không gửi câu đã bấm Bỏ. | Chưa chạy trên phim thật. Bước 4 chưa làm. |
| 2026-11-05 12:34 | Grok | **Mục 12 bước 4.** Cao độ lệch quá 35 Hz trong một câu thì bỏ. Câu dưới 0,5 giây vẫn không đo. Nút Đổi giọng khóa nam/nữ từng câu. Giới nhân vật được lưu và thắng cao độ. | Chưa nghe trên phim thật. |
| 2026-11-05 12:45 | Grok | **Tự mở tab Nhân vật.** Khi trạng thái là «Đã phân tích xong… bấm Dịch tiếp», app chuyển sang tab Nhân vật và mở khung tab. | Chỉ khi đang chờ Dịch tiếp. |
| 2026-11-05 13:03 | Grok | **Đổi chữ trên trang.** Dòng nhỏ trên cùng là «Phòng chiếu TyZo Sub». Nút tải phụ đề là «Xuất file Vietsub». File tải về vẫn là `.srt`. | Không đổi cách xuất file. |
| 2026-11-05 13:42 | Grok | **Chỉ tài liệu.** Thêm mục 13, ghi thảo luận kinh doanh. Không sửa `src/`. | Chưa được yêu cầu làm. Sửa webapp vẫn ưu tiên trước. |
| 2026-11-05 13:50 | Grok | **Cửa vào.** Màn chờ logo, rồi điều khoản phiên bản 2026-11-05.1. Phải tick và bấm Đồng ý mới vào phòng. Không đồng ý thì dừng. | Chưa viết điều khoản của phần kinh doanh. |
| 2026-11-05 14:05 | Grok | **Giá Groq bằng đồng.** Đọc bảng trên console.groq.com/docs/models và tỷ giá đô. Hiện giá, cửa sổ token, hạn mức bằng tiếng Việt. | Hạn mức đúng của từng key vẫn chỉ có trong tài khoản Groq. |
| 2026-11-05 14:20 | Grok | **Sửa đơ khi vào phòng.** Lệnh lấy giá không được đặt trong file `.server.ts` vì bản xem trước chặn file đó và làm kẹt trang. | Đã bấm được tab sau khi đồng ý điều khoản. |
| 2026-11-05 14:33 | Grok | **Chỉ tài liệu.** User nêu hướng thuê webapp theo ngày. Key Groq khách tự đăng ký hoặc tự mua. Ghi mục 13.5. Không sửa `src/`. | Chưa chốt giá, chưa chọn cổng nạp, chưa code. |
| 2026-11-05 14:36 | Grok | **Chỉ tài liệu.** Đề xuất giá thuê: 39.000 đ / 24 giờ, 129.000 đ / 7 ngày, 299.000 đ / 30 ngày. Khách vẫn tự trả Groq. | Chưa chốt. Chưa code. |
| 2026-11-05 14:47 | Grok | **Chỉ tài liệu.** Hạ giá đề xuất còn 19.000 / 59.000 / 149.000 vì khách chỉ tò mò hoặc ngồi 1–2 giờ, còn chờ hạn mức Groq. Thêm lượt xem thử miễn phí. | Mức 39.000 / 129.000 / 299.000 bỏ. Chưa code. |
| 2026-11-05 15:23 | Grok | **Chỉ tài liệu.** Tài khoản và hạn gói để trên Postgres Neon. Key Groq và video không lưu trên máy chủ. Bản xem thử PGLite không dùng cho khách thật. | Chưa code. |
| 2026-11-05 15:25 | Grok | **Chỉ tài liệu.** Không thuê VPS cho hướng thuê phòng. Web trên Vercel, dữ liệu trên Neon. VPS chỉ khi sau này tải video về máy chủ. | Chưa code. |
| 2026-11-05 15:27 | Grok | **Chỉ tài liệu.** Dời web khỏi Vercel: đổi kiểu chạy sang máy Node, giữ Neon thì không phải chuyển dữ liệu khách. | Chưa code. |
| 2026-11-05 15:34 | Grok | **Trang xem thử giá.** Thêm `/goi`. Bấm chọn gói, đăng ký và nạp chỉ trên trang đó, không lưu, không thu tiền. Trang chủ vẫn là cửa vào và phòng dịch. | Không phải cửa trả tiền thật. |
| 2026-11-05 17:25 | Grok | **Chỉ tài liệu.** Tài khoản thu tiền chưa có. Đăng nhập Google có sẵn đi qua môi giới của Grok, không dùng cho web Vercel tự kinh doanh. Email và ví phải làm riêng. | Chưa code. |
| 2026-11-05 17:28 | Grok | **Chỉ tài liệu.** Không có API MoMo hay VNPay miễn phí cho tiền thật. Bản đầu nên chuyển khoản qua SePay. Đăng ký email không cần Google, làm được. | Chưa code. Chưa chọn cổng. |
| 2026-11-05 17:37 | Grok | **Thử tài khoản.** Bật đăng ký email. Trang `/login` và `/tai-khoan`. Ví và hạn gói nằm trên cơ sở dữ liệu. Nút cộng tiền chỉ là tiền thử. Phòng dịch không bắt đăng nhập. | Chưa nối SePay, MoMo, VNPay. |
| 2026-11-05 17:40 | Grok | **Hạn gói trong phòng.** Đăng nhập thì phòng hiện còn hạn hay đã hết. Không khóa người chưa mua. Trang tài khoản đổi được tên và có nút Đăng xuất. | Ngân hàng và SePay chưa làm. Quên mật khẩu chưa gửi thư. |
| 2026-11-05 17:46 | Grok | **Chỉ tài liệu.** User chốt: chưa đụng webapp chính. Chỉ hoàn thiện demo kinh doanh. Demo xong và được duyệt thì mới đưa vào code phòng dịch. | Ngân hàng và SePay vẫn để sau. |
| 2026-11-05 17:53 | Grok | **Giới hạn gói trên demo.** Đăng ký chưa nạp: 1 tệp, 15 phút, không xuất file. Gói đang hạn: không giới hạn số tệp. Hết lượt thì phải mua. Chưa chặn tệp trong phòng dịch. | Ngân hàng vẫn để sau. |
| 2026-11-05 17:59 | Grok | **Chỉ tài liệu.** User đề xuất dùng thử 1 tệp, 10 phút, 50 MB, đủ chức năng, không xuất file. Chưa chốt. Gợi ý đo theo phút, không đưa key Groq của chủ web vào bản thử. | Chưa sửa code. |
| 2026-11-05 18:01 | Grok | **Chỉ tài liệu.** User xác nhận lại: chỉ cho thuê webapp. Key Groq là của khách. Chủ web không chịu cước Groq. | Chưa sửa code. |
| 2026-11-05 18:03 | Grok | **Dùng thử đã chặn.** Phải đăng nhập. 1 tệp, 10 phút, không quá 100 MB, không link, không xuất file, không dịch lại, không dò khoảng trống. Cùng trình duyệt không được lượt mới. Không xác minh email vì mail 10 phút. | Gói đang hạn thì không giới hạn số tệp. |
| 2026-11-05 18:15 | Grok | **Lưu bản gốc.** File `artifacts/TyZo_Sub_goc.zip` là phòng dịch trước đăng ký và gói thuê. Bản đang chạy giữ các tính năng đó. | Zip đã qua `tsc`. |
| 2026-11-05 18:24 | Grok | **Lối vào.** Điều khoản phiên bản `2026-11-05.2` có bảng giá. Đồng ý rồi mới tới đăng ký. Nút Tài khoản đứng cạnh Phụ đề và luôn ở cuối. | Chức năng lớn sau này đặt trước Tài khoản. |
| 2026-11-05 18:36 | Grok | **Chỉ tài liệu.** User nói phần xuất file đã khá tốt. Nút vẫn hiện. Dùng thử hoặc hết hạn thì báo không xuất. Còn hạn thì xuất. | Không sửa thêm. |
| 2026-11-05 18:52 | Grok | **Chỉ tài liệu.** Cần trang Admin khi có người dùng thật. Chỉ xem tài khoản, hạn gói, và mở hạn tay khi nhận tiền ngoài. Không xem key Groq, không xem video. | Chưa code. |
| 2026-11-05 18:53 | Grok | **Chỉ tài liệu.** Gợi ý thêm cho Admin: tìm email, sổ tiền, ghi chú, đặt lại mật khẩu, khóa, nhật ký thao tác. Chưa cần biểu đồ, không xem key, không vào thay người dùng. | Chưa code. |
| 2026-11-05 18:55 | Grok | **Chỉ tài liệu.** Ba mức quyền: Hỗ trợ, Quản lý, Chủ. Hết hạn không phải khóa. Người bị khóa hoặc bị cấm vẫn gửi được yêu cầu xem lại. Chỉ Chủ được cấm. | Chưa code. |
| 2026-11-05 18:57 | Grok | **Điều khoản.** Phiên bản `2026-11-05.3` thêm mục khóa và cấm. Hết hạn, hết lượt, dịch sai không bị khóa. Chia sẻ tài khoản và lấy lượt thử thì có thể khóa. Nội dung trẻ em, tấn công, giấy thanh toán giả, bán lại phòng thì có thể cấm. | Trang Admin vẫn chưa làm. |
| 2026-11-05 19:05 | Grok | **Trang Admin.** Nút Admin đứng trước Tài khoản khi đã có quyền hoặc chưa có Chủ. Hỗ trợ xem, ghi chú, mật khẩu tạm. Quản lý khóa, mở hạn, trả lời yêu cầu. Chủ cấm, xóa, chỉ định quyền. Người bị cấm gửi yêu cầu ở `/yeu-cau`. | Người đầu tiên bấm Nhận quyền Chủ. |
| 2026-11-05 19:07 | Grok | **Sửa quyền Chủ.** Bỏ nút nhận quyền và bỏ Admin khỏi phòng người dùng. Chỉ email trong `ADMIN_EMAIL` hoặc `.grok/admin.json` mới là Chủ. Trang riêng là `/admin`. | Chưa ghi email Chủ. |
| 2026-11-05 19:12 | Grok | **Đã ghi email Chủ** vào file máy chủ. Chủ đổi email ngay trên trang Admin. Mật khẩu người dùng gửi trong chat không lưu vào web. | Đăng nhập bằng email đó rồi mở `/admin`. |
| 2026-11-05 19:21 | Grok | **Điều khoản `2026-11-05.4`.** Mục 8 tách dòng Khóa và Cấm. Câu không bị phạt và câu giữ lịch sử màu vàng. Việc bị cấm màu đỏ. | Người dùng phải đồng ý lại. |
| 2026-11-05 21:04 | Grok | **Đưa phòng, đăng nhập và Admin lên kho.** | Giờ lấy từ git. |
| 2026-11-05 21:21 | Grok | **Nút về phòng, logo điều khoản, sổ tiền Admin.** | |
| 2026-11-05 21:56 | Grok | **v1.1.0.** Nút về phòng thẳng hàng. Logo chạy liên tục. Có số phiên bản. | |
| 2026-11-05 22:14 | Grok | **v1.2.0.** Mặc định form đăng nhập. Admin có số người online và tổng đăng ký. Khách gửi được yêu cầu. | |
| 2026-11-05 22:33 | Grok | **v1.3.0.** Logo đỡ chói. Thông báo nổi và chuông. Số phiên bản chỉ còn Vx.x.x. | |
| 2026-11-05 23:18 | Grok | **v2.0.0.** Bốn cấp. Báo cấp trên sau 2 giờ. Sơ đồ và doanh thu. | |
| 2026-11-05 23:46 | Grok | **v2.1.0.** Ô số có màu. Trả lời hoặc từ chối thì đóng yêu cầu. Từ chối bắt buộc có lý do. | |
| 2026-11-06 00:03 | Grok | **v2.2.0.** Mười kiểu thẻ quyền. Chủ chọn trong Admin. | |
| 2026-11-06 00:26 | Grok | **v2.3.0.** Video giữ 16:9. Đăng ký nhập lại mật khẩu và thanh mạnh yếu. Thẻ quyền thu gọn. | |
| 2026-11-06 00:52 | Grok | **v2.4.0.** Nút Quản lý cạnh Tài khoản khi có quyền. Lịch sử Admin ngắn. Đăng nhập nhớ email. Nghe mặc định bật. | |
| 2026-11-06 00:54 | Grok | **v2.4.1.** Giá đã chốt: 9.000 đ / 24 giờ, 39.000 đ / 7 ngày, 99.000 đ / 30 ngày. Điều khoản `2026-11-06.1`. | |
| 2026-11-06 01:01 | Grok | **Chỉ tài liệu.** Viết lại `huongdan.txt` và đối chiếu mục 2, mục 7, mục 13.5 với app đang chạy. Không đổi `src/`. | |
| 2026-11-06 01:09 | Grok | **v2.4.2.** Chữ Quản lý căn giữa, cùng hàng với Phụ đề và Tài khoản. | |
| 2026-11-06 10:02 | Grok | **v2.5.0.** Bấm hoặc rê chuột vào số phiên bản thì thấy tóm tắt cập nhật. Có bản chưa xem thì số sáng nhẹ. Quy tắc ghi thêm câu vào `CHANGELOG` mỗi lần nâng số. | |
| 2026-11-06 13:04 | Grok | **Chỉ tài liệu.** Chốt mục 10c trong `huongdan.txt`: từ mốc này, mọi dòng cập nhật phải nêu đủ phần nâng cấp, chỉnh sửa, thay đổi và bổ sung, viết câu chuyên môn, kèm mốc thời gian. Không đổi `src/`. Câu trên màn hình vẫn là v2.5.0. | |
| 2026-11-06 13:09 | Grok | **Chỉ tài liệu.** Chốt mục 12b trong `huongdan.txt`: từ mốc này, nâng cấp, cập nhật, bổ sung, chỉnh sửa hoặc chức năng nào làm đổi dịch vụ thì phải sửa bảng Tóm tắt, bảng giá hoặc mục điều khoản liên quan trong cùng lần đó, rồi nâng `TERMS_VERSION`. Không đổi `src/`. | |
| 2026-11-06 13:12 | Grok | **v2.5.1.** Viết lại các dòng trong hộp cập nhật cho đủ ý, thêm mốc thời gian phát hành. Không đổi điều khoản vì không đổi dịch vụ. | |
| 2026-11-06 18:40 | Grok | **Chỉ tài liệu.** Ghi mục 14: kế hoạch nâng cấp nhận dạng và dịch để làm sau. Không đổi `src/`. App vẫn **v2.5.1**. | |
| 2026-11-06 20:10 | Grok | **Chỉ tài liệu.** Ghi mục 15: cửa trả theo lượt, phiếu tiền, và quyền hỗ trợ. Không đổi `src/`. App vẫn **v2.5.1**. | |
| 2026-11-06 20:54 | Grok | **v2.5.2.** Nút ba gạch thay hàng Phụ đề, Tài khoản, Quản lý. Tên mục đang mở hiện cạnh nút. Khung Trả theo lượt hiện ở tab Key, Tài khoản và trang quản trị, ghi sẽ cập nhật sau. Chưa trừ tiền. Không đổi điều khoản. | |
| 2026-11-06 21:04 | Grok | **v2.6.0.** Bàn quản lý trả theo lượt: đơn giá, hạn mức, câu đóng cửa, số trong ngày, phiếu theo tài khoản, nhả giữ và hoàn ví. Hỗ trợ có câu trả lời sẵn. Khách chưa chạy cửa này. Không đổi điều khoản. | |
| 2026-11-06 21:11 | Grok | **v2.6.1.** Đóng thì trang khách chỉ thấy câu tạm ngưng. Mở thì khung Key của tôi hoặc Trả theo lượt hiện lại. Chưa trừ ví. Không đổi điều khoản. | |
| 2026-11-06 21:47 | Grok | **v2.7.0.** Cửa mặc định mở. Bảo trì bằng nội dung đã lưu. Giá biểu cập nhật riêng, tăng phần trăm hoặc giá riêng, khung model đồng bộ. Key của khách không hiện giá. Chưa trừ ví. Không đổi điều khoản. | |
| 2026-11-06 22:04 | Grok | **v2.8.0.** Giá gốc và model key admin chỉ ở trang quản trị. Khách chỉ thấy «Chưa cập nhật» nếu model chưa đưa ra. Bảng phiên bản còn 8 lần. Có báo bản mới. Không đổi điều khoản. | |
| 2026-11-06 22:22 | Grok | **v2.9.0.** Ô key ngay trên trang quản trị. Trả theo lượt không cần đồng bộ key. Đổi tên hiển thị hai thể loại, mã và thuật ngữ giữ. Thông báo nổi khi lưu ở quản trị. Không đổi điều khoản. | |
| 2026-11-06 22:43 | Grok | **v2.10.0.** Key phòng lưu trên máy chủ, tải lại không mất. Khách chọn trả theo lượt thì dùng key đó. Phiếu hiện giờ và trạng thái. Doanh thu đọc được cột ngày. Chưa trừ ví. Không đổi điều khoản. | |
| 2026-11-07 07:41 | Grok | **v2.10.1.** Tab Việc, Sơ đồ, Doanh thu tách riêng. Câu hạn gói đổi khi chọn trả theo lượt. Thẻ quyền có hiệu ứng. Sổ gần đây thu gọn. Không đổi điều khoản. | |
| 2026-11-08 18:15 | Grok | **v2.18.0.** Lượt thử trừ sau khi nhận dạng gọi được máy dịch. Hoàn tiền và nhả giữ không cộng hai lần. Dịch thiếu hoặc thừa câu thì dịch lại. Key phòng chỉ hiện 4 ký tự cuối. Điều khoản `2026-11-08.2`. | |
| 2026-11-08 19:13 | Grok | **v2.19.1.** Video không mất khi sang Tài khoản. Mốc thời gian không còn 0:60. Chi phí và doanh thu theo giờ Việt Nam. Cửa trả theo lượt chờ cửa mở. Thuyết minh không bị ép bật lại. Hai lần chạy không dùng nhầm phiếu. Điều khoản không đổi. | |
| 2026-11-08 18:52 | Grok | **v2.19.0.** Sửa nhóm 3 và 4 của báo cáo lỗi. Điều khoản `2026-11-08.3` vì mã nạp có thể là VietQR và lần đồng ý được ghi theo tài khoản. T6 chưa làm. T14 chưa chạy thử trên trình duyệt. | |

---

## 7. Quy tắc làm việc bắt buộc cho AI tiếp theo

1. **Đọc `BANG_DIEU.md` trước**, rồi `huongdan.txt`, rồi bảng đầu file này. Mục 6 trở đi không phải lệnh.
2. Khi sửa code: nâng `APP_VERSION` theo `huongdan.txt` mục 10, thêm một câu vào `CHANGELOG` trong `src/lib/app-version.ts`, cập nhật mục 2 và mục 6, chạy `npx tsc --noEmit` nếu đụng `src/`. Đẩy nhánh `work`. Chỉ vào `main` khi user nói «đẩy chính thức». Chỉ đóng zip khi user yêu cầu.
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

## 9. Glossary thuật ngữ theo thể loại phim (genre × ngôn ngữ)
> **Trạng thái 2026-11-04:** Vòng độc lập xong. Chọn thể loại thì chỉ nạp `public/glossaries/{lang}/{genre}.json`. Không còn `common.json` hay `global.json`. Chọn thể loại «Tự động» thì không nạp file thể loại. **Chọn ngôn ngữ lời nói «Tự nhận dạng» (mã rỗng) thì không nạp thuật ngữ**, kể cả khi đã chọn thể loại — `loadGenreGlossary` cần mã ngôn ngữ. CSV người dùng vẫn ghi đè theo đúng cặp ngôn ngữ × thể loại, nên cũng không áp khi lời nói đang «Tự nhận dạng». Khớp đuôi tiếng Nhật bằng luật giữ nguyên. Đích trong file JSON là tiếng Việt và được **ghi đè cứng** sau khi dịch, nên chọn ngôn ngữ đích khác tiếng Việt vẫn ra từ tiếng Việt.

### 9.1 Yêu cầu (nguyên gốc của user)
- Webapp dịch phim có bộ chọn **thể loại** (cần bổ sung thêm nhiều thể loại nữa).
- Có **1 thư mục lưu file thuật ngữ riêng cho từng thể loại phim**.
- Khi chọn thể loại → dùng file thuật ngữ riêng của thể loại đó; nếu câu/từ khớp với thuật ngữ trong file → **ưu tiên dùng bản dịch trong file**, thay vì dịch máy bình thường.
- File thuật ngữ **tách biệt theo từng ngôn ngữ nhận dạng**. Ví dụ: ngôn ngữ = tiếng Nhật, thể loại = phim tâm lý → dùng file thuật ngữ `tiếng Nhật × thể loại tâm lý`.

### 9.2 Phương pháp đề xuất (đã tư vấn cho user)
- **Cơ chế cốt lõi:** Custom glossary override (chuẩn CAT tool). Thực hiện 2 pha:
  - **Pre-edit:** quét câu nguồn tìm term khớp → thay bằng placeholder (vd `{{TERM_01}}`) + gửi kèm danh sách `source → target` vào prompt dịch để LLM giữ nguyên.
  - **Post-check:** sau khi có bản dịch, thay placeholder bằng target cứng (tránh LLM bỏ qua thuật ngữ).
- **Thứ tự ưu tiên khớp term (đã đổi ở bước 1):** chỉ file của **đúng thể loại đang chọn**. Không còn lớp «ngôn ngữ chung» hay «global». Không có mục `現場` đứng riêng. Dữ liệu tiếng Nhật chỉ có cụm riêng, ví dụ `撮影現場` → phim trường (file series) và `犯行現場` → hiện trường (file crime). Hai file không trộn nên không ghi đè nhau.
- **Cấu trúc thư mục** (`public/glossaries/`, fetch khi dịch):
  ```
  glossaries/
    ja/action.json … ja/daily.json
    ko/ …  zh/ …  en/ …
  ```
  15 thể loại: action, adventure, crime, scifi, horror, romance, psychological, comedy, costume, historical, mystery, sports, adult, series, daily.
- Đích cứng của file có sẵn là **tiếng Việt**. `restoreTerms` ghi đè bằng đúng chuỗi `target` đó. **Nếu người dùng chọn ngôn ngữ đích khác tiếng Việt, chỗ khớp thuật ngữ vẫn bị ép thành tiếng Việt.** Chưa có bản glossary theo ngôn ngữ đích. Đây là hạn chế còn lại, không sửa trong lượt 2026-11-04.
- **Định dạng 1 term (JSON/CSV):** `{ source, target, whole_word, case_sensitive, note }` — có thể mở rộng `regex, enabled, priority`.
- **Matching cho tiếng Nhật:** tiếng Nhật không có dấu cách → **KHÔNG** được `split(" ")`. Đề xuất dùng **kuromoji.js** (WASM, chạy được trên client) hoặc thuật toán **longest-match / Aho-Corasick trên trie**. Khi các term chồng lấn → **cụm dài hơn thắng**.
- **Điểm tích hợp với code hiện tại:** (đề xuất ban đầu, thực tế đã làm khác) bước quét term chạy **trước** `translateWithRepair` trong `src/components/use-pipeline.ts`; hàm quét/khôi phục term nằm trong `src/lib/sub/glossary.ts` (không phải `groq.ts`/`text.ts`). Có thể nhét glossary vào prompt dịch y như cách `addressLock()` đang làm (không cần thêm lượt LLM). Cân nhắc hợp nhất với "bible" nhân vật (`analyzeFilm`) để không có 2 hệ thống song song.
- **Tính năng phụ nên có:** trang test thử 1 câu (hiện term nào khớp + bản dịch cuối), import/export CSV/Excel, cache glossary trong RAM (không fetch lại mỗi lần dịch), log ghi lại các lần override để debug.

### 9.3 Việc cần các AI model tiếp theo phân tích & giải quyết
1. **Chốt cách triển khai** phù hợp stack React + Groq hiện tại: matching client-side trước khi gọi LLM, hay chỉ nhét glossary vào prompt (nhẹ hơn nhưng không chắc LLM tuân thủ 100%).
2. **Thiết kế thuật toán matching tối ưu cho tiếng Nhật:** xử lý biến dạng ngữ pháp (động từ đuôi ます/た/ない), kính ngữ, và các cụm từ mang nét văn hóa.
3. **Cơ chế fallback & xử lý xung đột:** nhiều term khớp chồng lấn, term nằm trong tên riêng/dialogue, glossary bị lỗi cú pháp.
4. **UI quản lý glossary:** thêm/sửa/xóa term, import hàng loạt, chọn/bổ sung thể loại.
5. **Liệt kê danh sách thể loại phim cần bổ sung** (user nói bộ thể loại hiện tại còn thiếu).
6. **Đề xuất cơ chế đóng góp cộng đồng** (nếu có): user gợi ý thuật ngữ mới → duyệt → merge vào glossary chung.

### 9.4 Ràng buộc cho AI tiếp nhận
- Giao tiếp với user bằng **Tiếng Việt**.
- Ưu tiên làm phần cốt lõi (quét term + override) trước, **không mở rộng quá xa** yêu cầu gốc.
- Nếu đụng vào prompt dịch: sửa bản React. File HTML không có trong gói giao.
- Mục tiêu cuối: chất lượng dịch **đúng nghĩa theo ngữ cảnh thể loại phim**, không chỉ đúng từ điển.

---

## 10. Hàng đợi từ báo cáo bản v4 (2026-11-03)

> **2026-11-06 01:01:** Các bước 1–7 dưới đây là lịch sử. Không làm lại. Việc mới chỉ bắt đầu khi user yêu cầu trong lượt chat đó. Quy tắc phiên bản và cách đẩy code nằm ở `huongdan.txt`.

Làm **từng bước**. Sau mỗi bước: cập nhật file này, đóng gói zip, liệt kê bước còn lại, hỏi trước khi làm tiếp. Quy tắc cùng nội dung nằm trong `huongdan.txt`.

### 3.9. Báo cáo mới của user (giữ nguyên ý, chưa xóa)

1. **Thuật ngữ:** không dùng chung giữa các thể loại. Cần bộ độc lập, càng nhiều và càng đúng càng tốt. Thêm thể loại **Hằng ngày**, từ theo cách nói hiện đại.
2. **Phân tích phim:** bảng nhân vật có 4 ô theo thứ tự «ô trống — nam/nữ — tự xưng — được gọi». Ô trống là gì? Sửa chữ trong ô thì gõ một ký tự là bàn phím ảo tắt, rất khó sửa. Phần tóm tắt và phân tích thì ổn, giữ nguyên.
3. **Phát video:** tùy chỉnh phụ đề chỉ dùng được lúc vào toàn màn hình. Thoát toàn màn hình thì chỉ còn một phần ô mẫu nổi.
4. **Thuyết minh:** đã có bảng nhân vật thì đọc theo giọng nam/nữ dựa trên bảng được không? Một số đoạn hình chưa tới câu đó mà thuyết minh đã đọc trước.
5. **Nhận dạng / câu nói / bản dịch:** một số đoạn bị thiếu, không dịch được.

### Nguyên nhân đã xác định (để bước sau không đoán lại)

- **Ô trống:** ô đầu là **tên nhân vật**. Chỉ có `aria-label`, không có nhãn hay placeholder nên nhìn như ô rỗng. Ba ô sau là giới, tự xưng, được gọi.
- **Bàn phím ảo thoát:** hàng nhân vật dùng `key` gồm cả tên (`${name}-${index}` trong `studio.tsx`). Gõ một chữ vào tên là key đổi, React dựng lại ô, focus mất, bàn phím tắt.
- **Panel phụ đề:** panel nằm `absolute` trong khung video `aspect-video` + `overflow-hidden`. Thoát toàn màn hình thì khung thấp, `max-h: 75%` cắt mất gần hết, chỉ lộ một phần ô mẫu. Trong toàn màn hình khung cao nên thấy đủ.
- **Đọc trước câu:** thuyết minh lấy câu bằng `findCueIndex(currentTime - offset + lead)`. Thanh «Đọc sớm hơn hình» (`lead`, mặc định 0) cố tình đọc sớm. Nếu mốc ASR sớm hơn lời thật trên hình, máy vẫn đọc theo mốc đó. **Đã xử lý ở bước 4:** không còn nhìn vào câu phía sau; `lead` giờ là số giây chờ sau khi câu hiện.
- **Thiếu đoạn:** bộ lọc `isNonSpeech` không được siết thêm (dễ nuốt «Ừ», «Em»). Nguyên nhân thiếu nhiều khả năng nằm ở cắt đoạn / model / câu trả về rỗng, chưa đo trên file của user.

### Đã xử lý bước 2 (2026-11-03)

- Hàng nhân vật dùng `key={`character-${index}`}`. Danh sách chỉ được sửa tại chỗ (không có nút thêm/xóa nhân vật), nên key theo vị trí là ổn định. Nếu sau này thêm nút thêm/xóa nhân vật thì phải đổi sang id riêng cho mỗi nhân vật.
- Mỗi hàng có tiêu đề «Nhân vật N» và nhãn hiện cho cả 4 ô. Ô đầu là tên nhân vật.
- Phần Tóm tắt và Thuật ngữ trong phim giữ nguyên.

### Đã xử lý bước 3 (2026-11-03)

- Panel không còn bị kẹt trong khung video khi không toàn màn hình. Toàn màn hình giữ nguyên dạng phủ đáy video (`max-h: 75%`), vì khung lúc đó cao đủ.
- Ngoài toàn màn hình, panel nằm ngay dưới video nên người dùng vừa kéo thanh vừa thấy phụ đề thật trên video (video vẫn hiện câu «Đây là phụ đề xem thử» khi chưa có câu thoại) và ô mẫu nổi ở đầu panel.
- Bật/tắt toàn màn hình khi panel đang mở: panel được dựng lại ở vị trí mới, giá trị chỉnh vẫn giữ vì nằm trong state `sub`. Đang kéo dở một thanh mà đổi toàn màn hình thì thao tác kéo đó bị ngắt (chấp nhận được).
- Chưa làm: HTML standalone (không có trong zip), nên không cần vá lần này.

### Đã xử lý bước 4 (2026-11-03)

- Nguyên nhân đọc trước câu: `findCueIndex(currentTime - offset + lead)`. `lead` (thanh «Đọc sớm hơn hình») nhìn vào tương lai, nên máy đọc câu sau trong khi hình vẫn đang ở câu trước. ASR sớm hơn miệng nhân vật vẫn có thể lệch nhẹ; không sửa bằng cách nuốt câu.
- Cách làm: chỉ đọc câu **đang hiện** trên hình. `lead` đổi nghĩa thành số giây **chờ sau** khi câu hiện (0–1,2). Mặc định 0. Người đã lưu số «đọc sớm» được đưa về 0, không bị hiểu thành chờ lâu.
- Giọng: bật sẵn «Đọc theo nam/nữ trong bảng nhân vật». Bằng chứng mạnh là tiền tố `Tên:` / `Tên：` (kể cả `variants`). Tự xưng đứng đầu câu chỉ dùng khi **đúng một người** tự xưng từ đó và **không nhân vật nào khác** dùng từ đó ở ô «được gọi». Ví dụ Minh tự xưng «anh», Lan được gọi «anh»: câu «Anh ơi…» **không** đổi giọng nam. Hai người cùng tự xưng «tôi» thì không đoán. Tắt ô này thì luôn dùng nút Nữ / Nam / Bất kỳ. Vá này nằm ở 2026-11-04 (`cast-voice.test.ts`).
- Giọng neural tiếng Việt: Hoài My / Nam Minh. Orpheus và giọng máy đi cùng giới khi đã khớp. Câu không khớp không ghi đè giọng người dùng đã chọn.
- Không làm trong bước này: diarization thật (Whisper không trả người nói), một câu hai giọng, bước 5 (đoạn thiếu).

### Đã sửa ngoài hàng đợi (2026-11-04) — không phải bước 5

- **Thuật ngữ dính chữ:** regex cũ bọc `\s*` hai bên `{{G0}}` nên «Anh ra {{G0}} ngay» thành «Anh rahiện trườngngay». `restoreTerms` giờ chỉ thay đúng token. Nhận thêm `{{ G0 }}`, `{{g0}}`, `{G0}`, `[[G0]]`. Số khớp hết chữ số, G1 không ăn G10.
- Prompt dịch (`translationMessages`) dặn giữ nguyên `{{G<số>}}`.
- Sau dịch, `settleGlossaryLines`: câu nguồn có placeholder mà bản dịch thiếu, hoặc còn token chưa restore, thì `use-pipeline.ts` dịch lại **đúng các câu đó một lần** bằng câu gốc (không protect). Lỗi lần hai thì `stripLeftoverPlaceholders` xóa token, không để `{{G` ra phụ đề.
- Không đổi định dạng file thuật ngữ, không đổi `findMatches`.

### Còn tồn tại / việc tiếp theo

- **Bước 5 Pha 0:** đã có log + UI + test. User cần chạy một phim thật rồi mở «Chẩn đoán câu bị loại» (hoặc xuất JSON). Chưa có số liệu đó thì không được siết/nới filter (Pha 1b, Pha 3).
- **Bước 5 Pha 1d:** đã có test. Câu dịch lỗi hiện «Không dịch được» và nút «Dịch lại các câu lỗi». Chưa user thử trên phim thật.
- **Bước 5 Pha 1a:** đã có test. Đoạn không giải mã được thử lại một lần, ngân sách 180 giây. Chưa user thử trên phim thật.
- **Bước 5 Pha 1c:** đã có test. Câu vùng chồng gán theo điểm giữa. Chưa user thử trên phim thật.
- **Bước 5 Pha 1b:** đã có test trên tín hiệu giả. Chưa có log phim thật để so số câu trước/sau. Ngưỡng không hạ.
- **Bước 5 Pha 2:** đã có test. Dò khoảng trống không tự gửi. Ngân sách 120 giây. Chưa user thử trên phim thật.
- **Bước 5 Pha 3:** đã đo. Không gắn Silero. Không nới bộ lọc thán từ.
- Việc còn lại không phải thêm pha nhận dạng: user chạy một phim thật, mở «Chẩn đoán câu bị loại» hoặc xuất JSON, rồi mới xét lại im lặng / thán từ nếu số liệu chỉ ra.
- **Bước 6 — màn hình theo luồng dùng.** 6.1–6.6 đã có test trên Chromium. Firefox và Safari iPhone chưa chạy.
- **Bước 7 — hết chồng, xếp tab, hết giật, số nổi, giọng so trong video.** 7.1–7.6 đã có test trên Chromium. Giọng chưa nghe trên phim thật. Chưa thử điện thoại thật.
- **Đề xuất ASR thiếu câu và chọn giọng:** mục 12. Bước 1 đến 4 đã có test. Chưa nghe trên phim thật.

### Máy đã chạy / máy cần thử (Bước 6.6)

| Máy | Đã làm | Còn lại |
|-----|--------|---------|
| Chromium trong sandbox | Đã mở 1280×800 và 390×844. Không tràn ngang, không lỗi console. Lúc 6.4 còn đo 768×1024, 1024×800 và ngang 844×390. | Không thay cho điện thoại thật |
| Firefox | Chưa chạy | User thử tab, video, dán key |
| Safari máy tính | Chưa chạy | User thử |
| Safari iPhone | Chưa chạy | User thử tai thỏ, bàn phím ảo, toàn màn hình |
- Thuật ngữ file sẵn **ép tiếng Việt** dù ngôn ngữ đích khác. «Tự nhận dạng» ở ngôn ngữ lời nói thì không nạp glossary.
- Thuyết minh vẫn không tách hai người trong một câu. Câu anh/em mơ hồ thì dùng giọng dự phòng (cố ý, không đoán).
- Mốc ASR sớm hơn miệng vẫn có thể làm thuyết minh lệch nhẹ; người dùng kéo «Chờ sau khi câu hiện». Không đọc câu phía sau.
- Bước 2 và 3 chờ user thử trên điện thoại. Bước 4 chờ nghe trên phim thật.

### Trạng thái hàng đợi

| Bước | Việc | Trạng thái |
|------|------|------------|
| 1 | 14 bộ thuật ngữ độc lập + thể loại Hằng ngày (hiện đại) | ✅ Xong 2026-11-03 |
| 2 | Bảng nhân vật: ghi rõ ô tên, sửa lỗi bàn phím ảo thoát sau một chữ | ✅ Xong 2026-11-03 (chờ user thử) |
| 3 | Tùy chỉnh phụ đề + ô mẫu dùng được cả khi không toàn màn hình | ✅ Xong 2026-11-03 (chờ user thử) |
| 4 | Thuyết minh giọng nam/nữ theo bảng nhân vật, không đọc trước câu | ✅ Xong 2026-11-03; vá anh/em 2026-11-04 (chờ user nghe) |
| **5** | **Giảm mất câu & lỗi dịch** (chi tiết mục 11) | ✅ Pha 0–3 đã có test. Pha 3 không gắn Silero. Chưa chạy phim thật |
| 5.0 | Pha 0 — Chẩn đoán (log reject + raw + UI) | 🟡 Đã có test 2026-11-04 13:25. Chưa chạy phim thật |
| 5.1d | Pha 1d — Xử lý batch dịch (parse thiếu câu, đánh dấu lỗi) | 🟡 Đã có test 2026-11-04 13:33. Chưa chạy phim thật |
| 5.1a | Pha 1a — Thử lại đoạn lỗi (retry có kiểm soát ngân sách) | 🟡 Đã có test 2026-11-04 13:40. Chưa chạy phim thật |
| 5.1c | Pha 1c — Xử lý biên đoạn (midpoint + rà soát keepFrom/dedup) | 🟡 Đã có test 2026-11-04 13:45. Chưa chạy phim thật |
| 5.1b | Pha 1b — Cải thiện phát hiện im lặng (RMS cửa sổ) | 🟡 Đã có test 2026-11-04 16:58. Chưa có số liệu phim thật |
| 5.2 | Pha 2 — Dò khoảng trống đáng nghi (có báo chi phí + xác nhận user) | 🟡 Đã có test 2026-11-04 17:08. Chưa chạy phim thật |
| 5.3 | Pha 3 — Tùy chọn nâng cao (VAD Silero, nới isNonSpeech khi có ví dụ thật) | ✅ Đã đo 2026-11-04 17:11. Không gắn. Không nới lọc |
| **6** | **Khung Phụ đề: video và bảng câu đứng yên, tab công cụ ngang** | 🟡 6.1–6.6 đã có test. Firefox và Safari iPhone chưa chạy |
| 6.1 | Đưa key, ngôn ngữ, file và nút chạy lên trên. Đóng thuật ngữ. Thu model vào «Tốc độ và chi phí» | 🟡 Đã có test 2026-11-04 20:13 |
| 6.2 | Thanh sản phẩm chỉ hiện Phụ đề. Video và bảng câu gắn một lần, không nằm trong tab | 🟡 Đã có test 2026-11-04 20:38 |
| 6.3 | Năm tab chỉ hiện một phần: Phim, Chất lượng, Nhân vật, Nghe, Kiểm tra. Một nút Dịch tiếp | 🟡 Đã có test 2026-11-04 20:41 |
| 6.4 | Ba cỡ màn hình. Video không bị cuộn mất. Điện thoại: tab không che kín video. Safe area, ô chữ ≥ 16px, nút ≥ 44px | 🟡 Đã có test 2026-11-04 20:48. Chưa Safari iPhone |
| 6.5 | Chuyển tab có animation ngắn. prefers-reduced-motion thì đứng yên. Chọn tab bằng bàn phím | 🟡 Đã có test 2026-11-04 20:55 |
| 6.6 | Không API chỉ một trình duyệt. Ghi máy đã chạy và máy cần user thử | 🟡 Đã có test 2026-11-04 20:58. Firefox và Safari iPhone chưa chạy |
| **7** | **Hết chồng khung, xếp tab, hết giật, số nổi, giọng so trong video** | 🟡 7.1–7.6 đã có test. Giọng chưa nghe trên phim thật. Không làm lại nếu user không yêu cầu |
| 7.1 | Video không đè tab. Bảng câu không bị tab phủ. Màn thấp không dùng lưới máy tính | 🟡 Đã có test 2026-11-04 21:48. Chưa điện thoại thật |
| 7.2 | Tab: Key Sub, Phim, Nhân vật, Nghe, Kiểm tra. Ba ô ngữ cảnh sang Nhân vật, không xóa | 🟡 Đã có test 2026-11-04 21:53 |
| 7.3 | Chọn file không kéo trang. Nút đóng là dấu X. Trạng thái khóa hai hàng | 🟡 Đã có test 2026-11-04 22:43 |
| 7.4 | Số thuật ngữ viên vàng chữ đen. Nút X nằm trong khung tab | 🟡 Đã có test 2026-11-04 23:01 |
| 7.5 | Đo cao độ lúc nhận dạng. Mốc cố định 160/190 Hz | 🟡 Đã có test 2026-11-04 23:12. Thay bằng 7.6 |
| 7.6 | So các câu trong cùng video. Một nhóm hoặc câu nằm giữa thì không đổi | 🟡 Đã có test 2026-11-04 23:25. Chưa phim thật |

---

## 11. Kế hoạch chi tiết Bước 5 — Giảm mất câu & không dịch được

> **Bắt buộc cho mọi AI:** Đọc kỹ mục này trước khi sửa bất kỳ dòng nào liên quan đến ASR / filter / dịch batch.  
> **Chỉ làm đúng một pha mỗi lần.** Sau khi hoàn thành một pha: cập nhật cột trạng thái ở bảng hàng đợi + ghi lịch sử, đóng gói, hỏi user trước khi chuyển pha tiếp.  
> Không siết hoặc nới bộ lọc khi chưa có dữ liệu từ Pha 0. Không đổi nhà cung cấp ASR (giữ Groq Whisper).

### Mục tiêu chung
- Giảm tình trạng mất câu và không dịch được.
- Không đổi nhà cung cấp ASR (giữ Groq Whisper).
- Ưu tiên chi phí thấp, rủi ro thấp, có thể đo lường được.
- Mỗi bước có tiêu chí hoàn thành rõ ràng trước khi chuyển bước tiếp theo.

### Nguyên tắc xuyên suốt
- Mỗi bước chỉ làm một việc, có test tái hiện được.
- Ưu tiên miễn phí / tiết kiệm hạn mức giây Groq.
- Không siết hoặc nới bộ lọc khi chưa có dữ liệu.
- Giữ nguyên các chức năng không liên quan (cử chỉ, panel phụ đề, TTS, glossary, bible…).

### File code chính cần đụng
- `src/lib/sub/text.ts` — `acceptSegment`, `isNonSpeech`, `parseTranslations`, `rms`, `SILENCE_RMS`, `OVERLAP_SECONDS`, `keepFrom`
- `src/components/use-pipeline.ts` — `applyReady`, `asrBuf`, `failedParts`, `translateRemaining`, worker ASR
- `src/lib/sub/groq.ts` — `translateOnce` / `translateWithRepair` (gọi parse)
- `src/lib/sub/types.ts` — type `Seg` (có thể thêm field optional)

---

### Pha 0 — Chẩn đoán (Ưu tiên cao nhất) — Bước 5.0

**Việc cần làm:**
- Ghi log đầy đủ mọi câu bị loại ở `acceptSegment` (lý do, thời điểm, văn bản, `no_speech_prob`, `avg_logprob`, `compression_ratio`, chỉ số đoạn).
- Lưu kết quả thô từ Groq trước khi qua bộ lọc `acceptSegment`.
- Thống kê theo lý do và theo ngôn ngữ.
- Hiển thị trong UI: tóm tắt số câu bị bỏ theo từng lý do + nút xem/xuất danh sách chi tiết.

**Tiêu chí hoàn thành:**
- Chạy được một phim thật và nhìn thấy danh sách câu bị loại kèm lý do. **Chưa đạt — chờ user.**
- Phân biệt được trường hợp “Whisper không nhận ra” với “App lọc bỏ”. **Đã tách trong code và test.**
- Không thay đổi kết quả phụ đề so với hiện tại. **Đã khóa bằng test** (`diagnostics.test.ts`: lời ngắn tự tin vẫn giữ, A/Ah vẫn bỏ, trùng/biên chồng vẫn bỏ).

**Đã làm (2026-11-04 13:25), trạng thái: đã có test, chưa user thử phim thật:**
- `acceptSegment` trả `{ accepted, reason, start, end, text }`. Nhánh loại và câu được giữ giống logic cũ.
- `ingestAsrPart` (`src/lib/sub/diagnostics.ts`) copy segment thô (text, start, end, no_speech_prob, avg_logprob, compression_ratio, ngôn ngữ Whisper báo nếu có) rồi mới lọc. `asrBuf` vẫn xóa sau khi áp dụng; bản raw nằm ở `rawParts` đến khi làm lại hoặc đổi file.
- Bốn nhóm: `whisper_empty` (đã gọi Whisper, không có text), reject của app (câu Whisper có text nhưng bị lọc), `silence` (RMS, không gửi Whisper), `decode_fail` (trình duyệt không giải mã).
- Thống kê theo lý do và theo ngôn ngữ. Ngôn ngữ: Whisper báo trước, không thì ngôn ngữ lời nói đã chọn, không thì «(tự nhận dạng)».
- UI ngay dưới dòng trạng thái: tóm tắt, danh sách, nút xuất JSON. Không hiện khi chưa chạy nhận dạng.
- Không đổi ngưỡng lọc, không đổi `parseTranslations`, không thử lại đoạn lỗi.

---

### Pha 1d — Xử lý batch dịch — Bước 5.1d

**Việc cần làm:**
- Sửa `parseTranslations` chấp nhận số lượng câu trả về ít hơn số câu gửi.
- Chỉ dịch lại những câu bị thiếu / lỗi, không dịch lại cả batch.
- Khi chia nhỏ batch vẫn truyền đủ ngữ cảnh (`ctx`, `addressLock`, bible…).
- Đánh dấu rõ câu lỗi dịch (`translationFailed`) và hiển thị trong UI (không lặng lẽ hiện câu gốc).
- Thêm nút «Dịch lại các câu lỗi».

**Tiêu chí hoàn thành:**
- Có unit test cho trường hợp LLM trả về thiếu câu. **Đạt** (`translate-batch.test.ts`).
- Batch lỗi không còn kéo theo cả 8 câu phải dịch lại. **Đạt trong test:** 6 câu đã có không bị ghi đè, chỉ 2 câu trống được chọn dịch lại.
- Người dùng nhìn thấy được câu nào dịch thất bại. **Có trong UI** («Không dịch được» + nút). Chưa user thử trên phim thật.

**Đã làm (2026-11-04 13:33), trạng thái: đã có test, chưa user thử phim thật:**
- `parseTranslations` không còn throw khi mảng ngắn hơn hoặc có ô không phải chuỗi. Câu thiếu thành chuỗi rỗng đúng vị trí. JSON hỏng hoặc không có mảng `t` vẫn lỗi cả lần gọi, rồi mới chia đôi (không gửi lại cùng một batch 8 câu).
- `translateWithRepair` chỉ gọi lại các vị trí trống hoặc chưa dịch, theo cụm liền nhau. `optsForRange` thêm câu trước/sau vào ctx và giữ nguyên `context` (addressLock + bible).
- Câu vẫn trống sau lần gọi lại được gắn `translationFailed`. Danh sách và phụ đề trên video hiện «Không dịch được», không lấy câu gốc làm bản dịch. Thuyết minh bỏ qua câu đó. SRT ghi `[không dịch được]`.
- Nút «Dịch lại các câu lỗi» chỉ đưa những câu đó vào hàng dịch.
- Không đụng ASR, filter, Pha 1a.

**Ghi chú kỹ thuật cũ (trước khi sửa):** `parseTranslations` từng throw nếu `arr.length !== count`, nên cả group trong `translateRemaining` fail.

---

### Pha 1a — Thử lại đoạn lỗi — Bước 5.1a

**Việc cần làm:**
- Tự động thử lại các đoạn `"fail"` tối đa 1 lần (có kiểm soát ngân sách giây).
- Báo rõ chỉ số đoạn + khoảng thời gian chưa nhận dạng được.
- Hiển thị số giây đã dùng cho việc thử lại.

**Tiêu chí hoàn thành:**
- Đoạn lỗi được thử lại có kiểm soát. **Đạt trong test:** mỗi đoạn một lần; 180 giây chỉ nhận 3 đoạn 60 giây; đoạn dài hơn phần còn lại không bị cắt.
- Người dùng biết chính xác đoạn nào còn thiếu. **Có trong UI** (chỉ số + khoảng thời gian, và số giây đã dùng). Chưa user thử trên phim thật.

**Đã làm (2026-11-04 13:40), trạng thái: đã có test, chưa user thử phim thật:**
- Chỉ thử lại `decode_fail` (trình duyệt không ra mẫu âm thanh). Không thử lại im lặng, Whisper trống, hay câu app đã lọc.
- Ngân sách 180 giây cho cả lần chạy. Đoạn không vừa phần còn lại được giữ nguyên và ghi «chưa thử lại vì hết ngân sách».
- Lần thử thành công thì nhận dạng như đoạn bình thường (cùng bộ lọc). Lần thử vẫn lỗi thì giữ trong danh sách thiếu.
- Bảng «Chẩn đoán câu bị loại» và dòng trạng thái ghi đoạn còn thiếu cùng số giây đã dùng.
- Không đổi RMS, overlap, filter. Không làm Pha 1c.

**Ghi chú kỹ thuật cũ (trước khi sửa):** `failedParts` chỉ ghi nhận `"fail"`. Pha 0 đã tách decode fail / Whisper trống / app lọc. Pha 1a chỉ đụng nhóm decode fail.

---

### Pha 1c — Xử lý biên đoạn — Bước 5.1c

**Việc cần làm:**
- Gán câu cho đoạn theo điểm giữa của câu thay vì bỏ 1 giây đầu đoạn sau (`keepFrom = chunkStart + OVERLAP_SECONDS * 0.5`).
- Rà soát lại logic `keepFrom` và bộ lọc trùng để tránh mất câu hợp lệ hoặc tăng trùng.

**Tiêu chí hoàn thành:**
- Có test tổng hợp kiểm tra câu nằm ở vùng overlap. **Đạt** (`overlap.test.ts`).
- Không làm tăng số câu bị loại oan. **Đạt trong test:** câu nửa đầu vùng chồng vẫn bị bỏ như cũ; câu điểm giữa ở đoạn sau thì được giữ; lời ngắn tự tin không bị siết. Chưa user thử trên phim thật.

**Đã làm (2026-11-04 13:45), trạng thái: đã có test, chưa user thử phim thật:**
- Mốc không đổi: `chunkStart + OVERLAP_SECONDS * 0.5` (1 giây). So **điểm giữa** câu với mốc đó, không so thời điểm bắt đầu.
- Câu đã có ở đoạn trước không được thêm lần nữa. Nếu đoạn sau nhận ra câu dài hơn và câu đó đang không bận dịch, nối chữ vào câu cũ rồi dịch lại.
- Không đổi ngưỡng im lặng, ảo giác, A/Ah. Không làm Pha 1b.

**Ghi chú kỹ thuật cũ (trước khi sửa):** `absStart < keepFrom` bỏ mọi câu bắt đầu trong 1 giây đầu đoạn sau, kể cả câu có phần lớn nằm ở đoạn sau.

---

### Pha 1b — Cải thiện phát hiện im lặng — Bước 5.1b

**Việc cần làm:**
- **Chỉ thực hiện khi Pha 0 chứng minh RMS đang là nguyên nhân mất câu.**
- Tính RMS theo cửa sổ nhỏ (ví dụ 1 giây), không chuẩn hóa toàn đoạn.
- Chỉ bỏ đoạn khi mọi cửa sổ (hoặc cửa sổ cao nhất) đều dưới ngưỡng.

**Tiêu chí hoàn thành:**
- Có số liệu so sánh trước/sau từ Pha 0. **Chưa có phim thật.** Test giả lập: RMS cả đoạn 60 giây có 1 giây tiếng thì dưới `0.005` (cách cũ bỏ), cửa sổ 1 giây thì giữ.
- Không làm tăng ảo giác. **Ngưỡng không hạ.** A/Ah vẫn bị loại. Chưa đo số câu ảo trên phim thật.

**Đã làm (2026-11-04 16:58), trạng thái: đã có test, chưa so trên phim thật:**
- `isSilentChunk` tính RMS từng cửa sổ 1 giây. Không lấy trung bình cả đoạn, không khuếch đại cửa sổ im.
- Chỉ bỏ đoạn khi mọi cửa sổ đều dưới `0.005`. Dùng ở lúc nhận dạng, lúc thử lại đoạn lỗi, và lúc kiểm tra file không có tiếng.
- Không đổi `acceptSegment` ngoài việc đã làm ở Pha 1c. Không làm Pha 2.

**Ghi chú:** Làm theo yêu cầu «tiếp tục» dù chưa có log Pha 0 trên phim của user. Nếu phim thật ra nhiều câu ảo hơn, có thể trả lại cách RMS cả đoạn.

---

### Pha 2 — Dò khoảng trống đáng nghi — Bước 5.2

**Việc cần làm:**
- Sau khi hoàn thành các bước trên, tìm các khoảng dài không có câu nhưng có năng lượng giọng nói.
- Chỉ nhận dạng lại các đoạn ngắn đó (có giới hạn tổng giây và yêu cầu người dùng xác nhận trước).

**Tiêu chí hoàn thành:**
- Có cơ chế báo chi phí trước khi chạy. **Đạt:** nút dò không gọi Groq; bảng hiện số giây và ước tính $; hộp thoại hỏi lại trước khi gửi.
- Không tự động tốn hạn mức vô kiểm soát. **Đạt trong test:** ngân sách 120 giây, khoảng dài hơn phần còn lại không bị cắt, khoảng im hoặc đã có câu không được đề xuất. Chưa user thử trên phim thật.

**Đã làm (2026-11-04 17:08), trạng thái: đã có test, chưa user thử phim thật:**
- Khoảng đáng nghi: ít nhất 2 giây liên tục có RMS ≥ `0.005`, và không nằm trong câu đã có.
- Chỉ gửi đúng các khoảng đó, không gửi lại cả phim. Trần 120 giây cho cả lần chạy (trừ phần đã gửi).
- Câu thêm ra chưa dịch. Bấm Tiếp tục để dịch, không nhận dạng lại.
- Không hạ ngưỡng im lặng, không nới A/Ah. Không làm Pha 3.

---

### Pha 3 — Tùy chọn nâng cao — Bước 5.3

**Việc cần làm:**
- Đánh giá VAD Silero (kích thước, hiệu năng trên trình duyệt).
- Chỉ nới `isNonSpeech` hoặc thêm hỗ trợ thán từ ja/ko/zh khi có ví dụ thật từ Pha 0.

**Tiêu chí hoàn thành:**
- Có đo đạc thực tế trước khi quyết định tích hợp. **Đạt.** Đo file thật, không ước lượng. Quyết định: **không gắn.**

**Đã đo (2026-11-04 17:11):**

| Thứ | Byte | Gzip |
|-----|------|------|
| `silero_vad.int8.onnx` (k2-fsa, 16 kHz) | 212860 | 148120 |
| `silero_vad.onnx` v5 (snakers4) | 2313101 | 1942942 |
| `onnxruntime-web@1.31.1` `ort-wasm-simd-threaded.wasm` | 14848852 | 3792479 |
| `ort.wasm.min.js` | 53796 | 17103 |
| App hiện tại (JS + CSS bản build) | 606582 | 189397 |

- Cụm nhỏ nhất để chạy Silero trên trình duyệt (model int8 + WASM + glue) gzip khoảng **4.0 MB**, khoảng **21 lần** app hiện tại.
- RMS cửa sổ đang dùng: 10 phút âm thanh (9.6 triệu mẫu) hết **25.1 ms** trong Node. Không cần mạng nơ-ron cho bước này.
- Không tải model vào repo, không thêm dependency.

**Không làm:**
- Không nới `isNonSpeech`. Chưa có câu ví dụ ja/ko/zh từ log Pha 0. «A» / «Ah» vẫn bị loại. «Ừ» và «うん» khi model tự tin vẫn được giữ.
- Không gắn VAD. Nếu sau này phim thật cho thấy RMS bỏ nhầm tiếng người (không phải im), hãy xét lại bằng model int8, và chỉ tải WASM khi người dùng bật, không nhét vào lần mở app.

---

### Quy tắc bắt buộc khi làm Bước 5
1. Làm **đúng một pha** mỗi lần chuyển giao / mỗi phiên.
2. Sau mỗi pha: cập nhật bảng trạng thái hàng đợi + ghi vào lịch sử thay đổi trong file này.
3. Không nhảy pha, không làm song song nhiều pha.
4. Không thay đổi hành vi filter / RMS / overlap khi chưa có dữ liệu Pha 0.
5. Mọi thay đổi phải có tiêu chí hoàn thành kiểm chứng được (test hoặc chạy phim thật).
6. Giữ nguyên mọi chức năng không liên quan.

---

## 12. Đề xuất khắc phục triệt để – ASR thiếu câu & Chọn giọng nam/nữ

> **Trạng thái 2026-11-05 12:34:** Bước 1 đến 4 đã có test. Chưa nghe trên phim thật.

### 12.1 Vấn đề hiện tại

Giữ nguyên ý user đã báo:

- Nhận dạng câu chưa hoàn chỉnh: dễ thiếu câu, sai câu, cắt giữa câu, câu ngắn bị lọc mất.
- Nhận nam/nữ chưa đủ để máy tự chọn giọng thuyết minh. Câu ngắn hoặc tiếng ồn dễ không gán được, hoặc gán lệch. Phim một người nói thì cả video giữ giọng dự phòng.

Chưa có log một phim thật để biết lý do nào đang nuốt câu nhiều nhất. Không được siết lọc thêm trước khi có số liệu đó (quy tắc mục 7 và mục 11).

### 12.2 Nguyên nhân đang có trong code

Đối chiếu ngày 2026-11-05. Một số câu trong bản đề xuất gửi kèm không còn đúng với code.

**Cắt đoạn**

- File đã giải mã thành PCM đi qua `splitAudio` (`text.ts`). Đoạn mục tiêu 60 giây, chồng 2 giây, đoạn tối thiểu 10 giây. Nếu chưa hết file, app tìm cửa sổ 0,2 giây có năng lượng thấp nhất trong **5 giây cuối** của đoạn rồi cắt ở giữa cửa sổ đó. Vẫn có thể cắt giữa câu nếu chỗ nhỏ năng lượng không phải chỗ ngừng lời.
- File xem theo dòng (`j.pcm` không có) đi qua `streamParts`. Cách này **chỉ cắt theo thời gian**, không dò năng lượng. Chồng 2 giây, đoạn cuối ngắn hơn 10 giây thì nhập vào đoạn trước.
- Chỗ gọi: `use-pipeline.ts`, `j.parts = j.pcm ? splitAudio(j.pcm) : streamParts(...)`.

**Im lặng**

- `isSilentChunk` không còn lấy một RMS cho cả đoạn. Nó tính RMS từng cửa sổ 1 giây, ngưỡng `0.005`. Chỉ bỏ đoạn khi **mọi** cửa sổ đều dưới ngưỡng (`text.ts`, Pha 1b).
- Đây vẫn là năng lượng, không phân biệt tiếng người với nhạc hay tiếng ồn. Một giây có tiếng là cả đoạn 60 giây được gửi Whisper.

**Lọc câu**

- `isNonSpeech` bỏ câu chỉ toàn A/Ah/thở/rên, kể cả khi model tự tin. «Ừ», «うん» khi model tự tin thì giữ. Hàm này chưa có file test riêng; `vad-eval.test.ts` chỉ khóa vài ví dụ.
- `acceptSegment` không có mốc «dưới 1,5 giây thì bỏ». Câu ngắn chỉ rơi khi:
  - còn 1 chữ và `no_speech_prob` > 0,6 (`short_uncertain`);
  - không quá 4 chữ, dài dưới 0,8 giây, và `no_speech_prob` > 0,85 (`brief_uncertain`);
  - hoặc dính ảo giác, nén cao, độ tin thấp (`low_confidence`: `no_speech_prob` > 0,8 và `avg_logprob` < −0,8).
- Câu ở nửa đầu vùng chồng 2 giây vẫn bị bỏ nếu điểm giữa nằm trước mốc 1 giây (Pha 1c).

**Giọng nam/nữ**

- `hearVoice` (`text.ts`) chỉ đo khi lát cắt của câu dài ít nhất 0,5 giây. Ngắn hơn thì không có `pitchHz`.
- `measurePitch` (`pitch-voice.ts`) là tự tương quan. Bỏ 0,1 giây hai đầu. Thân câu sau khi bỏ hai đầu phải còn khoảng 0,3 giây. Khung 30 ms, bước 15 ms. Cần ít nhất 8 khung, 6 khung có chu kỳ, và ít nhất 40% khung có tiếng. Cao độ lấy trung vị, dải 70–400 Hz.
- `assignVoices` xóa `voice` rồi gán lại. Tìm **khoảng trống lớn nhất** giữa các câu đã đo. Khoảng trống và khoảng cách hai tâm đều phải từ 40 Hz trở lên. Câu gần cả hai tâm (lệch dưới 15 Hz so với một bên) thì không gán. Một nhóm, hoặc chưa đủ hai câu đo được, thì không gán. Gọi từ `ingestAsrPart` (`diagnostics.ts`) sau mỗi lần thêm câu.
- `voiceGenderForLine` (`cast-voice.ts`) vẫn chọn nam/nữ khi câu có «Tên:» hoặc tự xưng đứng đầu, và vẫn chặn anh/em mơ hồ. **Không file nào trong `src/` gọi hàm này** ngoài `cast-voice.test.ts`. `speakAt` trong `studio.tsx` chỉ dùng `seg.voice` khi ô đọc theo video đang bật. Không có `seg.voice` thì dùng giọng dự phòng (Neural: Nữ hoặc Nam; không còn «Bất kỳ»).
- Vì vậy bảng nhân vật đang ảnh hưởng bản dịch (`addressLock`), không ảnh hưởng giọng đọc.

**Việc đã có, đừng làm như chưa có**

- Tab Kiểm tra có «Chẩn đoán câu bị loại»: lý do, thời điểm, xuất JSON, và từ 2026-11-05 12:10 có Nghe / Giữ / Bỏ từng câu. Giữ không gửi lại cả phim.
- Thử lại tự động (Pha 1a) chỉ dành cho `decode_fail`, mỗi đoạn một lần, ngân sách 180 giây. Không thử lại `low_confidence`, `short_uncertain`, `brief_uncertain`, hay Whisper trống.
- Dò khoảng trống (Pha 2) là đường khác: chỗ có tiếng ≥ 2 giây mà không có câu, ngân sách 120 giây, phải bấm và xác nhận. Không phải retry theo lý do lọc.
- Pha 3 đã đo Silero. Từ 2026-11-05 12:21 có ô bật: model int8 và WASM chỉ tải khi bật, không nằm trong JS lúc mở trang. Tắt thì vẫn chỉ dùng RMS.

### 12.3 Phương án đề xuất, theo thứ tự

Bước 1 đến 4 đã làm. Không siết `isNonSpeech`.

**Bước 1 — đã có test 2026-11-05 12:10.** Chưa nghe trên phim thật.

- Khi đọc, `narrationChoice` dùng `voiceGenderForLine` trước. Chỉ khi hàm trả `null` mới dùng `seg.voice`. Tắt ô thì giữ giọng dự phòng. Anh/em mơ hồ vẫn không đoán.
- Không thêm cổng «dưới 1,5 giây thì bỏ». `short_uncertain` và `brief_uncertain` được giữ khi `avg_logprob` là số và ≥ −0,6. Thiếu số thì vẫn loại như cũ. `isNonSpeech` chạy trước, nên «A» / «Ah» vẫn loại dù logprob cao.
- Tab Kiểm tra: mỗi câu lọc có Nghe (đúng lát tiếng), Giữ (đưa vào phụ đề, không gửi lại cả phim), Bỏ (đánh dấu, không đưa vào phụ đề).

**Bước 2 — đã có test 2026-11-05 12:21.** Chưa chạy trên phim thật.

- Ô «Chỉ gửi đoạn có tiếng người» trong tab Key Sub. Tắt mặc định, nên lần mở app không tải WASM.
- Bật thì `gateChunk` gọi Silero int8 (`public/models/silero_vad.int8.onnx`, 212860 byte) qua `onnxruntime-web`, WASM ở `public/vad/` (15 MB, một luồng). Cắt phần không phải lời ở đầu và cuối mỗi đoạn. Không tách thành nhiều request.
- Không có lời thì không gửi Whisper. Lỗi tải model hoặc WASM thì dùng `isSilentChunk` như khi tắt ô.

**Bước 3 — đã có test 2026-11-05 12:28.** Chưa chạy trên phim thật.

- `chunksFromSpans` gộp chỗ ngừng dưới 1,5 giây và cắt chỗ ngừng dài hơn. Đoạn liền quá 60 giây vẫn cắt, có 2 giây chồng. Đoạn không chồng thì không bỏ câu ở đầu đoạn sau.
- File đã giải mã dùng năng lượng từng giây. Bật lọc tiếng người và có PCM thì dùng vùng Silero. File xem theo dòng dò năng lượng từng khúc 30 giây, không chỉ sửa `splitAudio`.
- Sau retry lỗi giải mã, `planFilterRetries` gửi lại `low_confidence`, `short_uncertain`, `brief_uncertain` và Whisper trống. Ngân sách 120 giây, không cộng vào 180 giây của lỗi giải mã. Câu đã bấm Bỏ không gửi lại.

**Bước 4 — đã có test 2026-11-05 12:34.** Chưa nghe trên phim thật.

- `measurePitch` bỏ câu có cao độ lệch quá 35 Hz. `hearVoice` vẫn chỉ đo câu từ 0,5 giây.
- Nút Đổi giọng trên mỗi câu: tự động → nam → nữ → tự động. Khóa lưu theo tên phim, lần gán sau không đè.
- Giới trong bảng nhân vật được lưu. Phân tích lại không xóa giới đã chọn. Lúc đọc, khóa từng câu thắng bảng nhân vật, bảng thắng cao độ.

### 12.4 Ghi chú

- Lượt 2026-11-05 12:04 chỉ ghi đề xuất. Lượt 12:10 làm bước 1. Lượt 12:21 làm bước 2, ô tắt mặc định. Lượt 12:28 làm bước 3. Lượt 12:34 làm bước 4.
- Hàng 23: bảng nhân vật đã được gọi lúc đọc, và thắng cao độ khi khớp.
- «Im lặng chỉ là một RMS đơn giản cho cả đoạn» là mô tả cũ. Code hiện tại là RMS cửa sổ 1 giây.

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

## Ghi chú sửa nhận dạng (2026-11-11, Claude)
- `groq.ts`: xin thêm mốc từng từ (`timestamp_granularities[]` word + segment). Groq trả 400 thì tự gửi lại không có mốc từ, rồi mới thử WAV.
- `word-time.ts` + `diagnostics.ts`: giờ câu lấy theo từ đầu tiên/cuối cùng, chỉ dịch vào trong câu. Sửa lỗi câu đầu đoạn sớm 0,7–1,2 giây.
- `text.ts`: câu «cảm ơn đã xem» kéo dài từ 6 giây bị loại; thoại lặp thật vẫn giữ. Prompt dịch có dòng cảnh báo lỗi đồng âm.
- `scripts/asr-eval.mjs`: đo CER/WER và lệch giờ theo bảng đáp án `doi-chieu.txt`.
- Chưa chạy trên Groq thật. Chữ nhận sai ZH/JA là lỗi của Whisper, chưa sửa bằng mã.
- 2026-11-14 10:20 — v3.31.0 trên work (theo yêu cầu: gói cải tiến Admin A–F, giai đoạn 2). Làm: F giao diện (thanh bên trái từ 1024 px, Ctrl+K tìm mục và khách, hàng nút điện thoại dính khi cuộn), C phần mới (biểu đồ đường thu/chi, ARPU, tỷ lệ dùng thử → mua, giá vốn mỗi phút âm thanh, chi phí ghi tay theo loại, migration 0023). Không đổi điều khoản, không đụng dữ liệu khách. Chưa làm, chờ người dùng chốt: D xem câu lỗi và gửi kiểm tra lại, chặn toàn bộ phòng khi bảo trì, chế độ Chỉ xem. Chưa thử trình duyệt thật và Neon thật.
- 2026-11-14 19:30 — v3.31.2 trên work (giữ số bản theo yêu cầu): SideRail dùng chung có nhóm hai tầng, Admin 5 nhóm, trang khách bỏ hàng tab công cụ và menu thả xuống, Đăng xuất xuống cuối menu; chụp Chrome 390 và 1280 px.
- 2026-11-14 20:20 — v3.32.0 trên work (mục 1 và 6 của bảy mục «giao diện nhẹ»): home-state.ts, home-hero.tsx, studio-palette.tsx, palette-match.ts. Trang chủ một ô thả lớn + hàng chip + nút Tải và dịch khi chưa có phụ đề; dán link ở bất cứ đâu tự bắt đầu ở trang chủ; Ctrl+K cho trang khách; mục Trang chủ trong menu trái. Test mới home-state, palette-match.
- 2026-11-14 20:50 — v3.33.0 trên work (mục 2 và 3): steps-bar.tsx thanh liền có vạch ngăn; cue-editor.tsx sửa câu tại dòng thay hộp trượt từ đáy; export-menu.tsx menu tải SRT/WebVTT/TXT, text.ts thêm toVtt và toTxt. Bấm dòng nhảy video và phụ đề hiện dần đã có từ trước, không đổi. Test mới export-format.
- 2026-11-14 21:30 — v3.34.0 trên work (mục 4): money-card.tsx, wallet-view.ts. Số dư, «còn khoảng N phút», ước tính cho video đang chọn, báo thiếu tiền, nạp nhanh bằng TopUp chế độ gọn; chỉ hiện khi chọn Trả theo lượt; không đổi giá, giữ ví hay điều khoản. Test mới wallet-view. Chưa thử với ví và gói thật.
- 2026-11-14 12:20 — v3.31.2 trên work: thêm .admin-card, align-content:start, Cấu hình tách part key/price, gập soạn thư và icon; đã chụp Chrome thật 390 và 980 px, không tràn ngang.
- 2026-11-14 11:40 — v3.31.1 trên work (theo ảnh chụp người dùng). Làm: .admin-grid và .admin-flow thành lưới đều, tab Cấu hình (key Groq, giá, key Alibaba, gói dịch, model thuê phòng, cổng nạp), thẻ gập cho phần dài, lưu bảo trì và giá đọc lại cửa mới nhất trước khi ghi. Không đổi điều khoản. Chưa kiểm trình duyệt thật.

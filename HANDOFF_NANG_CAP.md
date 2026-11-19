# HANDOFF NÂNG CẤP — Trau chuốt bản dịch + prompt theo thể loại + thư viện thuật ngữ

Lập ngày 19/11/2026, nhánh `work`. File này là kế hoạch làm từng bước đến khi hoàn thiện. Ai (tài khoản nào) làm tiếp cũng đọc file này trước, rồi đọc `AGENTS.project.md`, `BANG_DIEU.md`, `huongdan.txt`, và mục đầu `HANDOFF.md`. Mỗi bước xong: đánh dấu [x] ở đây, ghi ngắn vào đầu `HANDOFF.md`, commit, đẩy lên `work`.

## Quy tắc bắt buộc (từ Chủ và từ dự án)
- Làm trên nhánh `work`, từng bước một, đẩy lên `work` sau mỗi bước.
- Mỗi bước: sửa code, `npm run typecheck`, `npx eslint <file đã sửa>` (hoặc `npm run lint`, 0 lỗi), `npm test` (pass hết; hiện 198 + 1089). Test mới phải thêm vào danh sách trong script `test` ở `package.json` nếu là file `src/**/*.test.ts` (script liệt kê từng file).
- Khi đổi hành vi khách thấy: nâng `APP_VERSION` (`src/lib/app-version.ts`) + `CHANGELOG` (chữ cho khách, không từ nội bộ) + `ADMIN_LOG`.
- KHÔNG dùng hộp thoại mặc định của trình duyệt (`alert`, `confirm`, `prompt`). Mọi thông báo và xác nhận dùng hộp thoại của app (`ConfirmDialog`, `pushToast`). Có test chặn: `src/lib/no-native-dialog.test.ts`.
- Màu chỉ dùng biến theme (`--color-accent`, ...), không mã màu cứng.
- Không ghi token, mật khẩu hay key vào file hay commit. Token GitHub do Chủ đưa trong chat, tạm thời; xin token mới khi cần đẩy.
- Câu lệnh gốc yêu cầu model trả JSON (`translationMessages` ở `src/lib/sub/text.ts`, `analyzeFilm` ở `src/lib/sub/groq.ts`) giữ cố định. Phần tùy chỉnh chỉ NỐI THÊM, có giới hạn độ dài, để không làm hỏng định dạng JSON mà code đọc lại.
- Việc liên quan tiền (trừ Token, giá) là đổi quyền lợi khách: nếu đổi điều khoản thì sửa `src/components/terms-document.tsx` và nâng `TERMS_VERSION` (`src/lib/terms.ts`). Hỏi Chủ trước.

## Chủ đã quyết (không hỏi lại)
1. Tính tiền trau chuốt: ước lượng trước theo giá model dùng để trau chuốt, HIỆN giá cho người dùng. Người dùng chọn đồng ý thì mới gửi; không đồng ý thì thôi, không trừ gì. (Dùng `src/lib/cost-estimate.ts` và cơ chế trừ Token/giây có sẵn; hệ số «đối chiếu» ~35% lượt dịch đang ở `src/lib/service-pack.ts` dòng ~75, chỉ tham khảo.)
2. Model: chọn model hợp nhất cho việc này trong danh mục model dịch hiện có (`src/lib/sub/models.ts`), cho người dùng đổi. KHÔNG đoán tên model tốt nhất cho tiếng Việt; làm khung chọn model, mặc định là model dịch mạnh nhất đang có, Chủ chạy phim mẫu để chốt.
3. Phạm vi: cả phim.
4. Mỗi thể loại có PROMPT RIÊNG (giọng văn, xưng hô, mức thô tục, độ dài câu) thay vì chỉ là bộ từ. Thể loại cần có: cuộc sống hằng ngày, kiếm hiệp, tiên hiệp, hài, ngôn tình, hình sự, trinh thám, thể thao, phim 18+, phim cấp 3, tâm lý xã hội, hành động, và thêm nữa.
5. Hiện kết quả trau chuốt CẠNH bản cũ; người dùng chấp nhận từng câu, chấp nhận tất cả, hoặc quay lại bản cũ. Không ghi đè ngay. Câu người dùng đã sửa tay (cờ `edited`) không đụng tới.

## Cần Chủ chốt (chưa quyết)
- GIỮ hay XÓA phần thuật ngữ. Đề xuất của Claude: GIỮ. Lý do: prompt thể loại quyết giọng văn, thuật ngữ khóa từ cụ thể (tên, chiêu thức, địa danh); thuật ngữ còn dùng cho nhận dạng (`asrPrompt`) và bước dịch. Việc nên làm: thể loại chọn một prompt giọng văn riêng, thuật ngữ của người dùng và bảng nhân vật vẫn đi kèm. Chủ chưa trả lời chốt. Nếu chưa có câu trả lời thì làm theo đề xuất (GIỮ).
- Thứ tự: A (trau chuốt trước, thư viện sau, Claude nghiêng về A) hay B (thư viện trước). Mặc định làm A nếu Chủ chưa nói.

## KẾT QUẢ A1 (19/11/2026, v5.8.0) — đọc trước khi làm A2
ĐÃ LÀM:
- File mới `src/lib/sub/genre-prompts.ts` (file thuần, không import gì): `GENRE_PROMPTS` có prompt trau chuốt RIÊNG cho 26 thể loại (17 cũ + 9 mới), mỗi mục có `label`, `polish` (prompt tiếng Anh dặn giọng văn, xưng hô, mức thô tục, độ dài câu cho bản dịch tiếng Việt), và `hint` (gợi ý ngắn cho bước dịch, chỉ thể loại mới). Hàm: `genrePrompt(genre)` (thể loại lạ/rỗng rơi về `FALLBACK_GENRE_PROMPT`), `hasGenrePrompt`, `genreHint`, hằng `GENRE_PROMPT_MAX = 1200`.
- 9 thể loại mới (khóa: nhãn): `wuxia` Kiếm hiệp, `xianxia` Tiên hiệp, `ngontinh` Ngôn tình, `softcore` Phim cấp 3, `social` Tâm lý xã hội, `war` Chiến tranh, `family` Gia đình, `school` Học đường / thanh xuân, `documentary` Tài liệu / phóng sự. Trinh thám ĐÃ CÓ sẵn dưới khóa `mystery` («Trinh thám / bí ẩn»), cổ trang/kiếm hiệp chung ở `costume`, nên không tạo trùng. Tâm lý (`psychological`) và Tâm lý xã hội (`social`) là hai thể loại riêng.
- Danh sách thể loại nay CHỈ khai một nơi: `GENRES` ở `src/lib/home-state.ts`. `src/lib/glossary-share.ts` lấy `GENRES` (tập hợp hợp lệ) và `GENRE_LABELS` từ đó. Muốn thêm thể loại: thêm vào `home-state.ts` + thêm mục trong `GENRE_PROMPTS` (test sẽ báo nếu thiếu).
- `src/lib/sub/text.ts` `translationMessages`: dòng thể loại là `GENRES[opts.genre] || genreHint(opts.genre)`. Thể loại cũ giữ nguyên chữ cũ; thể loại mới dùng `hint`. Phần JSON gốc không đổi.
- Test `src/lib/sub/genre-prompts.test.ts` (9 ca, đã thêm vào script `test`): mọi thể loại trong ô chọn có prompt riêng (không rơi dự phòng), độ dài ≤ 1200, nhãn khớp ô chọn, thể loại lạ rơi dự phòng, thể loại 18+ có dặn không kiểm duyệt/làm nhẹ, cổ trang dặn `ta/ngươi`, `glossaryPair` nhận mọi khóa.
- Nâng `APP_VERSION` 5.8.0, `CHANGELOG` (mỗi dòng ≤ 100 ký tự, có test), `ADMIN_LOG`. Kết quả: typecheck sạch, eslint 0 lỗi, `npm test` 198 + 1089 pass.
CHƯA CÓ (đúng phạm vi A1): chưa có chỗ nào GỌI `genrePrompt(...).polish`; đó là việc của A2 (`polishBatch`). Thể loại mới CHƯA có file thuật ngữ trong `data/glossaries` nên bộ thuật ngữ của chúng rỗng (việc B1).
CHỜ CHỦ CHỐT: `softcore` (Phim cấp 3) hiện CÓ nối bộ nền `auto` như thể loại thường, vì `NO_BASE_GENRES` (`src/lib/sub/glossary.ts`) chỉ gồm `auto`, `adult`, `sex`. Nếu Chủ muốn cấp 3 đứng riêng như hai bộ 18+, thêm `softcore` vào `NO_BASE_GENRES`. Chưa đổi vì chưa hỏi.
VIỆC TIẾP THEO: A2 (`polishBatch`). Dùng `genrePrompt(genre).polish` nối thêm vào lệnh trau chuốt, KHÔNG thay lệnh JSON gốc.

## Hiện trạng đã khảo sát (để khỏi đọc lại)
- Thuật ngữ nền: `data/glossaries/{en,ja,ko,zh}/<thể loại>.json`, khoảng 4.039 mục, 17 thể loại: action, adult, adventure, auto, comedy, costume, crime, daily, historical, horror, mystery, psychological, romance, scifi, series, sex, sports. Mỗi file 30 đến 110 mục (zh mỏng nhất ~40). CHƯA thấy file riêng cho kiếm hiệp, tiên hiệp, ngôn tình, trinh thám (chưa kiểm xem có gộp vào costume, historical, romance, mystery không; kiểm trong code trước khi thêm). Nạp qua `src/lib/glossary-seed.server.ts` vào bảng `glossary_packs`, `glossary_terms`; client lấy bằng `getGlossaryPack` (`src/lib/glossary-room.ts`), `loadRunGlossary` (`src/lib/sub/glossary.ts`).
- Prompt người dùng chỉnh được hiện nay: tên phim, ghi chú (≤1500 ký tự), bảng thuật ngữ (`tên gốc = cách dịch`), thể loại, nhân vật (giới tính, xưng hô). Prompt gốc cố định trong code. Ô khai ở `src/components/studio.tsx` dòng ~1355.
- Luồng dịch: `src/components/use-pipeline.ts` (dịch theo lô ~dòng 1480 đến 1610), `translateBatch`, `translateIndexes` (`src/lib/sub/groq.ts`), `contextBlock`, `filmContext` (`src/lib/sub/text.ts`), kiểm tra câu chưa dịch `untranslated` (`text.ts`). Phân tích phim: `analyzeFilm` (`groq.ts`), KHÔNG có test.
- Sửa tay giữ được nhờ cờ `seg.edited`; câu lỗi có `translationFailed`, nút `fillGaps`.

## CÁC BƯỚC (đánh dấu khi xong)

### Giai đoạn A — Trau chuốt bản dịch
- [x] A1 (xong 19/11/2026, v5.8.0; chi tiết ở mục «KẾT QUẢ A1» bên dưới). Kho prompt theo thể loại: tạo file dữ liệu (ví dụ `src/lib/sub/genre-prompts.ts` hoặc JSON trong `data/`) với prompt riêng cho từng thể loại ở mục «Chủ đã quyết 4», có mục dự phòng cho thể loại chưa có prompt. Test: mọi thể loại trong Select thể loại đều có prompt hoặc rơi về dự phòng, độ dài trong giới hạn. Kiểm trước xem thể loại kiếm hiệp, tiên hiệp, ngôn tình, trinh thám, cấp 3, tâm lý xã hội đã có trong danh sách chọn chưa; chưa có thì thêm vào Select (`studio.tsx` ~dòng 1283 và 1654, kiểu thể loại ở `src/lib/sub/glossary.ts`/`models.ts`).
- [ ] A2. Hàm trau chuốt: `polishBatch` (đặt cạnh `translateBatch` trong `groq.ts` hoặc file mới `src/lib/sub/polish.ts`). Đầu vào: câu gốc + bản dịch hiện tại + nhân vật/xưng hô + thuật ngữ + prompt thể loại. Đầu ra JSON cùng số dòng, chỉ đổi câu cần đổi. Dặn giữ số dòng, thuật ngữ khóa. Dùng lại `requestWithRetry`, hạn chót, xử lý 429, chia lô khi lỗi. Nếu model từ chối hoặc làm nhẹ nội dung (nhất là thể loại 18+): giữ bản cũ và báo rõ câu nào bị từ chối, không im lặng. Test bằng phản hồi giả (không gọi mạng): số dòng khớp, câu `edited` không bị đổi, lỗi một lô không làm mất cả phim.
- [ ] A3. Ước giá + xác nhận: tính ước lượng từ số câu, độ dài, giá model (`cost-estimate.ts`), hiện trong hộp thoại của app (KHÔNG `confirm()` của trình duyệt). Đồng ý thì chạy, không thì dừng, không trừ. Chọn model trau chuốt (mặc định theo «Chủ đã quyết 2»).
- [ ] A4. Màn xem so sánh: cột «Bản dịch» và «Bản trau chuốt», chấp nhận từng câu / tất cả / quay lại bản cũ; hoàn tác được; câu bị từ chối đánh dấu. Dùng bộ màu theme. Chụp thử bằng trình duyệt headless nếu được.
- [ ] A5. Nối nút «Trau chuốt bản dịch» ở gần bước cuối (sau khi dịch xong, trong `studio.tsx`/`use-pipeline.ts`), trừ Token đúng số thực khi chạy, lỗi nhà cung cấp thì không trừ. Nâng `APP_VERSION` + `CHANGELOG` + `ADMIN_LOG`. Ghi `PROJECT_STATUS.md`, `BANG_DIEU.md` nếu quy trình yêu cầu.

### Giai đoạn B — Thư viện thuật ngữ (làm sau A nếu Chủ không đổi thứ tự)
- [ ] B1. Rà thể loại thiếu (kiếm hiệp, tiên hiệp, ngôn tình, trinh thám…): thêm file dữ liệu theo từng ngôn ngữ nguồn, đánh dấu «chưa duyệt» để Chủ xem lại. Bản nháp do Claude soạn KHÔNG coi là đã đúng; cách dịch thuật ngữ cộng đồng có nhiều biến thể.
- [ ] B2. Công cụ nhập hàng loạt cho Chủ (CSV/JSON) vào `glossary_terms`, có xem trước và hộp thoại xác nhận của app.
- [ ] B3. Nhãn «đã duyệt / chưa duyệt», lọc theo nhãn, thống kê số mục mỗi thể loại ở trang Admin.
- [ ] B4. Mở rộng các bộ mỏng (tiếng Trung ~40 mục mỗi thể loại) theo đợt, có người rành tiếng Việt duyệt.

### Giai đoạn C — Nâng cấp nhỏ khác (tùy chọn)
- [ ] C1. Test cho `analyzeFilm` bằng phản hồi giả (hiện chưa có test).
- [ ] C2. Nới `untranslated` (`src/lib/sub/text.ts`) để câu lặp như «okay okay» không bị đánh dấu chưa dịch oan; thêm test.
- [ ] C3. Ô «Yêu cầu thêm cho bản dịch» nối vào cuối prompt dịch (giọng văn, mức trang trọng), giới hạn độ dài.
- [ ] C4. Thử so sánh có đo lường trên phim mẫu: có/không bước phân tích phim, có/không bước thay thuật ngữ bằng ký hiệu giữ chỗ (`protectTerms`); so lỗi và chi phí. Cần phim mẫu và key của Chủ.

## Việc đã xong trước file này (nhánh work)
- Rà nhận diện và dịch: sửa chữ thiếu dấu câu lỗi nạp tiền (`pay-store.ts`); các mục 10, 11, 12 trong `BAO_CAO_KIEM_TRA.md` đã rà (10 và 12 đã xử lý, 11 giữ có chủ ý).
- Mục 9: Chủ xác nhận tay được đơn đã hết hạn (`pay-flow.ts`, `pay-confirm.ts`, `pay-settings.tsx`, test mới).

## Chưa kiểm chứng
- Chưa chạy nhận dạng hay dịch thật bằng key; chất lượng dịch và hiệu quả của các bước ngữ cảnh/thuật ngữ chưa đo.
- Chưa thử trên điện thoại thật, chưa thử với tiền về thật.

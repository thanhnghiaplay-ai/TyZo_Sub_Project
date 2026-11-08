# HANDOFF — TyZo_Sub_Project, bản 2.19.1 (08/11/2026 19:13 giờ VN)

Gốc: v2.19.0. Bản này ghi các lỗi còn mở rồi sửa.

## ĐÃ LÀM Ở 2.19.1
X1 giữ video khi sang Tài khoản. X2 ghi `gnarr_v` ngay lần đầu, không ép bật thuyết minh nếu người dùng đã tắt. X3 cửa trả theo lượt chỉ hiện sau khi tải xong; cửa đóng thì tắt trả theo lượt. X4 rời trang thì dừng giọng và trả âm lượng. X5 mũi tên trên tab, nút hoặc hộp thoại không tua video. X6 nút xuất đã hỏi máy chủ từ trước; không giấu phụ đề đang xem. X7 gỡ listener âm lượng và tốc độ. X8 xuất CSV hủy link sau 1 giây. X9 hiện câu lỗi khi gửi yêu cầu. X10 không gọi `screen.orientation` khi không có. X11 làm tròn trước khi tách phút. D1 ngày chi phí và cột nạp theo giờ Việt Nam. D2 câu tìm nói rõ từ khóa hoặc toàn bộ. D3 câu đổi mật khẩu đúng việc phòng chưa gửi thư. D4 đã xong từ 2.18.0, không làm lại. D5 mỗi lần chạy truyền đúng phiếu, lời đọc chỉ bám phiếu của lần đó. S2 migration khóa `pg_advisory_lock`. S4 đã trim từ 2.19.0. S5 CLI so đường thật, không thoát 0 khi gọi qua symlink. S6 từ chối đường ghi nếu symlink nằm trong `public`, và link cài đặt không nhận `//`. S7 trang không chữ và không canvas thì smoke thoát 1. S8 file migration có BEGIN/COMMIT/ROLLBACK thì dừng. T5 thêm trần 20 lần/giờ theo IP khi có `x-forwarded-for` hoặc `x-real-ip`. Không thêm captcha. T14 đã chạy một cửa sổ Silero bằng wasm: đầu vào `x`, `h`, `c`, đầu ra `prob`, `new_h`, `new_c`. Chưa bấm nút lọc trên điện thoại.

## KHÔNG LÀM — đã chốt 2026-11-08 19:21, không mở lại trừ khi user yêu cầu đúng việc
- **T6, khóa lượt thử theo máy thật.** Không làm. Mã máy do trình duyệt tự sinh. Xóa dữ liệu trang hoặc mở ẩn danh là có một máy mới. Bịa fingerprint, cookie hay captcha không khóa được máy thật và dễ chặn nhầm người dùng thật. Khóa được chỉ khi thư đã xác minh, và việc gửi thư chỉ bật khi phòng đã cấu hình nhà cung cấp thư.
- **S9, giải HE-AAC và đọc hết elst.** Không làm. Không viết bộ giải mã riêng trong trang. Hiện chỉ bù mục `elst` đầu, bản 0. AAC-LC vẫn đọc được. HE-AAC để trình duyệt giải, vì tự giải dễ lệch thời gian hơn.
- **Captcha cho yêu cầu công khai.** Không thêm. Đã có trần theo email, trần chung, và trần theo IP khi máy chủ thấy địa chỉ. Captcha giả không chặn được.

## Kiểm tra
`npx tsc --noEmit` sạch. Test smoke, brand, preview, write-atomic, studio-layout, tiền và dịch: 190 pass, 0 fail.

## CHƯA LÀM HẾT
T6, S9 và captcha đã chốt ở mục «KHÔNG LÀM» phía trên. Không ghi lại thành việc còn mở.
- **T14**: tên tensor đã đối chiếu bằng wasm (`x`, `h`, `c` vào; `prob`, `new_h`, `new_c` ra). Chưa bấm nút lọc tiếng người trên điện thoại thật.
- **S6**: đã xóa `src/lib/multiplayer` vì không file nào nhập. Nếu bản sau cần phòng P2P thì phải đưa lại từ khung mẫu.

## ĐÃ LÀM Ở 2.19.0
C5 ghi email người thao tác khi mở gói, đặt số dư, hoàn ví, nhả giữ, từ chối nạp. T1–T4, T7–T13, T15 (T15 đã có từ trước), S1–S5, S7, S8, S10–S12. T2 cảnh báo khi không thấy đoạn có tiếng. Migration: `VERCEL_ENV` khác `production` thì thoát 0; production thiếu `DATABASE_URL` thì thoát 1; URL được trim.

## Kiểm tra
`npx tsc --noEmit` sạch. Test tiền, dịch, từ điển, khoảng trống, điều khoản trong lượt này pass sau khi bỏ test Orpheus vì Node không phân giải alias `@/`.


## Khôi phục khi bị ngắt phiên
Giải nén, `npm install`, rồi `npm run typecheck && npm test`. Mọi thay đổi nằm trong thư mục này. Đọc mục "Đã làm" để biết file nào đổi.
Cần đặt ở môi trường khi triển khai: `ADMIN_EMAIL` (Chủ đầu tiên), `MAIL_FROM` cùng khóa nhà cung cấp thư (xem `src/lib/auth/mailer.ts`). Không đặt thì chưa bật xác minh email.

## Kết quả kiểm tra (cuối bản này)
Xem mục "Kết quả thật" ở cuối file.

## ĐÃ LÀM
| Mục | Làm thế nào | File chính |
|---|---|---|
| Test fail có sẵn (2) | entry-gate đọc dạng số phiên bản thay vì ghim số; studio-layout chỉ kiểm quy tắc CSS của khung video | `src/components/entry-gate.test.ts`, `studio-layout.test.ts` |
| N1 | Xóa `creditTrial` (ai đăng nhập cũng tự cộng tiền được). Không còn nơi dùng | `src/lib/room-account.ts` |
| N5 | `requireOpenAccount()` trả 403 khi status khác `open`; dùng ở createPayOrder, buyRoomPlan, spendTrial, claimTrialDevice, synthesizeEdge, room-groq | `src/lib/guard.ts`, `guard.server.ts`, test `guard.test.ts` |
| N4 | `synthesizeEdge` có authMiddleware + 120 lần/phút/tài khoản (bảng `rate_hits`, migration 0013) | `src/lib/sub/edge-speech.ts` |
| N2 | Cổng Groq trả theo lượt: same-site, đăng nhập, status open, 240 yêu cầu/phút, trần body, model phải nằm trong `run_models`, lỗi JSON, chuyển tiếp retry-after. Tiền: giữ nguyên tử bằng UPDATE có điều kiện `balance >= số giữ`, trừ số thực theo giá Groq cộng chênh, nhả phần thừa, Groq lỗi không tính tiền, phiếu quá 6 giờ tự nhả | `src/routes/api/room-groq.ts`, `run-bill.ts`, `run-gate.ts`, `run-ticket.ts`, `run-turn.ts`, `run-board.server.ts`, `sub/room-ticket.ts` |
| N3 + C4 | Chủ nằm trong `room_staff`, chỉ tính khi `emailVerified`; bỏ email ghi cứng và `.grok/admin.json`; gửi thư xác minh qua HTTP (Resend, SendGrid, Brevo, Mailgun, Postmark, webhook) | `src/lib/auth/server.ts`, `admin-allow.server.ts`, `auth/mailer.ts` |
| C5 (một phần) | Chỉ Chủ xác nhận tay đơn nạp; ghi người xác nhận vào sổ và nhật ký; tối đa 3 đơn chờ mỗi khách; giới hạn tần suất báo đã chuyển | `src/lib/pay-store.ts`, `pay-confirm.ts` |
| Hồi quy tự gây (2) | Tài khoản khóa vẫn xem ví; Quản lý không thấy nút xác nhận tay | `account-panel.tsx`, `pay-settings.tsx`, `admin-desk.tsx` |
| Test luồng nối nhiều phần | Webhook nạp → mua gói → trả theo lượt → hoàn tiền, kèm test đồng thời | `src/lib/money-flow.test.ts`, `pay-flow.ts` |
| Điều khoản | `TERMS_VERSION = 2026-11-08.1`, thêm đoạn trả theo lượt và sửa câu "phòng không thu tiền sử dụng" | `src/components/entry-gate.tsx` |

## CHƯA LÀM
- Nhóm 2 và C5 đã xong ở 2.18.0–2.19.0. Nhóm 3 và 4 đã làm ở 2.19.0, trừ T6 và phần chạy thử T14 (xem đầu file).
- Chạy thử `npm run dev` với trình duyệt thật: xem mục cuối
- Chưa thử gọi Groq thật, chưa thử gửi thư thật, chưa thử Postgres thật nhiều kết nối

## LỖI MỚI PHÁT HIỆN (đã xử lý ở 2.19.1, trừ T6 và S9 ghi ở đầu file)
Định dạng cũ giữ lại để đối chiếu. Không làm lại các mục X và D.

### Đã đối chiếu với mã
- **S1, Nghiêm trọng**, `scripts/migrate.mjs`: đã xử lý ở v2.19.0 cùng T11. Preview (`VERCEL_ENV` khác production) không migrate. Production thiếu `DATABASE_URL` thì thoát 1.
- **S3, Cao**, `scripts/migrate.mjs`: đã xử lý ở v2.19.0. Local không có `DATABASE_URL` vẫn thoát 0.
- **X1, Cao**, `src/components/studio.tsx:583`: chuyển sang tab "Tài khoản" gỡ `<video>` khỏi DOM; quay lại thì video trống vì `video.src` chỉ gán một lần (`use-pipeline.ts:1253`). Đề xuất: luôn mount Stage và ẩn bằng CSS.
- **X8, Nhỏ**, `studio.tsx:263`: `revokeObjectURL` ngay sau `click()` có thể hủy tải ở Safari/Firefox. Đề xuất: `setTimeout(..., 1000)`.
- **X11, Nhỏ**, `studio.tsx:52`: 59,96 giây hiện "0:60.0". Đề xuất: làm tròn trước khi tách.
- **D1, Nhỏ**, `src/components/admin-company.tsx` (MoneyBoard, `day` mặc định): dùng `toISOString()` là giờ UTC, từ 00:00 đến 07:00 giờ VN ghi chi phí vào ngày hôm trước. Đề xuất: dùng ngày theo múi giờ VN.
- **D2, Nhỏ**, `src/components/admin-desk.tsx` cuối file: `foundNotice` có hai nhánh giống nhau (mã chết).
- **D3, Nhỏ**, `account-panel.tsx`: dòng "Quên mật khẩu chưa gửi được thư." đã lỗi thời nếu bật mailer.
- **D4, Trung bình**, `run-desk-board.tsx` + `admin-room.ts getRunDesk`: key Groq phòng trả nguyên văn về trình duyệt của Chủ (đúng là C7).
- **D5, Nhỏ**, `use-pipeline.ts`: biến phiếu `current` dùng chung toàn trình duyệt, hai tác vụ cùng lúc có thể dùng nhầm phiếu của nhau.

### Agent báo, chưa tự kiểm
- **X2, Trung bình**, `studio.tsx:339,346`: lần mở đầu tiên không ghi `gnarr_v`, lần sau migrate ép bật lại thuyết minh và `lead=0`.
- **X3, Trung bình**, `studio.tsx:742-747`: bấm "Trả theo lượt" khi cửa chưa tải xong, rồi cửa là đóng thì `payByRoom` vẫn true và key riêng bị bỏ qua.
- **X4, Trung bình**, `studio.tsx:385`: `createNarrator()` không dọn khi rời trang, giọng đọc vẫn phát và âm lượng video có thể kẹt 0,16.
- **X5, Trung bình**, `studio.tsx:1652`: phím mũi tên vừa đổi tab vừa tua video; modal đang mở vẫn tua.
- **X6, Trung bình (chưa chắc)**, `studio.tsx:618`: chặn xuất file chỉ ở trình duyệt, bản dịch đã nằm sẵn trong bộ nhớ nên người dùng thử vẫn sao chép được.
- **X7, X9, X10, Nhỏ**: listener `volumechange`/`ratechange` không gỡ; báo lỗi yêu cầu nuốt thông báo cụ thể; `screen.orientation` có thể undefined trên iOS cũ.
- **S2, Cao**: `migrate.mjs` không có khóa chống hai build chạy cùng lúc.
- **S4, Trung bình**: `migrate.mjs` không `trim()` `DATABASE_URL` như `db.ts`.
- **S5, Trung bình**: `write-atomic.mjs`, `preview.mjs`, `brand-check.mjs` so sánh main-module không qua `realpath`, có thể thoát 0 mà không làm gì khi đường dẫn có symlink.
- **S6, S7, S8, S9, Nhỏ đến Trung bình, đều chưa chắc**: kiểm tra đường dẫn ghi không resolve symlink; smoke exit 0 khi trang trắng; migration chứa COMMIT làm hỏng tính nguyên tử; `//evil.com` ở trang cài đặt PWA.

## Lỗi có sẵn trước khi sửa (đã ghi ở lượt đầu)
Lint 7 lỗi, 14 cảnh báo (`studio.tsx` 3 lỗi `no-unused-expressions`, `use-pipeline.ts` 2 `prefer-const`, `client.server.ts` `no-empty`, `cast-voice.ts` `no-useless-escape`). 8 test trong `scripts/` fail do thiếu `.grok/` (môi trường).

## Kết quả thật (bản 2.17.1)
- typecheck: sạch
- lint: 7 lỗi, 14 cảnh báo (như gốc, không thêm)
- build: được
- test `src/`: 242 pass, 0 fail, 1 todo (C2 tái hiện race hoàn tiền)
- test `scripts/`: 189 pass, 8 fail (thiếu `.grok/`, lỗi môi trường đã biết)

## Chạy thử `npm run dev` (08/11/2026, PGLite trong bộ nhớ, trình duyệt headless)
**Chạy được và thấy đúng:**
- Trang điều khoản hiện bản `2026-11-08.1`; nút Đồng ý chỉ mở sau khi tick "Tôi đã đọc".
- Đăng ký email + mật khẩu: tạo tài khoản, vào thẳng phòng với "Dùng thử: còn 1 tệp, tối đa 10 phút".
- Đăng nhập sai mật khẩu: 401 "Invalid email or password"; đúng mật khẩu: vào phòng.
- `/api/room-groq`: chưa đăng nhập trả 401 JSON `{error:{message}}`; khác nguồn hoặc thiếu phiếu trả 400 JSON.
- Tab Tài khoản: hiện số dư 0 đ, bảng gói (9.000 / 63.000 / 99.000... theo `ROOM_PLANS`), mua gói khi 0 đ báo "Số dư chưa đủ."; nạp tiền báo "đang bảo trì" vì chưa cấu hình Sepay/Casso.

**Không chạy thử được (lý do):**
- Dùng thử một tệp, xuất file Vietsub, bật VAD, thuyết minh: cần key Groq thật, video thật và mạng ra ngoài; sandbox chỉ cho npm/GitHub. Cần anh tự thử trên máy hoặc Vercel.
- Nạp tiền qua webhook thật, trang Admin, Chủ: cần cấu hình cổng nạp và một tài khoản Chủ đã xác minh email (chưa có nhà cung cấp thư); đã thay bằng test tự động (`money-flow.test.ts`, `pay-confirm.test.ts`).
- Gửi thư xác minh thật: chưa có khóa nhà cung cấp.
- Postgres thật nhiều kết nối: dùng PGLite.

**Quan sát nhỏ trong lúc chạy thử:**
- Thông báo đăng nhập sai bằng tiếng Anh ("Invalid email or password"), nên Việt hóa.
- Form đăng nhập gửi được trước khi trang tải xong JS (dev), khi đó chỉ tải lại `/login?`, không rò mật khẩu vì ô nhập không có thuộc tính `name`.
- Google Fonts và `grok.com/.../extensions.js` bị chặn do mạng sandbox, không phải lỗi mã.

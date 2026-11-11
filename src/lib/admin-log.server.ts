export type AdminNote = {
  version: string;
  time: string;
  area: "tien" | "quyen" | "ha-tang" | "du-lieu" | "khac";
  text: string;
};

/** Nhật ký nội bộ. Không import từ giao diện khách. */
export const ADMIN_LOG: AdminNote[] = [
  {
    version: "3.16.1",
    time: "04:25 ngày 12/11/2026",
    area: "tien",
    text: "Vá lỗ phiếu v3.16.0. run_tickets.scope (migration 0020, mặc định full). openRunTicket ghi scope lúc giữ tiền. chargeWith đọc ticketKind và từ chối /audio/transcriptions trên phiếu translate trước khi gọi Groq, nên phòng không trả nhà cung cấp rồi chỉ thu được phần giữ. Chat trên phiếu đó vẫn trừ như cũ. Điều khoản không đổi vì lời hứa 2026-11-12.2 đã nói dịch lại không tính nhận dạng.",
  },
  {
    version: "3.16.0",
    time: "03:48 ngày 12/11/2026",
    area: "tien",
    text: "Làm trên nền v3.15.0. Gỡ nút Làm lại khỏi thanh xem; nhận dạng lại từ đầu nằm trong Nâng cao và vẫn hỏi. Đổi file, âm thanh, link hoặc ngôn ngữ nguồn khi đang có phụ đề phải xác nhận, chưa đồng ý thì không đổi ô. Nút chạy khi đã xong thì ẩn. Dịch lại giữ câu sửa tay, không xóa câu cũ trước khi câu mới về, phiếu cửa trả theo lượt dùng scope translate (không cộng nhận dạng, không giữ thuyết minh). Điều khoản 2026-11-12.2. Phụ đề, tên file, kích thước và chỗ phát lưu trên máy khách (IndexedDB), không lưu video.",
  },
  {
    version: "3.15.0",
    time: "02:44 ngày 12/11/2026",
    area: "khac",
    text: "Làm trên nền v3.14.0. Chỉ xếp lại phòng dịch, không đổi đường nhận dạng, dịch, hai cửa tiền hay điều khoản. Thẻ Bắt đầu gộp key và phim; model, luồng, lọc tiếng nằm trong Nâng cao đóng sẵn. Nút chạy và trạng thái xuống dưới khung video. Khi đã có câu và không đang chạy, ẩn tab chuẩn bị (is-watch), xuất file sang cạnh danh sách câu. Player thêm tua ±10 giây, công tắc thuyết minh và nút Aa. Gợi ý cử chỉ chỉ hiện đến khi bấm Đã hiểu.",
  },
  {
    version: "3.11.0",
    time: "09:40 ngày 11/11/2026",
    area: "khac",
    text: "Làm trên nền v3.10.11, theo yêu cầu người dùng. Thêm nút «Lưu bản Whisper» cạnh «Xuất file Vietsub». Seg có thêm trường raw (chữ Whisper sau khi cắt lặp, trước applyNameFixes của bước phân tích phim; applyNameFixes sửa original nên không dùng original được). raw ghi ở acceptSegment, lúc nối câu dài hơn, và keepRejectedCue. Bản lưu cũ không có raw thì dùng original. Xuất qua toRawSrt, tên file .whisper.srt. Dùng chung cửa với xuất Vietsub (exportAllowed): dùng thử vẫn không xuất. Không đổi điều khoản. Test: raw-srt.test.ts.",
  },
  {
    version: "3.10.11",
    time: "09:15 ngày 11/11/2026",
    area: "khac",
    text: "Làm trên nền v3.10.10. Lỗi: nút Quản lý và /admin mất sau khi dịch, phải tải lại. Nguyên nhân: getMyPlace chỉ gọi một lần khi mở trang, lỗi tạm thì studio.tsx gán place=null và không đọc lại; admin-desk.tsx cũng chỉ thử một lần. Sửa: thêm src/lib/retry-load.ts (thử lại 1,5 s và 4 s, có test); studio.tsx đọc lại khi quay lại tab và khi dịch xong, lỗi thì giữ quyền cũ; admin-desk.tsx dùng retryLoad. Chưa tái hiện trên Vercel vì không có log máy chủ.",
  },
  {
    version: "3.10.7",
    time: "03:28 ngày 11/11/2026",
    area: "khac",
    text: "Làm trên nền v3.10.6. Chỉ giao diện, không đổi logic. Sửa theo ảnh chụp 10/11 lúc 18:23: (1) styles.css: luật label > input {width:100%} kéo giãn ô tick và làm teo ô màu ở tab Thư; nay loại checkbox, radio, color, range, ô tick 1,15rem, ô màu 2,5rem. (2) Thêm .admin-flow: khối một thẻ tự chia cột theo khối con (Sơ đồ, Doanh thu, Thuật ngữ, Cộng tác); Nhật ký xếp lưới .plan-grid. (3) Thẻ Trả theo lượt bỏ .admin-trio: Bảo trì và Phiếu gần đây chung một cột, Giá biểu một cột, hết khoảng trống; bỏ vùng cuộn lồng trong danh sách model. (4) .stat-grid dùng flex, ô cuối giãn đầy hàng. (5) Thuật ngữ: nút Lọc nằm cạnh ô lọc, có viền như nút khác. (6) mail-desk: tiêu đề hướng dẫn Gmail đổi text-ink thành text-fg (chữ tối trên nền tối), placeholder SMTP rút ngắn cho khỏi bị cắt. (7) studio: câu «Chọn video để phát ở đây» nằm dưới nút phát. Đã kiểm: dựng CSS cũ và mới trong Chromium, ô tick từ 245px còn 18px, ô màu từ 12px lên 40px, khối chia hai cột đúng; cú pháp 7 file TSX; app-version.test và studio-layout.test pass. Chưa chạy tsc và npm test đủ vì gói không có node_modules (9 test cần pglite, jose, nodemailer, react-start, bản gốc cũng lỗi y vậy). Chưa xem trên Vercel thật. Chưa làm: trang Tài khoản vẫn chia hai cột có thể lệch chiều cao cuối cột; nút Lưu trên thẻ Chủ ở Sơ đồ nhạt viền, chưa rõ nguyên nhân.",
  },
  {
    version: "3.10.6",
    time: "18:10 ngày 10/11/2026",
    area: "khac",
    text: "Làm trên nền v3.10.5. Giao diện: .admin-grid và .account-grid dùng cột kiểu gạch (column-width 22rem), .room-wide 120rem, thêm .admin-split, .admin-detail, .admin-pane, .admin-trio, .admin-stats, .plan-grid, .affiliate-list. Khối Trả theo lượt thành 3 ô, thẻ quyền xuống dưới khối Tài khoản. Không đổi logic. Kiểm bằng dữ liệu giả ở 390, 820, 1280, 1920 px. Thư: thư xác minh và đặt lại không tới dù Gửi thư thử chạy; nguyên nhân khả dĩ là sendAuthLetter chạy nền nên trên Vercel hàm bị đóng băng trước khi SMTP xong. Nay route /api/auth/$ gọi flushAuthLetters (tối đa 8 giây) trước khi trả lời, chờ đọc công tắc thư tối đa 4 giây. Chưa thử trên Vercel thật. Nếu vẫn không có thư, xem nhật ký hàm dòng [auth] gửi thư lỗi.",
  },
  {
    version: "3.10.5",
    time: "17:10 ngày 10/11/2026",
    area: "khac",
    text: "Sửa lỗi do v3.10.3: .studio-video bị đặt max-height nên khi mở bảng cài đặt phụ đề, video bị bóp còn khoảng 95px. Nay khung video co được và tự cuộn, phần tử con trong .player-stack không co. Còn lỗi treo ở thẻ nạp, hạn gói và trang admin trên bản Vercel chưa tìm ra nguyên nhân, cần nhật ký hàm của Vercel.",
  },
  {
    version: "3.10.4",
    time: "16:40 ngày 10/11/2026",
    area: "ha-tang",
    text: "Thêm nhà gửi thư «smtp» (email cá nhân) cạnh Resend, Brevo, SendGrid, Mailgun, Postmark. Dùng thư viện nodemailer, nạp động trong src/lib/auth/smtp.server.ts, chạy trên Node của Vercel. Gmail và Yahoo tự nhận máy chủ theo đuôi email, đuôi khác nhập smtp.host:cổng vào ô máy chủ (lưu ở trường domain). Mật khẩu ứng dụng lưu trong room_settings.mail_desk như khóa API khác, bỏ khoảng trắng khi lưu, không trả ra màn hình. Thứ tự ưu tiên: các nhà HTTP trước, SMTP sau, webhook cuối. Gmail giới hạn khoảng 500 thư mỗi ngày. Chưa thử gửi thật tới Gmail.",
  },
  {
    version: "3.10.3",
    time: "12:00 ngày 10/11/2026",
    area: "khac",
    text: "Viết lại khung phòng chiếu trong styles.css thành ba chế độ loại trừ nhau (TALL, SHEET_PORTRAIT, SHEET_LANDSCAPE), mọi mức tối thiểu cộng vào min-height của khung và khung cuộn được. Điều kiện tấm trượt dùng chung với mã qua src/lib/studio-layout.ts. Thêm scripts/studio-layout-matrix.mjs (npm run check:layout) đo 20 cỡ màn hình. Tách PAY_MINUTES sang pay-minutes.ts và sameSecret sang pay-secret.server.ts để node:crypto không vào gói trình duyệt (trang chủ bản dev báo Something went wrong). Sửa stripInstallParams chặn đường dẫn //host. Sửa 7 test lỗi: 3 test thiếu .grok/app-env.json nay bỏ qua trên kho sạch, test migration và 2 test studio-layout viết lại cho đúng thực tế.",
  },
  {
    version: "3.10.2",
    time: "07:56 ngày 10/11/2026",
    area: "khac",
    text: "Bỏ bản v3.10.1 vì làm lệch thêm. Lấy lại mã v3.10.0 rồi làm lại: nút Nạp tiền cùng hàng, dòng chờ một hàng, hết giờ hoặc từ chối thì mờ nội dung và hiện xin lỗi. Không tự bật lại thẻ sau khi khách đóng.",
  },
  {
    version: "3.10.1",
    time: "07:45 ngày 10/11/2026",
    area: "khac",
    text: "Nút Nạp tiền cùng hàng, cùng cỡ với hai nút kia. Dòng chờ không xuống hàng. Hết 15 phút hoặc nhân viên từ chối thì mờ nội dung, hiện xin lỗi, rồi đóng thẻ.",
  },
  {
    version: "3.10.0",
    time: "07:15 ngày 10/11/2026",
    area: "khac",
    text: "Thẻ nạp tách khỏi hàng nút để khỏi tràn ngang trên điện thoại. Khách hủy đơn thì trạng thái void, khác từ chối của nhân viên. Khi cộng tiền, nội dung mờ rồi hiện logo và xin cảm ơn.",
  },
  {
    version: "3.9.0",
    time: "07:00 ngày 10/11/2026",
    area: "khac",
    text: "Thẻ nạp chuyển khoản: sao chép, đếm 15 phút, tự hỏi trạng thái mỗi 5 giây. Quá 15 phút webhook không cộng và đơn thành hết hạn. Đã từ chối vẫn là hủy của nhân viên.",
  },
  {
    version: "3.8.0",
    time: "02:44 ngày 10/11/2026",
    area: "khac",
    text: "Bốn lối dịch thay danh sách model. resolveVoiceLane không nhảy sang lối khác. Câu ngắn ở profile cân bằng không còn ưu tiên model 20B. Auto đã lưu được đưa về một model cho cả phim.",
  },
  {
    version: "3.7.1",
    time: "21:39 ngày 09/11/2026",
    area: "khac",
    text: "Tab Thư: hai ô số xếp dọc, không tràn khung. Xem trước thư ghim phía trên khi kéo form.",
  },
  {
    version: "3.7.0",
    time: "21:10 ngày 09/11/2026",
    area: "khac",
    text: "Làm lại từ v3.5.0. Bản 3.6 đã bỏ vì đăng nhập treo. Công tắc thư mặc định tắt. Đọc mail_policy bằng kết nối riêng tối đa 1,5 giây, không lấy khóa migration. Gửi thư chạy nền, trần gửi nằm trong bộ nhớ.",
  },
  {
    version: "3.5.0",
    time: "20:11 ngày 09/11/2026",
    area: "khac",
    text: "Tab Thư chỉ Chủ. Khóa nằm ở room_settings mail_desk, không trả ra màn hình. Gửi thử dùng khóa đã lưu, không có thì dùng biến môi trường. Chưa bật xác minh email hay quên mật khẩu.",
  },
  {
    version: "3.4.2",
    time: "18:41 ngày 09/11/2026",
    area: "tien",
    text: "Gỡ cổng /api/pay/rieng, pay-own và ô khóa trên tab Doanh thu. Sepay và Casso giữ nguyên. Điều khoản 2026-11-09.4.",
  },
  {
    version: "3.4.1",
    time: "14:42 ngày 09/11/2026",
    area: "quyen",
    text: "Mười kiểu thẻ chuyển sang hàng ngang trong ô. Ruy băng, con dấu, góc gấp, thanh dọc không còn xoay hoặc chiếm cả cạnh. Ô xem thử hiện Chủ và Cộng tác.",
  },
  {
    version: "3.4.0",
    time: "14:34 ngày 09/11/2026",
    area: "quyen",
    text: "Thẻ trên ô tài khoản xếp ngang theo thứ tự Chủ, Quản lý, Hỗ trợ, Cộng tác. Một thẻ thì giữ chỗ cũ. Sơ đồ gộp Cộng tác vào thẻ nhân viên nếu cùng tài khoản, không hiện hai lần.",
  },
  {
    version: "3.3.0",
    time: "14:16 ngày 09/11/2026",
    area: "tien",
    text: "room_costs hiện tối đa 80 dòng trong khoảng đang xem. Chủ sửa hoặc xóa từng dòng. Dùng lại chỉ chép tên và số tiền sang khoản mới.",
  },
  {
    version: "3.2.1",
    time: "14:13 ngày 09/11/2026",
    area: "tien",
    text: "Ô Doanh thu bỏ lọc note Nạp thủ công. Dòng chi tiết đổi thành Tiền nạp đã xác nhận. Lời lỗ vẫn không cộng tiền nạp.",
  },
  {
    version: "3.2.0",
    time: "13:55 ngày 09/11/2026",
    area: "quyen",
    text: "Đếm affiliates riêng, lỗi bảng không làm mất số Phòng. Sơ đồ thêm OrgPartner. Thẻ Cộng tác dùng cùng role-mark, nhãn ngắn Cộng tác cho vừa dải. Không chỉnh lại khung Admin cho mọi máy.",
  },
  {
    version: "3.1.4",
    time: "13:33 ngày 09/11/2026",
    area: "khac",
    text: "Đã bỏ v3.1.2 và v3.1.3 vì làm lệch bố cục. work về fed2419 rồi sửa nhẹ: nút căn giữa, ô mã đăng ký, nhãn tỷ lệ không đè ô nhập, tab Admin cuộn ngang. Không đụng TopUp.",
  },
  {
    version: "3.1.1",
    time: "13:10 ngày 09/11/2026",
    area: "ha-tang",
    text: "Preview cũng chạy migration vì dùng chung Neon. Neon áp file SQL còn thiếu lúc mở kết nối, không chỉ lúc build production.",
  },
  {
    version: "3.1.0",
    time: "12:40 ngày 09/11/2026",
    area: "tien",
    text: "POST /api/pay/rieng khớp đúng mã và đúng số tiền. Khóa nằm ở room_settings pay_own_secret. Lời lỗ trừ commission_events. Thuật ngữ nhập xuất JSON. Gieo thuật ngữ khi mở kết nối cơ sở dữ liệu.",
  },
  {
    version: "3.0.0",
    time: "12:28 ngày 09/11/2026",
    area: "tien",
    text: "run_tickets.base_cost lưu giá vốn Groq. Lời lỗ = gói + lượt − giá vốn − chi phí ghi tay. Cộng tác viên: tỷ lệ Chủ sửa, cả đời khi windowDays = 0, trần 50% lãi lượt, chờ 14 ngày, rút tối thiểu 200.000. Cổng nạp riêng chưa làm.",
  },
  {
    version: "2.23.0",
    time: "12:19 ngày 09/11/2026",
    area: "du-lieu",
    text: "Danh sách thuật ngữ phân trang 50. Ẩn hoặc mở mọi bộ. Khôi phục từ thiếu không ghi đè từ đã sửa. Lỗi tải không còn bị nuốt thành bộ trống.",
  },
  {
    version: "2.22.0",
    time: "11:46 ngày 09/11/2026",
    area: "du-lieu",
    text: "Thuật ngữ chuyển vào database. Chỉ Chủ thêm, xóa, ẩn. Khách gửi bản sao thì vào hàng chờ, chưa áp cho người khác. Điều khoản 2026-11-09.1.",
  },
  {
    version: "2.21.0",
    time: "09:33 ngày 09/11/2026",
    area: "khac",
    text: "Nhật ký khách tách khỏi nhật ký nội bộ. Thanh chỉnh chỉ đổi khi kéo núm. Độ trễ đọc có thể âm để đọc trước.",
  },
  {
    version: "2.20.0",
    time: "06:40 ngày 09/11/2026",
    area: "quyen",
    text: "Giá biểu, doanh thu và mở gói chỉ Chủ thấy. Yêu cầu quá hạn tự chuyển cấp: Hỗ trợ 30 phút, Quản lý 90 phút, rồi tới Chủ. Máy chủ đặt ở Singapore.",
  },
  {
    version: "2.19.2",
    time: "20:28 ngày 08/11/2026",
    area: "quyen",
    text: "Tài khoản Chủ vào lại được trang quản trị khi phòng chưa cấu hình gửi thư.",
  },
  {
    version: "2.19.1",
    time: "19:13 ngày 08/11/2026",
    area: "tien",
    text: "Ngày ghi chi phí và cột doanh thu theo giờ Việt Nam. Cửa trả theo lượt chỉ bật sau khi cửa đã mở. Yêu cầu công khai thêm trần theo địa chỉ mạng khi máy chủ thấy địa chỉ.",
  },
  {
    version: "2.19.0",
    time: "18:52 ngày 08/11/2026",
    area: "ha-tang",
    text: "Bản dựng thử không chạy migration lên database thật. Bản chính thiếu địa chỉ database thì dừng. Điều khoản 2026-11-08.3.",
  },
  {
    version: "2.18.0",
    time: "18:15 ngày 08/11/2026",
    area: "quyen",
    text: "Key phòng không hiện lại trên trang quản trị, chỉ còn 4 ký tự cuối. Điều khoản 2026-11-08.2.",
  },
  {
    version: "2.17.0",
    time: "08:16 ngày 08/11/2026",
    area: "quyen",
    text: "Quyền Chủ nằm trong cơ sở dữ liệu và chỉ tính khi email đã xác minh. Chỉ Chủ được xác nhận tay đơn nạp. Điều khoản 2026-11-08.1.",
  },
  {
    version: "2.16.1",
    time: "01:35 ngày 08/11/2026",
    area: "quyen",
    text: "Đã gỡ chức năng cộng tiền thử mà ai đăng nhập cũng gọi được.",
  },
  {
    version: "2.9.0",
    time: "22:22 ngày 06/11/2026",
    area: "quyen",
    text: "Trang quản trị có ô nhập key để đồng bộ model. Key không gửi lên máy chủ.",
  },
  {
    version: "2.0.0",
    time: "23:18 ngày 05/11/2026",
    area: "quyen",
    text: "Bốn cấp: Người dùng, Hỗ trợ, Quản lý và Chủ. Có sơ đồ cấp và trang doanh thu.",
  },
];

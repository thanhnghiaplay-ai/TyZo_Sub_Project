# Lịch sử cập nhật cũ (CHANGELOG cho khách)

Các mục sau được chuyển nguyên văn từ `src/lib/app-version.ts`. Các bản gần đây nằm trong ứng dụng, mục «Có gì mới» hiển thị 8 bản.

## 5.37.1 · 12:35 22/11/2026

Hướng dẫn ứng dụng Android; mã liên kết đếm từng giây.

- Trang Hướng dẫn có mục Ứng dụng Android: cài, liên kết, cho phép hiện phụ đề, dùng và gỡ máy.
- Mã liên kết đếm ngược từng giây; app nối xong thì trang báo tên máy vừa liên kết.
- Ứng dụng bản 0.3 có các bước dùng ngay trên màn hình và nút mở hướng dẫn trên web.

## 5.37.0 · 12:06 22/11/2026

Ứng dụng Android: phụ đề dịch nổi trên video ở Bilibili, YouTube, TikTok.

- Trang Tài khoản có mục Ứng dụng Android: lấy mã liên kết, xem và gỡ máy đã liên kết.
- Nghe tiếng video đang phát rồi hiện phụ đề nổi, trừ Token dịch như Dịch trực tiếp.
- Điều khoản ghi thêm phần ứng dụng Android; bạn đồng ý lại một lần.

## 5.36.0 · 11:08 22/11/2026

Dịch trực tiếp: phụ đề nổi trên video, chữ lớn, giữ đúng tên nhân vật.

- Phụ đề nổi: khung chữ dịch luôn nằm trên video ở tab khác (Chrome, Edge máy tính).
- Chữ lớn toàn màn hình cho điện thoại, có nút Bắt đầu, Dừng; chỉnh cỡ chữ, số dòng, chữ gốc.
- Ô Từ cần giữ đúng cho tên nhân vật, thuật ngữ. Tải lại trang vẫn tải được phụ đề phiên trước.
- Điều khoản ghi thêm việc lưu chữ phiên trước trên máy; bạn đồng ý lại một lần.

## 5.35.2 · 09:59 22/11/2026

Lưu được key ElevenLabs có giới hạn quyền.

- Key ElevenLabs không có quyền đọc danh sách model vẫn lưu được, vì app không cần quyền đó.
- Key thiếu quyền khi nhận dạng hay đọc giọng thì báo đúng tên quyền cần bật.

## 5.35.1 · 08:31 22/11/2026

Thông báo lỗi gọn trên điện thoại; lỗi key rõ ràng hơn.

- Thông báo dài tự xuống dòng, không tràn ra ngoài màn hình, hiện lâu hơn để kịp đọc.
- Key sai báo bằng tiếng Việt theo từng nhà, kèm trang lấy key, không hiện mã lỗi thô.
- Key ElevenLabs dán thiếu hay thừa ký tự được báo ngay khi lưu.

## 5.35.0 · 05:53 22/11/2026

Thuyết minh bằng giọng ElevenLabs, đọc được tiếng Việt.

- Ở mục Thuyết minh, chọn ElevenLabs rồi chọn giọng nam hoặc nữ theo danh sách giọng của key.
- Trả theo lượt trừ Token dịch theo số chữ đọc. Thuê phòng dùng key ElevenLabs của bạn.
- Nhận dạng ElevenLabs xong thì bản nhận dạng được xóa ở ElevenLabs.

## 5.34.0 · 03:59 22/11/2026

Thêm nhà nhận dạng giọng ElevenLabs (Scribe v3, Scribe v2).

- Chọn ElevenLabs Scribe ở ô Nhận dạng giọng, dán link file https trực tiếp.
- Dùng được ở cả Thuê phòng (key ElevenLabs của bạn) và Trả theo lượt.
- Điều khoản mục Dữ liệu ghi ElevenLabs nhận lời thoại; bạn đồng ý lại một lần.

## 5.33.0 · 21:19 21/11/2026

Tải lại trang không mất phụ đề đã làm; điều khoản cập nhật.

- Chọn lại đúng tệp đã làm, app hỏi khôi phục: không phải nhận dạng lại, dịch nốt phần còn thiếu.
- Lưu trên máy bạn tối đa 5 tệp gần nhất; bấm Làm lại là xóa bản lưu của tệp đó.
- Điều khoản mục Dữ liệu ghi việc lưu này và đổi cách gọi người phụ trách web; bạn đồng ý lại một lần.

## 5.32.4 · 20:24 21/11/2026

Trả theo lượt: trang chủ cho thấy gói đang dùng và số Token dịch video này cần.

- Dưới dòng trả theo lượt có tên gói đang dùng và số Token dịch video này cần giữ.
- Bấm Đổi gói hoặc Chọn gói là mở đúng chỗ chọn gói.

## 5.32.3 · 20:21 21/11/2026

Bấm Tải và dịch mà chưa chạy được thì lý do hiện ngay dưới nút.

- Câu báo vì sao chưa chạy (key sai, thiếu gói…) hiện đỏ dưới nút chính, không biến mất vội.
- Đổi tệp, link hay cách trả thì câu báo cũ tự ẩn.

## 5.32.2 · 20:16 21/11/2026

Lần đầu vào bớt bị hỏi dồn dập.

- Hướng dẫn nhanh không tự bật lên; trang chủ có dòng mời Xem hoặc Ẩn.
- Mỗi lúc chỉ một câu hỏi: chọn cách trả, rồi câu hỏi lần đầu, rồi mới mời xem hướng dẫn.

## 5.32.1 · 20:11 21/11/2026

Lượt dịch đang chạy được giữ kỹ hơn trên điện thoại.

- Đang chạy có dòng nhắc giữ trang mở; màn hình được giữ sáng.
- Lỡ tay đóng hay tải lại trang lúc đang chạy, trình duyệt hỏi lại trước.
- Quay lại từ ứng dụng khác, app nhắc bấm Tiếp tục nếu tiến độ đứng yên.

## 5.32.0 · 19:44 21/11/2026

Trang quản lý tính đúng hơn chi phí dịch vụ của phòng.

- Chi phí mỗi lần dịch được ghi đúng lúc chạy, theo từng dịch vụ đã dùng.

## 5.31.3 · 19:07 21/11/2026

Tiến độ nhận dạng ghi đúng nhà đang làm.

- Lúc nhận dạng bằng AssemblyAI, Deepgram hay nhà khác không còn ghi nhầm «Alibaba đang nhận dạng».

## 5.31.2 · 18:53 21/11/2026

Ước tính Token dịch theo từng phần và không hiện sai lúc đang chạy.

- Ước tính ghi riêng phần nhận dạng và phần dịch, giữ lần lượt, xong phần nào trả phần thừa phần đó.
- Đang chạy thì không hiện «cần giữ, thiếu…» nữa; nhận dạng xong thì chỉ tính phần dịch.
- Phần dịch giữ dư hơn để không hụt giữa chừng; phần thừa vẫn trả lại khi xong.

## 5.31.1 · 18:09 21/11/2026

Mua Token dịch là dùng được trả theo lượt và xuất file phụ đề, không cần thuê phòng.

- Trả theo lượt chạy được khi còn Token dịch, kể cả chưa từng thuê phòng.
- Còn Token dịch thì xuất được file phụ đề như khi còn gói thuê phòng.
- Chưa chọn gói mà bấm Tải và dịch: app mở đúng chỗ chọn gói.

## 5.31.0 · 17:29 21/11/2026

Trang tài khoản có lịch sử đầy đủ: tệp đã dịch, thời lượng, model, Token dịch.

- Lượt dịch: tên tệp, dài bao lâu, model nào, Token dịch đã giữ, đã trừ, đã trả lại và trạng thái.
- Lượt dùng key của bạn cũng có trong lịch sử, ghi trên máy này.
- Mua và gói: từng gói Token dịch còn bao nhiêu, hạn đến bao giờ; các lần mua và thuê phòng.
- Nút Xem lịch sử ngay dưới tên tài khoản.

## 5.30.3 · 17:21 21/11/2026

Tắt bàn phím ảo thì thanh dưới và tab Ví về đúng chỗ.

- Tắt bàn phím bằng nút quay lại: thanh dưới hiện lại, tab không lộ khoảng trống.

## 5.30.2 · 17:04 21/11/2026

Web vừa lên bản mới thì trang tự tải lại, không đứng ở màn lỗi.

- Trang đang mở từ bản cũ tự tải lại một lần để lấy bản mới.
- Màn lỗi có nút Tải lại trang.

## 5.30.1 · 16:45 21/11/2026

Dễ tìm trang tài khoản và lịch sử giao dịch.

- Menu trái, nhóm Ví và gói, có mục Tài khoản và lịch sử, ở mọi trang.
- Khối lịch sử giao dịch luôn hiện, kể cả khi chưa có giao dịch nào.
- Hướng dẫn chỉ đúng tên mục trên menu.

## 5.30.0 · 16:33 21/11/2026

Trả theo lượt giữ Token dịch theo từng phần: nhận dạng trước, dịch sau.

- Bắt đầu chỉ giữ Token dịch cho phần nhận dạng; phần dịch giữ khi bắt đầu dịch.
- Lúc chờ bạn xem bảng nhân vật không giữ gì; phần nhận dạng đã trừ số thực và trả phần thừa.
- Dịch lại bằng model khác hay làm nốt chỉ giữ phần dịch, không giữ lại phần nhận dạng.
- Thiếu Token dịch khi sang phần dịch: phần nhận dạng vẫn giữ, mua thêm rồi bấm Tiếp tục.

## 5.29.0 · 16:26 21/11/2026

Giọng văn trau chuốt của từng thể loại được phòng tinh chỉnh dần.

- Mỗi thể loại có lời dặn giọng văn riêng khi trau chuốt, phòng sửa được mà không cần chờ bản mới.
- Luật giữ nghĩa câu và giữ thuật ngữ vẫn cố định.

## 5.28.0 · 16:15 21/11/2026

Trau chuốt viết lại tự nhiên hơn, và nhận thêm yêu cầu của bạn.

- Trau chuốt được phép đổi cách nói cho giống lời thoại thật, vẫn giữ nghĩa và độ dài câu.
- Có ô Yêu cầu thêm, ví dụ: văn kiếm hiệp, xưng huynh đệ, bớt trang trọng. App nhớ cho lần sau.
- Trau chuốt xem thêm nhiều câu phía trước để giữ đúng xưng hô trong cảnh.

## 5.27.1 · 16:10 21/11/2026

Câu báo dùng cách gọi mới cho người phụ trách web.

- Các câu như «chưa mở model này» không còn ghi «Chủ», dùng cách gọi chung mới.

## 5.27.0 · 16:06 21/11/2026

Nhận dạng xong, bước cuối của tab có nút Dịch tiếp; dừng lượt luôn hỏi lại.

- Đang chờ xem bảng nhân vật: bước cuối có nút Dịch tiếp, bấm là tab tự đóng và dịch luôn.
- Bấm Hủy khi đang chạy thì app hỏi lại trước khi dừng, tránh lỡ tay mất phần nhận dạng.
- Thanh tiến độ ghi đang chờ bạn, câu giá ghi đã giữ Token dịch khi lượt đang chạy.
- Hộp Làm lại nói rõ trừ thêm Token dịch; muốn đổi model dịch thì dùng Dịch lại.

## 5.26.0 · 13:52 21/11/2026

Đổi mật khẩu trong trang tài khoản cũng có thư báo.

- Đổi mật khẩu xong, bạn nhận thư «Mật khẩu đã đổi» như khi đặt lại qua thư.
- Nhập sai mật khẩu cũ thì không có thư.

## 5.25.0 · 13:44 21/11/2026

Điều khoản mới: đếm ẩn danh lựa chọn để phục vụ bạn tốt hơn.

- Khi bạn trả lời câu hỏi lần đầu hoặc chọn cách trả, phòng chỉ cộng một vào số lần của lựa chọn đó.
- Lần đếm không kèm tài khoản, email, mã máy hay địa chỉ mạng.
- Điều khoản cập nhật ở mục Dữ liệu đi những đâu; bạn sẽ được hỏi đồng ý lại một lần.

## 5.24.0 · 13:37 21/11/2026

Lần đầu vào, app hỏi bạn dùng để làm gì để đặt sẵn lựa chọn hợp.

- Chọn Xem phim bộ, Làm phụ đề, Học ngoại ngữ hoặc Việc khác; bấm Bỏ qua cũng được.
- Học ngoại ngữ: Thuyết minh tắt sẵn để nghe giọng gốc; bật lại ở tab Thuyết minh.
- Chỉ hỏi một lần trên máy này.

## 5.23.0 · 13:28 21/11/2026

Nút chính trang chủ chỉ đúng bước còn thiếu; thanh dưới còn 4 nút có chữ.

- Chưa có key, gói hết hạn hay hết Token dịch: nút chính thành Thêm key, Gia hạn hoặc Mua thêm.
- Dưới nút có một dòng nói vì sao chưa dịch được: chưa chọn tệp, mất mạng hay đang bảo trì.
- Thanh dưới điện thoại: Trang chủ, Công cụ, Ví, Menu, nút nào cũng có chữ.
- Dịch trực tiếp mở từ ô đầu trang chủ hoặc trong Menu.

## 5.22.0 · 21/11/2026

Thêm key gọn hơn; Ví chia rõ Thuê phòng và Token dịch.

- Cài đặt dịch: bấm Thêm key, chọn nhà rồi dán. Mỗi key ghi việc làm được và đã hợp lệ chưa.
- Key Groq được nhớ ngay khi dán; xóa key là xóa hẳn khỏi máy.
- Ví: khối Thuê phòng và khối Token dịch tách riêng; cách bạn đang dùng đứng trước.
- Gửi yêu cầu hỗ trợ nằm cuối Ví.

## 5.21.0 · 21/11/2026

Trang chủ rõ cách trả; đầu trang gọn với một nút Hiển thị.

- Lần đầu: chọn dùng key AI của bạn hoặc trả theo lượt bằng Token dịch. Web nhớ cho lần sau.
- Đầu trang báo đúng gói, dùng thử, key đã thêm, Token dịch còn hay hết, kèm bước tiếp theo.
- Chưa có key: lấy key theo hướng dẫn, thêm key, hoặc dùng Token dịch cho lần này.
- Sáng tối, khoảng cách, cỡ chữ, hiệu ứng và màu gom vào nút Hiển thị, có chữ rõ.

## 5.20.1 · 21/11/2026

Điện thoại: khung không còn lệch ở đầu trang và quanh thanh dưới.

- Hàng nút đầu trang xuống dòng khi màn hẹp, nút chuông không còn bị cắt.
- Phần cuộn xuống mờ dần trước thanh dưới, không lộ ra quanh mép thanh.

## 5.20.0 · 21/11/2026

TyZo Sub là công cụ phụ đề AI theo yêu cầu; xác nhận quyền với nội dung mỗi tệp.

- Trước lần xử lý đầu của mỗi tệp, bạn xác nhận có quyền với nội dung. Chỉ hỏi một lần cho mỗi tệp.
- Ba loại nội dung người lớn gộp thành «Phim có nhãn 18+»; bỏ loại «phim mới chiếu».
- Tab Phim đổi tên thành Video; chữ trên web theo cách gọi của công cụ AI.
- Điều khoản bổ sung quy trình khiếu nại bản quyền và những việc không được làm.

## 5.19.0 · 20/11/2026

Dịch bằng nhiều nhà: Groq và Alibaba (Qwen), cả trả theo lượt lẫn key riêng.

- Model dịch của Alibaba (Qwen Plus, Max, Turbo) chọn được như model Groq, có nhãn nhà.
- Tự động chỉ chọn model của nhà bạn có key, hoặc phòng đang mở khi trả bằng Token dịch.
- Model phòng chưa có thì app báo tên model ngay, trước khi giữ Token dịch.
- Điều khoản bổ sung nơi chữ thoại được gửi để dịch.

## 5.18.2 · 20/11/2026

Điện thoại: tắt hiệu ứng không còn dải trống che góc dưới.

- Trang chính chạy xuống tận đáy màn hình, không bị cắt ngang phía trên thanh dưới.
- Cuộn hết trang vẫn thấy đủ nút, không bị thanh dưới đè.

## 5.18.1 · 20/11/2026

Điện thoại không còn bị thanh dưới và nhãn công cụ đè chữ.

- Nhãn công cụ vàng không đè Bản dịch, nút Sửa hay thanh tua của video.
- Trong Ví, dòng nói về gói dùng thử không đè nút Ngày, Tuần, Tháng.
- Thanh mục đứng trên phần đang xem, không đè tiêu đề khi cuộn.
- Thẻ một khách gập thêm Ghi chú, Bảo mật và Quyền.

## 5.18.0 · 20/11/2026

Đọc file có phần trăm. Thuyết minh không đọc vào chỗ im.

- Lúc đọc âm thanh, thanh tiến độ hiện phần trăm ước và số giây, không còn đứng ở 0%.
- Ô ngôn ngữ nguồn có thêm «Tự động» khi chưa chắc phim nói tiếng gì.
- Dịch xong có thể trau chuốt, hoặc dịch lại bằng model khác mà không nhận dạng lại.
- Thuyết minh bỏ khoảng im giữa các từ, và không đổi sang giọng máy khi giọng đã chọn lỗi.

## 5.17.7 · 20/11/2026

Báo khi nhận dạng ra quá ít chữ so với độ dài video.

- Video từ 20 giây mà chữ nhận ra quá thưa sẽ có thêm dòng nhắc là có thể đã sót lời.
- Bạn có thể thử model nhận dạng khác hoặc chạy lại để so sánh. Bản dịch không đổi.

## 5.17.6 · 20/11/2026

Nhận dạng giọng nói không còn bỏ sót lời ở phim thường.

- Sửa lỗi nhận dạng chỉ chép được vài câu trong video có thoại liên tục và nhạc nền.
- Phim thể loại người lớn vẫn giữ bước lọc tiếng thở, tiếng rên như trước.

## 5.17.5 · 20/11/2026

Thoại tiếng Trung, Nhật, Hàn được tách thành từng câu kỹ hơn.

- Đoạn thoại chứa nhiều câu ngắn nay được tách thành từng câu, thay vì gộp thành vài dòng.
- Câu đơn vẫn giữ nguyên một dòng; chỉ tách ở dấu câu hoặc khi dòng quá dài.

## 5.17.4 · 20/11/2026

Nhận dạng giọng nói tách đủ từng câu khi lời thoại nói liền không nghỉ.

- Trước đây thoại liền mạch dễ bị gộp thành vài dòng rất dài; nay tách lại thành từng câu.
- Mỗi câu có mốc thời gian riêng, nên phụ đề và thuyết minh khớp với tiếng hơn.
- Câu ngắn và câu đã đủ gọn vẫn giữ nguyên như trước.

## 5.17.3 · 20/11/2026

Giá thuê phòng nay có thể thay đổi, và luôn hiện đúng giá đang bán.

- Trang Gói, Tài khoản, điều khoản và hướng dẫn đều hiện đúng giá đang bán, kể cả giá gạch.
- Số tiền tiết kiệm tự tính theo giá gạch và giá bán, không còn số cố định.
- Đơn đã tạo vẫn thu đúng giá lúc bạn đặt, dù giá đổi sau đó.

## 5.17.2 · 20/11/2026

Thuyết minh đọc đúng lúc hơn, bớt trễ so với tiếng gốc.

- App đo độ trễ thật của từng loại giọng và bắt đầu đọc sớm đúng bằng độ trễ đó.
- Các câu kế tiếp được tạo tiếng trước, nên câu sau gần như có tiếng ngay khi tới lượt.
- Câu dài hơn khoảng thoại thì đọc nhanh vừa phải; ô «Đọc trước / sau phụ đề» vẫn chỉnh tay được.

## 5.17.1 · 20/11/2026

Gọn lại chỗ chọn cách trả và bỏ khung ước tính chiếm chỗ.

- «Trả bằng» ở tab Phim chỉ báo trạng thái; muốn đổi bấm nút Đổi riêng bên cạnh.
- Giải thích Key của tôi nay đúng cho mọi nhà bạn đã nhập key, không riêng Groq.
- Bỏ khung giữ Token dịch ở màn chính; chỉ báo khi số dư không đủ.

## 5.17.0 · 20/11/2026

Các tab thành một chuỗi bước, có nút Tiếp tục luôn nằm trên đầu.

- Thứ tự: Cài đặt dịch, Phim, Ngữ cảnh, Thuyết minh, Tải và dịch. Cuộn xuống vẫn thấy Tiếp tục.
- Bước cuối là Tải và dịch: nút Tiếp tục đổi thành chạy dịch luôn.
- Cách trả và ước tính Token dịch dời xuống bước cuối. Ô dán key vẫn ở bước đầu.

## 5.16.2 · 20/11/2026

Số model dùng được nay là tổng của tất cả key bạn nhập.

- Bấm đồng bộ model thì app cộng model của mọi key, kèm số theo từng nhà (Groq, Alibaba...).
- Trả theo lượt: số model là tổng của các key mà phòng đã lưu.

## 5.16.1 · 20/11/2026

Tab công cụ tự đóng khi bắt đầu dịch, và không còn che phần hướng dẫn.

- Bấm Tải và dịch thì tab Phim tự đóng, thấy ngay video và tiến độ, không cần bấm X.
- Phần hướng dẫn «Chỉ tôi» tự mở hoặc đóng tab công cụ đúng lúc nên không bị che chỗ cần chỉ.

## 5.16.0 · 20/11/2026

Thêm nút chọn cỡ chữ: Vừa, Lớn, Rất lớn.

- Nút «Aa» cạnh nút sáng/tối ở đầu trang; bấm để đổi qua ba cỡ chữ.
- Lựa chọn được nhớ trên máy của bạn, không bị nháy khi mở lại trang.

## 5.15.0 · 20/11/2026

Nhân vật, Thuật ngữ và Ghi chú phim gom vào một tab Ngữ cảnh.

- Tab Ngữ cảnh có ba nhánh chuyển nhanh: Nhân vật, Thuật ngữ, Ghi chú phim.
- Nút vàng giữa thanh dưới còn 4 công cụ: Phim, Ngữ cảnh, Thuyết minh, Kiểm tra.
- Menu vẫn có lối tắt Thuật ngữ; bảng thuật ngữ riêng cho phim nằm cùng chỗ với thuật ngữ thể loại.

## 5.14.0 · 20/11/2026

Tab Phim gọn hơn: chỉ còn việc chính, phần ít dùng gập lại.

- Video và link ở ngay trên; nút Tải và dịch luôn dính đáy tab.
- Âm thanh riêng và cách xử lý file lớn gom vào mục «Tùy chọn thêm»; chọn âm thanh rồi thì mục tự mở.

## 5.13.0 · 20/11/2026

Cách trả chuyển sang mục Cài đặt dịch trong Menu; nút vàng gọn còn 5 công cụ.

- Cách trả và ô dán key nằm ở Menu, mục Cài đặt dịch; bấm dòng «Trả bằng» ở tab Phim cũng mở được.
- Nút vàng giữa thanh dưới chỉ lướt qua Phim, Nhân vật, Thuật ngữ, Thuyết minh, Kiểm tra.
- Model dịch, nhận dạng giọng, số luồng và các ô tùy chọn gom vào mục «Nâng cao» đóng sẵn.

## 5.12.0 · 20/11/2026

Ghi chú dài gom vào nút (i) cho gọn màn hình.

- Chữ giải thích ở Cách trả, Nhận dạng, Phân tích phim và Thuyết minh nay nằm trong nút (i).
- Máy tính rê chuột vào (i), điện thoại bấm vào (i) để đọc; bấm ra ngoài thì đóng.
- Lỗi và cảnh báo vẫn hiện sẵn, không bị giấu.

## 5.11.0 · 19/11/2026

Thêm ô Yêu cầu thêm cho bản dịch để chỉnh giọng văn.

- Ở Ngữ cảnh phim, ghi thêm yêu cầu như dịch trang trọng hơn hoặc xưng hô thân mật, tối đa 300 ký tự.
- Dùng cho cả dịch và Trau chuốt bản dịch; chỉ đổi giọng văn, không làm hỏng phụ đề.

## 5.10.1 · 19/11/2026

Câu chỉ có tiếng đệm như «okay okay» không còn bị báo chưa dịch.

- Các tiếng đệm giữ nguyên như okay, haha, wow không bị đánh dấu lỗi và không bị dịch lại.

## 5.10.0 · 19/11/2026

Thêm nút Trau chuốt bản dịch, xem so sánh rồi mới chọn dùng.

- Bấm Trau chuốt bản dịch để model sửa lại câu cho đúng giọng thể loại.
- Hiện giá Token dịch trước, bạn đồng ý mới chạy; không đồng ý thì không trừ gì.
- Xem bản cũ cạnh bản mới, dùng từng câu hoặc tất cả, quay lại bản cũ bất cứ lúc nào.
- Câu bạn đã sửa tay được giữ nguyên.

## 5.9.1 · 19/11/2026

Ô chọn ngôn ngữ và thể loại dùng hộp của web, có khu 18+ riêng.

- Các ô chọn mở hộp của web thay cho danh sách của điện thoại.
- Thể loại có khu 18+ nổi bật ở trên, chọn mức Thấp, Vừa hoặc Cao.
- Chọn mức 18+ vẫn hỏi xác nhận trên 18 tuổi.

## 5.9.0 · 19/11/2026

Thể loại 18+ phải xác nhận đủ 18 tuổi mới chọn được.

- Phim gắn nhãn 18+, Phim cấp 3 và Phim thoại kín hiện hộp xác nhận trên 18 tuổi khi chọn.
- Phim 18+ dịch nhẹ hơn Phim thoại kín; mỗi loại có bộ thuật ngữ riêng, không lẫn.

## 5.8.0 · 19/11/2026

Thêm 9 thể loại phim mới để dịch sát giọng phim hơn.

- Thêm Kiếm hiệp, Tiên hiệp, Ngôn tình, Phim cấp 3, Tâm lý xã hội.
- Thêm Chiến tranh, Gia đình, Học đường / thanh xuân, Tài liệu / phóng sự.
- Mỗi thể loại dặn cách xưng hô và giọng văn riêng khi dịch.

## 5.7.0 · 19/11/2026

Bố cục mới trên điện thoại: nút vàng lướt chọn công cụ.

- Kéo nút vàng giữa thanh dưới để lướt qua Phim, Nhân vật, Thuật ngữ, Thuyết minh, Kiểm tra, Cách trả.
- Bấm nút vàng mở tab công cụ cao khoảng 80% màn hình; Ví mở cùng kiểu.
- Tải và dịch nằm sát đáy tab Phim; vòng quanh nút vàng chạy theo tiến độ dịch.

## 5.6.1 · 22:23 ngày 18/11/2026

Giải thích nhà nhận dạng ngắn hơn.

- Dưới ô Nhận dạng giọng chỉ còn một đoạn, không lặp năm lần.
- Đoạn nói rõ link tải thẳng, hoặc tệp trên máy khi kho tạm bật.

## 5.6.0 · 18/11/2026

Tự chọn màu, số dư ở đầu trang và giao diện Tương lai.

- Nút Màu ở đầu trang cho bạn tự chọn màu nhấn bằng thanh kéo hoặc mã màu, được nhớ trên máy.
- Số dư Token dịch nằm ngay đầu trang chủ; trên máy tính, ô thả video cạnh bảng Bản dịch.
- Giao diện Tương lai (lưới mờ, kính mờ, vòng thả video sáng) là mặc định; có nút tắt hiệu ứng.

## 5.5.0 · 18/11/2026

Thêm nhà nhận dạng giọng Soniox.

- Chọn Soniox Async ở ô Nhận dạng giọng, dán link file trực tiếp.
- Dùng được ở cả Thuê phòng (key của bạn) và Trả theo lượt.

## 5.4.0 · 18/11/2026

Thêm nhà nhận dạng giọng Speechmatics.

- Chọn Speechmatics Standard hoặc Enhanced ở ô Nhận dạng giọng, dán link file trực tiếp.
- Dùng được ở cả Thuê phòng (key của bạn, đúng vùng tài khoản) và Trả theo lượt.

## 5.3.0 · 18/11/2026

Thêm nhà nhận dạng giọng AssemblyAI.

- Chọn Universal-3.5 Pro hoặc Universal-2 ở ô Nhận dạng giọng, dán link file trực tiếp.
- Dùng được ở cả Thuê phòng (key của bạn) và Trả theo lượt.

## 5.2.3 · 17/11/2026

Giọng đọc Orpheus theo danh sách Chủ mở khi thuê phòng.

- Giọng Orpheus chưa được mở thì app tự đọc bằng giọng khác và báo cho bạn biết.

## 5.2.2 · 17/11/2026

Chọn được Alibaba và Deepgram ở cửa Trả theo lượt.

- Ô Nhận dạng giọng hiện số Token dịch của từng model, không còn ghi nhầm là chưa có.
- Dịch trực tiếp báo rõ khi Chủ chưa mở model nào.

## 5.2.1 · 17/11/2026

Giá model ở cửa Trả theo lượt tính bằng Token dịch.

- Mỗi model hiện số Token dịch cần dùng, quy từ giá gốc, không còn giá đồng cộng thêm.

## 5.2.0 · 17/11/2026

Thuê phòng hiện đủ ô key của mọi nhà.

- Khi thuê phòng, bạn thấy ô key của Groq, Alibaba và Deepgram, nhập nhà nào dùng nhà đó.
- Mục Hướng dẫn «Lấy key» và Chỉ tôi nay nói chung cho cả ba nhà.

## 5.1.3 · 17/11/2026

Ghi chú việc của từng model hiện đúng hơn.

- Model nhận dạng và giọng đọc Deepgram không còn bị ghi nhầm là model dịch.
- Model dịch trực tiếp có ghi chú riêng.

## 5.1.2 · 17/11/2026

Nhận dạng Deepgram dùng được cả hai cửa.

- Cửa Trả theo lượt chạy Deepgram bằng key của phòng, tính theo thời lượng thực của tệp.
- Cửa Thuê phòng vẫn dùng key Deepgram của bạn.

## 5.1.1 · 17/11/2026

Giá Deepgram tự cập nhật theo trang chính thức.

- Giá nhận dạng và giọng đọc Deepgram tự lấy từ trang giá của Deepgram, bỏ giá khuyến mãi cũ.
- Nova-3 tính theo 0,0048 đô mỗi phút.

## 5.1.0 · 10:50 ngày 17/11/2026

Thêm Deepgram: nhận dạng Nova-3 và giọng đọc Aura.

- Nhận dạng Deepgram Nova-3 cho phim Anh, Trung, Nhật, Hàn, dùng key Deepgram của bạn.
- Giọng đọc Aura cho tiếng Anh và Tây Ban Nha, trừ Token dịch giống Orpheus.
- Điều khoản cập nhật: dữ liệu gửi Deepgram. Cần đồng ý lại khi vào.

## 5.0.6 · 02:45 ngày 17/11/2026

Cách trả nằm trong Key Sub.

- Chọn Key của tôi hoặc Trả theo lượt ngay trong Key Sub.
- Nâng cao không còn mục Gói dịch.
- Gói trả theo lượt đọc cùng thời lượng với thẻ Token dịch.

## 5.0.5 · 02:20 ngày 17/11/2026

Mã QR nổi giữa màn hình.

- Mã QR mua gói hiện giữa màn hình, không nằm ở góc.
- Tiền về thì hiện lời cảm ơn giữa màn hình.
- Đơn đóng hoặc hủy thì hiện lời xin lỗi giữa màn hình.

## 5.0.4 · 02:05 ngày 17/11/2026

Chữ tiền khớp cách trả.

- Đơn Token dịch ghi đã cộng Token dịch, không ghi đã cộng tiền.
- Trả theo lượt nói trừ Token dịch, không nói trừ trong ví.
- Không còn chỗ đặt số dư. Số dư cũ chỉ được gỡ về 0.

## 5.0.3 · 01:45 ngày 17/11/2026

Xóa số liệu thử cho bản sạch.

- Một nút xóa Token dịch, đơn, phiếu, chuông và gói thuê thử.
- Lượt thử về lại 1. Tài khoản, cấu hình và key giữ nguyên.
- Việc này không hoàn tiền.

## 5.0.2 · 01:10 ngày 17/11/2026

Tiền về thì được Token dịch.

- Đơn mua Token dịch đã trả mà chưa vào tài khoản thì được cộng khi mở Tài khoản.
- Chuyển khoản đúng số thì được Token dịch, không vào số dư.
- Thẻ Token dịch ở phòng dịch cũng cập nhật sau khi mua.

## 5.0.1 · 00:35 ngày 17/11/2026

Điều khoản nói rõ quyền, dữ liệu và cách trả.

- Token dịch là đơn vị dùng dịch vụ, không phải tiền và không chuyển được.
- Tiếng và chữ cần dịch được gửi tới nhà bạn chọn. Video xử lý trên máy bạn.
- Có cách báo nội dung không có quyền. Phòng tạm dừng xử lý nội dung đó.
- Mua gói và thuê phòng vẫn chuyển khoản đúng số, không giữ số dư.

## 5.0.0 · 23:55 ngày 16/11/2026

Mua gói bằng mã QR, không giữ số dư.

- Bấm mua Token dịch thì hiện mã QR. Chuyển khoản đúng số thì được gói.
- Thuê phòng cũng chuyển khoản theo mã, không giữ số dư.
- Orpheus khi dùng key của phòng trừ Token dịch. Giọng Neural vẫn miễn phí.
- Không còn chỗ nạp số dư.

## 4.1.1 · 22:55 ngày 16/11/2026

Hướng dẫn khớp cách trừ gói giây.

- Hướng dẫn nói rõ trả theo lượt và dịch trực tiếp cùng trừ gói giây.
- Thuyết minh khi dùng key của phòng vẫn trừ số dư đồng.
- Chỗ chọn Trả theo lượt không còn nói giữ tiền ví.

## 4.1.0 · 22:12 ngày 16/11/2026

Dịch trực tiếp trừ gói giây.

- Dịch trực tiếp trừ gói giây đã mua, không giữ số dư cho phiên.
- Hết giây thì phiên dừng. Mua thêm gói ở trang Số dư.
- Thuê phòng giữ giá tay như cũ.
- Giá model theo bảng niêm yết, không còn giá riêng từng model.

## 4.0.0 · 21:50 ngày 16/11/2026

Cửa trả theo lượt trừ gói giây, không giữ ví.

- Mua gói giây ở Số dư. Gói có hạn. Hết hạn thì phần còn lại mất, không hoàn tiền.
- Lần chạy giữ số giây ước tính, xong trừ số thực. Phần thừa trả lại nếu gói còn hạn.
- Giá gói mới có thể đổi. Gói đã mua giữ nguyên số giây đến hết hạn.
- Thuê phòng và nạp ví vẫn như cũ. Dịch trực tiếp vẫn trừ ví.

## 3.47.13 · 12:20 ngày 16/11/2026

Huy hiệu, bóng chữ và màn hướng dẫn theo giao diện.

- Viền huy hiệu, bóng chữ bảo trì và màn tối hướng dẫn theo thanh đang có.
- Mức mặc định không đổi hình. Nút tròn và màu phụ đề khách chọn vẫn giữ.

## 3.47.12 · 12:13 ngày 16/11/2026

Xem trước cả trang và hoàn tác.

- Khi đang chỉnh, trang đổi ngay, không cần tải lại.
- Có nút hoàn tác một bước. Khách chỉ thấy sau khi công bố.

## 3.47.11 · 12:06 ngày 16/11/2026

Biểu tượng chia theo nhóm.

- Điều hướng, hành động, trạng thái và giao diện có thể chọn nét riêng.
- Mặc định mỗi nhóm theo nét chung, nên hình không đổi.

## 3.47.10 · 11:59 ngày 16/11/2026

Chia giao diện thành sáu phần.

- Màu, chữ, hình khối, biểu tượng, chuyển động và trang riêng nằm mỗi phần một chỗ.
- Xem trước và các nút lưu vẫn ở trên. Không đổi giá trị mặc định.

## 3.47.9 · 11:51 ngày 16/11/2026

Chỉnh biển trang bảo trì.

- Đổi được chữ trên biển, màu biển, hiệu ứng mạnh, và robot hay chỉ biển.
- Mặc định vẫn «BẢO TRÌ», màu lỗi, có robot và hiệu ứng mạnh.

## 3.47.8 · 11:41 ngày 16/11/2026

Bật tắt hiệu ứng và chọn tốc độ.

- Hiệu ứng có thể tắt hoặc để chậm, vừa, nhanh. Mặc định vẫn bật và vừa.
- Máy đang giảm chuyển động thì hiệu ứng luôn tắt.

## 3.47.7 · 11:29 ngày 16/11/2026

Độ rộng trang và vị trí menu.

- Trang rộng có thể hẹp hơn. Mức 120 giữ nguyên như trước.
- Menu có thể sang phải. Mặc định vẫn bên trái.

## 3.47.6 · 11:02 ngày 16/11/2026

Phông tiêu đề, độ đậm và giãn dòng.

- Tiêu đề có phông riêng và độ đậm riêng. Mặc định trùng như trước.
- Giãn dòng nội dung chỉnh được. Mức 1.5 giữ nguyên.

## 3.47.5 · 10:50 ngày 16/11/2026

Kiểu nút và tám bộ màu.

- Nút đang tô màu nhấn có thể đặc, chỉ viền hoặc mờ. Đặc giữ nguyên.
- Có tám bộ màu. Bộ Vàng là màu đang dùng.

## 3.47.4 · 10:41 ngày 16/11/2026

Chọn độ dày viền khung.

- Viền thẻ, nút và ô nhập có thể dày 1, 2 hoặc 3 px.
- Mức 1 giữ nguyên như trước. Viền huy hiệu không đổi.

## 3.47.3 · 10:32 ngày 16/11/2026

Chọn cỡ icon và màu icon.

- Icon có ba cỡ: nhỏ, vừa, lớn. Mức vừa giữ nguyên như trước.
- Màu icon theo chữ, hoặc theo màu nhấn.

## 3.47.2 · 10:23 ngày 16/11/2026

Tìm icon và đặt lại từng chỗ.

- Có ô tìm chức năng, ô tìm hình, và bấm vào hình để chọn.
- Nút đặt lại từng chỗ đưa về hình sẵn. Hình sẵn không đổi.

## 3.47.1 · 10:15 ngày 16/11/2026

Quầng sáng cũng theo mức bóng.

- Quầng sáng màu và khung tóm tắt phiên bản đổi theo mức bóng đang chọn.
- Mức 1 giữ nguyên như trước. Viền huy hiệu và bóng chữ không đổi.

## 3.47.0 · 10:08 ngày 16/11/2026

Thêm mức độ đậm của bóng nổi.

- Hộp thoại, menu và banner nổi đổi theo mức bóng đang chọn.
- Mức 1 giữ nguyên như trước. Kéo về 0 thì những bóng đó tắt.

## 3.46.18 · 09:50 ngày 16/11/2026

Các nút còn lại lấy icon trong giao diện.

- Phòng chiếu, dịch trực tiếp, trang chủ, sáng tối và tải phụ đề dùng icon đang chọn.
- Có thêm chỗ cho video, âm thanh, vòng chạy, bảo trì, micro và loa.

## 3.46.17 · 09:37 ngày 16/11/2026

Nút tải lên, dán link và khóa theo icon giao diện.

- Ô chọn tệp và ô dán link dùng icon Tải lên và Dán link.
- Nút đổi sang khóa của tôi dùng icon Khóa API.

## 3.46.16 · 09:29 ngày 16/11/2026

Nút chép, lưu và trang lỗi theo icon giao diện.

- Nút sao chép và nút lưu câu dùng icon Sao chép và Thành công.
- Nút hủy dùng icon Đóng. Trang khi có lỗi dùng icon Lỗi.

## 3.46.15 · 09:21 ngày 16/11/2026

Icon ví theo giao diện.

- Icon ví ở trang chủ, thẻ tiền và dịch trực tiếp lấy icon chỗ Ví.
- Đổi icon Ví trong giao diện thì ba chỗ này đổi theo.

## 3.46.14 · 08:40 ngày 16/11/2026

Nút xem hoặc ẩn khóa theo icon giao diện.

- Nút hiện và ẩn khóa lấy icon đang chọn trong giao diện.
- Đổi icon chỗ Xem hoặc Ẩn thì các ô khóa đổi theo.

## 3.46.13 · 08:33 ngày 16/11/2026

Ô nhập và ô thả video theo thanh bo góc.

- Ô nhập, ảnh nhỏ và cột biểu đồ bo theo mức ô nhập.
- Ô thả video bo theo mức thẻ. Nút tròn giữ nguyên.

## 3.46.12 · 08:26 ngày 16/11/2026

Khung thẻ và mục menu theo thanh bo góc.

- Khung thẻ trong trang cũng bo theo mức đang chọn.
- Mục trong menu theo mức của ô nhập. Nút tròn giữ nguyên.

## 3.46.11 · 08:18 ngày 16/11/2026

Góc thẻ và ô nhập theo thanh bo góc.

- Góc cỡ thẻ và cỡ ô nhập đổi theo mức bo đang chọn.
- Nút tròn và góc nhỏ hơn giữ nguyên.

## 3.46.10 · 08:11 ngày 16/11/2026

Thư và cửa sổ đăng nhập theo màu gốc.

- Thư chưa tự chọn màu dùng nền, chữ và nút của giao diện sáng.
- Cửa sổ đăng nhập chớp qua dùng nền và chữ phụ của giao diện tối.

## 3.46.9 · 08:04 ngày 16/11/2026

Nền trang bảo trì theo màu giao diện.

- Nền, lời nhắn và nút cuối trang đổi theo màu nền và màu chữ đang chọn.
- Lúc chữ nhấp, bóng dùng màu thông tin và màu lỗi.

## 3.46.8 · 07:55 ngày 16/11/2026

Robot bảo trì theo màu giao diện.

- Thân, mắt và biển của robot đổi theo màu chữ, màu thông tin và màu lỗi.
- Đèn trên mũ nhấp theo màu lỗi đang chọn.

## 3.46.7 · 07:47 ngày 16/11/2026

Logo, thanh mật khẩu và huy hiệu cấp theo giao diện.

- Nền logo và vạch mật khẩu chưa bật đổi theo màu thẻ và màu viền.
- Huy hiệu hỗ trợ, quản lý và chủ đổi theo màu của cấp đó.

## 3.46.6 · 07:41 ngày 16/11/2026

Trang lỗi viết bằng tiếng Việt.

- Khi trang bị lỗi, tiêu đề và lời nhắn dự phòng hiện bằng tiếng Việt.

## 3.46.5 · 07:28 ngày 16/11/2026

Nhãn đơn nạp và trang lỗi theo màu giao diện.

- Đã cộng, đang chờ, hết hạn và đã hủy đổi theo màu thành công, chờ và lỗi.
- Nút hủy đơn và trang khi có lỗi cũng dùng màu đó.

## 3.46.4 · 07:21 ngày 16/11/2026

Đèn chất lượng và đường tiền theo màu giao diện.

- Mức tốt, cần chú ý và kém đổi theo màu thành công, chờ và lỗi.
- Đường tiền thu và chi trên biểu đồ cũng theo hai màu đó.

## 3.46.3 · 07:12 ngày 16/11/2026

Trang bảo trì dùng màu cảnh báo của giao diện.

- Dải cảnh báo, tiêu đề, đèn và tia lửa đổi theo màu chờ đang chọn.
- Áo, sọc và viền biển theo màu chờ. Mũ robot theo màu nhấn.

## 3.46.2 · 06:58 ngày 16/11/2026

Thông báo và chấm trạng thái theo màu giao diện.

- Thông báo, dải mất mạng và nút đăng xuất đổi theo màu đang chọn.
- Chấm mở hoặc đóng, ô thuê, ô khóa và chữ trên nhãn cấp cũng theo màu đó.

## 3.46.1 · 05:58 ngày 16/11/2026

Chủ web xem thử được trang bảo trì trước khi bật.

- Có nút xem trước ngay ở phần cài đặt bảo trì, đóng bằng nút hoặc phím Esc.

## 3.46.0 · 19:56 ngày 15/11/2026

Trang bảo trì mới: công nhân robot cắm biển ngay dưới logo.

- Lúc bảo trì, robot mang biển «BẢO TRÌ» vào, cắm xuống rồi tiêu đề và lời nhắn hiện ra.
- Tiêu đề và lời nhắn của trang do chủ web tự viết, kèm giờ dự kiến mở lại.

## 3.45.1 · 18:13 ngày 15/11/2026

Các ô hỏi lại trước khi xóa hay đăng xuất nay cùng giao diện với web.

- Thay các hộp mặc định của trình duyệt bằng hộp của web, dùng được bằng phím Esc và Tab.
- Việc khó hoàn tác có nút đỏ, và nút Hủy được chọn sẵn để tránh bấm nhầm.

## 3.45.0 · 17:57 ngày 15/11/2026

Khi cần nâng cấp, cả web có thể tạm bảo trì.

- Lúc bảo trì, mọi trang hiện lời nhắn và giờ dự kiến mở lại.
- Việc đang chạy vẫn chạy nốt. Số dư và lịch sử của bạn được giữ nguyên.

## 3.44.1 · 10:54 ngày 15/11/2026

Sửa dòng trạng thái đầu trang khi Dịch bình thường đang bảo trì.

- Đang bảo trì thì dòng đầu trang không còn báo «Sẵn sàng», nói rõ chưa bắt đầu dịch được.
- Vẫn chọn được tệp trước; nút bắt đầu mở lại khi nhóm hoạt động.

## 3.44.0 · 10:15 ngày 15/11/2026

Tách Dịch trực tiếp và Dịch bình thường, mỗi nhóm có trạng thái Hoạt động hoặc Bảo trì.

- Trang chủ và trang Dịch trực tiếp có hai nhóm đứng cạnh nhau, kèm chấm trạng thái.
- Nhóm đang bảo trì hiện lời nhắn và giờ dự kiến mở lại, nút bắt đầu bị khóa.
- Lượt đang chạy vẫn chạy nốt, không bị cắt giữa chừng.

## 3.43.3 · 09:17 ngày 15/11/2026

Sửa khung tóm tắt cập nhật bị lệch.

- Khung hiện đúng vị trí, nằm gọn trong màn hình điện thoại lẫn máy tính.
- Các bản cập nhật cách nhau bằng đường kẻ, dễ đọc hơn.

## 3.43.2 · 09:10 ngày 15/11/2026

Sửa khung thông báo bị lệch và bắt buộc có tài khoản mới vào phòng dịch.

- Khung thông báo trên điện thoại nằm gọn trong màn hình, không tràn ra mép.
- Chưa đăng nhập thì được đưa sang trang đăng nhập, không vào thẳng phòng dịch.
- Phiên đăng nhập hết hạn giữa chừng cũng được đưa về trang đăng nhập.

## 3.43.1 · 04:15 ngày 15/11/2026

Sửa lỗi không cuộn được ở Dịch trực tiếp, Hướng dẫn, Cộng tác viên và Tải video.

- Các trang này giờ cuộn xuống được hết, kể cả phần chữ chạy và nút tải phụ đề.

## 3.43.0 · 02:40 ngày 15/11/2026

Điều khoản cập nhật: ghi rõ ai xem được tên tệp trong phiếu trả theo lượt.

- Nhân viên của phòng chỉ thấy tên tệp đã che; chỉ Chủ xem được tên đầy đủ.
- Mỗi lần Chủ xem tên đầy đủ đều được ghi vào nhật ký thao tác.
- Bạn cần đọc và đồng ý lại điều khoản mới khi vào phòng.

## 3.42.0 · 02:10 ngày 15/11/2026

Có mũi tên quay lại ở đầu trang, và điều khoản gọn lại còn ba chỗ.

- Mũi tên ở đầu Hướng dẫn, Dịch trực tiếp, Tài khoản, Thuê phòng, Tải video, Điều khoản.
- Bấm mũi tên về trang vừa xem; mở thẳng link thì về trang chủ.
- Trong Số dư, mũi tên về màn vừa xem.
- Liên kết Điều khoản chỉ còn ở ô tích đăng ký, menu trái và Tài khoản.

## 3.41.0 · 01:35 ngày 15/11/2026

Điều khoản gom về một chỗ: tích đồng ý khi đăng ký, đọc lại bất cứ lúc nào.

- Đăng ký hoặc đăng nhập chỉ cần tích một ô «Tôi đồng ý Điều khoản và Chính sách».
- Không còn màn điều khoản chen giữa lúc vào phòng dịch.
- Đọc lại ở trang Điều khoản và Chính sách, có liên kết ở menu trái, Tài khoản và Hướng dẫn.

## 3.40.0 · 00:52 ngày 15/11/2026

Hướng dẫn «Chỉ tôi» làm tối nền, chỉ sáng đúng chỗ cần bấm.

- Mọi mục trong trang Hướng dẫn đều có nút «Chỉ tôi» chạy ngay trên màn hình thật.
- Nền tối mờ, chỗ cần bấm sáng lên kèm một câu ngắn, rồi sang bước kế.
- Điện thoại tự mở menu trái khi cần chỉ vào mục trong menu.

## 3.39.0 · 00:23 ngày 15/11/2026

Có trang Hướng dẫn: tìm nhanh cách dùng, nạp tiền, lấy key và cách liên hệ hỗ trợ.

- Mở Hướng dẫn ở menu trái, hoặc bấm Ctrl+K rồi gõ «hướng dẫn».
- Có ô tìm kiếm, câu hỏi thường gặp và cách liên hệ hỗ trợ của phòng.
- Bấm «Chỉ tôi» ở mục Bắt đầu nhanh để được chỉ từng bước ngay trên màn hình thật.
- Mục mật khẩu tự đổi theo việc phòng đã gửi được thư đặt lại hay chưa.

## 3.38.0 · 23:55 ngày 14/11/2026

Có màn hình Dịch trực tiếp: nghe và dịch ngay khi đang nói.

- Chọn ngôn ngữ nói và ngôn ngữ dịch, bấm Bắt đầu để thu từ micro hoặc từ một tab trình duyệt.
- Chữ gốc và chữ dịch chạy theo thời gian thực, có tiếng dịch nếu bạn bật.
- Thấy số dư, còn khoảng bao nhiêu phút, và cảnh báo khi sắp hết tiền.
- Tải phụ đề SRT, VTT hoặc TXT của buổi vừa dịch.

## 3.37.0 · 23:20 ngày 14/11/2026

Chạy tốt hơn trên điện thoại, máy tính bảng và máy tính.

- Điện thoại: chữ gợi ý đổi thành Chạm để chọn video, không nhắc phím tắt.
- Đang dịch thì màn hình không tự tắt (máy nào hỗ trợ).
- Toàn màn hình chạy cả trên iPhone; nút Xoay chỉ hiện ở máy khóa được hướng.

## 3.36.0 · 22:40 ngày 14/11/2026

Trang chủ thoáng hơn, chữ lớn hơn, kéo thả có hiệu ứng.

- Ô thả và các lựa chọn thoáng hơn; tiêu đề, ô link và nút Tải và dịch chữ lớn hơn.
- Kéo tệp vào trang thì ô thả nhấp nháy; kéo vào ô thì phóng nhẹ và sáng viền.
- Thả tệp ngoài ô cũng nhận được. Bật giảm chuyển động thì không còn hiệu ứng.

## 3.35.0 · 22:10 ngày 14/11/2026

Thuật ngữ và Gói dịch có mục riêng trong menu trái, tab Key và Phim gọn lại.

- Menu trái có nhóm Nâng cao với hai mục: Gói dịch và Thuật ngữ.
- Tab Key chỉ còn ô key; chọn cách trả và gói dịch ở mục Gói dịch.
- Tab Phim chỉ còn ngôn ngữ, thể loại, tệp và nút chạy; sửa thuật ngữ ở mục Thuật ngữ.

## 3.34.0 · 21:30 ngày 14/11/2026

Thấy số dư còn được bao nhiêu phút, ước tính trước khi chạy, nạp nhanh tại chỗ.

- Chọn Trả theo lượt thì hiện số dư kèm Còn khoảng bao nhiêu phút.
- Chọn video xong thấy ước tính tiền cho video đó và số tiền phòng giữ trước khi chạy.
- Ví thiếu thì báo rõ thiếu bao nhiêu, có nút Nạp nhanh ngay tại trang chủ.

## 3.33.0 · 20:50 ngày 14/11/2026

Tiến trình chạy liền một thanh, sửa câu ngay tại dòng, tải phụ đề SRT, VTT hoặc TXT.

- Thanh tiến trình chạy liền một mạch, có vạch ngăn bốn bước và phần trăm tổng.
- Bấm Sửa thì ô sửa mở ngay tại dòng đó, không còn hộp trượt từ dưới lên.
- Nút Tải phụ đề mở menu chọn SRT, WebVTT hoặc chữ thuần TXT.
- Bấm một dòng bản dịch vẫn nhảy video tới đúng câu đó.

## 3.32.0 · 20:20 ngày 14/11/2026

Trang chủ gọn lại thành một ô thả lớn, dán link là tự chạy, Ctrl+K mở lệnh nhanh.

- Chưa có video thì trang chủ chỉ còn một ô thả lớn, một hàng chip và nút Tải và dịch.
- Dán link video ở bất cứ đâu trên trang, app nhận link và tự bắt đầu dịch.
- Bấm Ctrl+K (Cmd+K trên Mac) rồi gõ việc muốn làm: chọn video, tải file, nạp tiền.
- Menu trái có mục Trang chủ để quay về ô thả bất cứ lúc nào.

## 3.31.2 · 19:30 ngày 14/11/2026

Menu ba gạch bên trái gom các chức năng; Đăng xuất nằm cuối menu.

- Bấm nút ba gạch để mở menu trái. Chức năng lớn gập các mục nhỏ bên trong.
- Nút Đăng xuất nằm cuối menu, có hỏi lại một lần trước khi thoát.
- Các tab quản lý xếp thẻ có viền, cao bằng nhau. Key và giá gọn hơn.
- Phần soạn thư và danh sách icon dài được gập lại.

## 3.31.1 · 11:40 ngày 14/11/2026

Các tab quản lý xếp đều như nhau, phần key và giá gom sang tab Cấu hình.

- Mọi tab xếp thẻ theo lưới đều, cao bằng nhau, không còn cột dài cột ngắn.
- Tab Cấu hình mới gom key Groq, key Alibaba, giá, gói dịch, model thuê phòng và cổng nạp.
- Các danh sách dài được gập lại, bấm vào mới mở.

## 3.31.0 · 10:20 ngày 14/11/2026

Trang quản lý có thanh bên trái, tìm nhanh bằng Ctrl+K và biểu đồ thu chi.

- Màn rộng có thanh bên trái để chuyển mục. Điện thoại giữ hàng nút phía trên, dính khi cuộn.
- Bấm Ctrl+K (hoặc nút Tìm) rồi gõ tên mục hay email khách để nhảy tới ngay.
- Có thêm biểu đồ đường thu và chi, tiền nạp mỗi khách, tỷ lệ dùng thử rồi mua và chi phí theo loại.

## 3.30.0 · 10:03 ngày 14/11/2026

Trang quản lý có màn Tổng quan để theo dõi và xử lý nhanh hơn.

- Chủ phòng và nhân viên thấy ngay số lượt chạy, lỗi, đơn nạp đang chờ và các cảnh báo.
- Danh sách phiếu lọc được theo trạng thái và tìm được theo email hoặc tên tệp.

## 3.29.4 · 09:15 ngày 14/11/2026

Báo lỗi rõ hơn khi đăng nhập, mất mạng, nhập link và chọn model.

- Đăng nhập sai nói rõ email hoặc mật khẩu chưa đúng. Nút Đăng nhập khóa hẳn và quay khi đang xử lý.
- Mất mạng thì hiện banner đỏ phía trên và các nút hành động tạm khóa.
- Dán link không phải file video trực tiếp sẽ được nhắc ngay. Chưa có phụ đề thì nút xuất file khóa.
- Model mà key chưa mở thì mờ đi, có nhãn Key chưa mở và không chọn được.

## 3.29.3 · 07:22 ngày 14/11/2026

Báo rõ khi file có loại âm thanh không đọc được, kèm cách đổi.

- File MKV, AVI hay âm thanh AC3/DTS mà trình duyệt không đọc được nay được nhận ra và nói rõ.
- Lỗi ghi sẵn lệnh đổi sang M4A với đúng tên file của bạn, chỉ cần chép và chạy.
- File chỉ hỏng hoặc tải dở thì báo là hỏng, không đổ lỗi cho loại âm thanh.

## 3.29.2 · 07:19 ngày 14/11/2026

Dịch không còn treo mãi khi Groq trả dữ liệu dở dang.

- Nếu Groq gửi dữ liệu nửa chừng rồi đứng im, app tự dừng sau 2 phút và thử lại.
- Lần thử lại không làm mất phần đã nhận dạng hay đã dịch.
- Báo lỗi rõ ràng bằng tiếng Việt thay vì quay mãi không có kết quả.

## 3.29.1 · 07:00 ngày 14/11/2026

Nút sáng/tối luôn hiện, chế độ gọn không còn làm lệch bố cục.

- Nút sáng/tối ở đầu trang nay luôn hiện. Bạn chọn gì, máy nhớ cho lần mở sau.
- Chế độ gọn không còn làm hẹp ô tìm kiếm hay lệch khung trên màn hình rộng.
- Thanh trình duyệt đổi màu theo giao diện sáng hoặc tối ngay khi mở trang.

## 3.29.0 · 05:46 ngày 14/11/2026

Chuyển sáng/tối, chọn giao diện gọn hoặc thoải mái, kiểm tra key trước khi dịch.

- Hai nút nhỏ ở đầu trang: đổi sáng/tối và gọn/thoải mái. Máy nhớ lựa chọn của bạn.
- Dán key Groq xong, app tự kiểm tra key, hạn mức và model đã chọn có dùng được không.
- Key sai hoặc thiếu model thì báo ngay, không tốn lượt thử.

## 3.28.0 · 05:07 ngày 14/11/2026

Kéo thả video, tiến trình theo từng bước, hướng dẫn lần đầu.

- Kéo thả video vào khung phát, có ảnh xem trước, tên tệp và thời lượng.
- Thanh tiến trình chia bước: cắt, nhận dạng, dịch, sửa lại.
- Lần đầu vào có hướng dẫn 4 bước. Bấm nút dấu hỏi để xem lại.

## 3.27.0 · 04:34 ngày 14/11/2026

Thuật ngữ nền tự bật theo ngôn ngữ nguồn.

- Chọn một thể loại thì app tự thêm bộ thuật ngữ nền của ngôn ngữ nguồn.
- Có ô để tắt nếu bạn chỉ muốn dùng bộ của thể loại đã chọn.
- Thể loại 18+ vẫn dùng bộ riêng, không kèm bộ nền.

## 3.26.0 · 04:25 ngày 14/11/2026

Đăng nhập dán được cả email, cách trả rõ hơn.

- Ô email nhận địa chỉ dán nguyên, không bắt gõ tên rồi chọn gợi ý.
- Hai cách trả Key của tôi và Trả theo lượt có ghi chú ngay bên dưới.
- Rê chuột vào từng cách trả để xem tiền được tính thế nào.

## 3.25.0 · 01:38 ngày 13/11/2026

Trả theo lượt nhận dạng bằng Alibaba.

- Gói nhận dạng Alibaba dùng key của phòng.
- Cần link file trực tiếp, không phải trang xem.
- Dịch vẫn bằng Groq. Việc Alibaba khác chưa chạy.

## 3.24.1 · 00:49 ngày 13/11/2026

Trang quản lý tự mở lại sau mỗi bản cập nhật.

- Sau khi cập nhật, trang tự thử lại thay vì đứng im.
- Quyền hiện đúng khi trang đã mở xong.
- Số liệu phòng tải sau, không chặn cửa vào.

## 3.24.0 · 00:25 ngày 13/11/2026

Giá gói là số đã cộng phần vận hành.

- Giá bán bằng giá nhà phát hành cộng phần trăm Chủ đặt.
- Bạn chỉ thấy ước tính và khoản giữ ví.
- Không hiện giá gốc và không hiện phần trăm.

## 3.23.0 · 00:20 ngày 13/11/2026

Trả theo lượt chọn gói Chủ đã mở.

- Có gói thì nhận dạng và dịch theo gói đó.
- Lần chạy dùng key của phòng. Bạn không nhập key.
- Chưa có gói thì cửa vẫn nhận dạng bằng Whisper.

## 3.22.0 · 00:10 ngày 13/11/2026

Thuê phòng chỉ hiện model Chủ đã mở.

- Key của bạn chỉ chọn model Chủ đã mở cho thuê phòng.
- Whisper cần key Groq. Filetrans cần key Alibaba.
- Chủ chưa lưu danh sách thì cách chọn giữ như trước.

## 3.21.0 · 00:01 ngày 13/11/2026

Chủ lập gói, mỗi việc một nhà và một model.

- Mỗi gói gán nhận dạng, dịch và các việc phụ.
- Mỗi việc chọn Groq hoặc Alibaba, rồi chọn một model.
- Khách chưa thấy gói. Cửa trả theo lượt vẫn nhận dạng bằng Whisper.

## 3.20.0 · 23:55 ngày 12/11/2026

Chủ lưu key Alibaba riêng, không đè key Groq.

- Trang quản lý có ô key Alibaba, tách khỏi ô key Groq.
- Chỉ thấy 4 ký tự cuối. Key đã lưu không hiện lại.
- Cửa trả theo lượt vẫn chỉ nhận dạng bằng Whisper.

## 3.19.0 · 23:44 ngày 12/11/2026

Nhận dạng Alibaba tách khỏi Whisper.

- Chọn key của bạn thì Alibaba Filetrans không còn báo chưa cập nhật.
- Cửa trả theo lượt chỉ nhận dạng bằng Whisper.
- Alibaba cần key Alibaba của bạn và link file trực tiếp.

## 3.18.0 · 22:50 ngày 12/11/2026

Chọn nhận dạng Alibaba Filetrans hoặc Whisper.

- Có thể chọn Alibaba Filetrans cho nhận dạng cả file.
- Cần key Alibaba và link file trực tiếp.
- Điều khoản cập nhật để ghi nhà cung cấp Alibaba.

## 3.14.0 · 17:21 ngày 12/11/2026

Chuẩn bị giao diện mới: có chế độ sáng, tối và đổi phông, màu, icon.

- Chủ phòng chỉnh được phông chữ, màu, icon và logo, xem trước rồi mới công bố.
- Giao diện hiện tại giữ nguyên cho đến khi Chủ công bố bản mới.

## 3.13.0 · 18:15 ngày 11/11/2026

Điều khoản mới: app báo số liệu chất lượng về cho Chủ.

- Mỗi lần nhận dạng xong, app gửi lên các con số về độ tin và đoạn lỗi.
- Không gửi phụ đề, tên tệp, video, âm thanh, key hay tài khoản.
- Cần đồng ý lại điều khoản để tiếp tục dùng.

## 3.12.1 · 12:36 ngày 11/11/2026

Tab Kiểm tra hiện thêm mức tin cậy của bản nhận dạng.

- Có đèn Tốt, Cần chú ý, Kém, kèm thanh ba màu cao, cần kiểm tra, thấp.
- Mỗi ngôn ngữ có độ tin trung bình riêng. Xuất JSON có thêm các số này.
- Nếu bật Kiểm tra ngôn ngữ, hiện số đoạn đã nhận lại và độ tin trước, sau.

## 3.12.0 · 12:16 ngày 11/11/2026

Thêm ô Kiểm tra ngôn ngữ từng đoạn, hợp phim lẫn nhiều thứ tiếng.

- Ô nằm cạnh Chỉ gửi đoạn có tiếng người, mặc định tắt.
- Đoạn nghe lệch ngôn ngữ đã chọn được nhận dạng lại một lần, chỉ đổi khi tốt hơn rõ.
- Tốn thêm lượt nhận dạng, tối đa khoảng 2 phút âm thanh mỗi lần chạy.

## 3.11.0 · 09:40 ngày 11/11/2026

Thêm nút Lưu bản Whisper: lưu chữ gốc nhận ra từ tiếng nói, chưa dịch.

- Nút nằm cạnh Xuất file Vietsub. Ra file .whisper.srt, từng câu theo giờ.
- Chữ giữ đúng như nhận dạng, không bị sửa tên nhân vật hay dịch.

## 3.10.11 · 09:15 ngày 11/11/2026

Sửa nút Quản lý biến mất sau khi bấm dịch, phải tải lại trang mới hiện.

- Nút Quản lý không còn biến mất khi mạng chậm một lúc.
- Trang Quản lý tự thử lại khi mạng chậm, không báo lỗi ngay.

## 3.10.10 · 05:20 ngày 11/11/2026

Sửa trang Tài khoản trên điện thoại bị mất đầu trang, trống giữa và cụt đáy.

- Trang Tài khoản hiện đủ các thẻ từ trên xuống, kéo xuống được tới Lịch sử Nạp/Mua gói.

## 3.10.9 · 04:58 ngày 11/11/2026

Sửa giật khi dịch phim dài, ô sửa câu nhảy câu khác, và bị đăng xuất giữa phim.

- Danh sách bản dịch không còn giật mỗi khi có câu mới, kể cả phim dài.
- Ô sửa câu giữ đúng câu đang sửa. Câu bạn sửa tay không bị bản dịch máy ghi đè.
- Đang xem phim hoặc đang dịch thì không bị đăng xuất sau 30 phút.

## 3.10.8 · 04:19 ngày 11/11/2026

Sửa lỗi đứng máy khi dịch và trang tự tải lại làm mất việc đang làm.

- Nhận dạng hoặc dịch báo lỗi thì bên còn lại dừng theo, không quay mãi nữa.
- Mạng không trả lời quá 2 phút thì báo và thử lại, không đứng im.
- Quay lại tab sau khi đi xa, trang không tự tải lại. Có bản mới thì hiện nút Tải lại.

## 3.10.7 · 03:28 ngày 11/11/2026

Sửa chữ hướng dẫn đè lên nút phát khi chưa chọn video.

- Câu «Chọn video để phát ở đây» nay nằm dưới nút phát, không còn chồng lên nhau.

## 3.10.6 · 18:10 ngày 10/11/2026

Trang quản lý lấp đầy màn hình, chia nhiều cột. Sửa thư xác minh không tới.

- Màn rộng xếp nhiều cột, máy tính bảng hai cột, điện thoại một cột.
- Tìm tài khoản và chi tiết nằm cạnh nhau, trang thuê phòng và cộng tác viên cũng xếp lưới.
- Đăng ký hoặc quên mật khẩu, thư nay được gửi xong rồi mới trả lời.

## 3.10.5 · 17:10 ngày 10/11/2026

Sửa cài đặt xem trước phụ đề bị méo video và đè lên bản dịch.

- Mở cài đặt phụ đề, video giữ đúng tỉ lệ, bảng cuộn trong khung của nó.

## 3.10.4 · 16:40 ngày 10/11/2026

Gửi thư xác minh bằng Gmail cá nhân, không cần tên miền.

- Chủ phòng chọn Email cá nhân ở mục Thư, dán mật khẩu ứng dụng Gmail là gửi được.
- Dùng cho xác minh email và quên mật khẩu, có nút gửi thư thử.

## 3.10.3 · 12:00 ngày 10/11/2026

Sửa bố cục phòng chiếu trên điện thoại nằm ngang, màn thấp và máy tính bảng.

- Điện thoại nằm ngang: video một bên, bản dịch hoặc công cụ bên kia, không còn mất bản dịch.
- Màn laptop thấp và máy tính bảng đứng: các khung không còn chồng lên nhau hay bị bóp nhỏ.
- Thiếu chỗ thì cả khung cuộn được thay vì bị cắt.

## 3.10.2 · 07:56 ngày 10/11/2026

Làm lại thẻ nạp cho thẳng hàng, có dòng chờ và lời xin lỗi.

- Nút Nạp tiền cùng hàng, cùng cỡ với Cộng tác viên và Đăng xuất.
- Dưới hai nút có dòng chờ, một hàng, có vòng xoay, chữ nhỏ lại cho vừa khung.
- Hết giờ hoặc bị từ chối thì nội dung mờ dần, hiện lời xin lỗi rồi đóng thẻ.

## 3.10.1 · 07:45 ngày 10/11/2026

Nút nạp thẳng hàng, có dòng chờ và lời xin lỗi.

- Nút Nạp tiền thẳng hàng với Cộng tác viên và Đăng xuất.
- Dưới hai nút có dòng chờ, một hàng, có vòng xoay, chữ nhỏ lại cho vừa khung.
- Hết giờ hoặc bị từ chối thì nội dung mờ dần, hiện lời xin lỗi rồi đóng thẻ.

## 3.10.0 · 07:15 ngày 10/11/2026

Thẻ nạp vừa khung điện thoại, có hủy đơn và lời cảm ơn.

- Thẻ chuyển khoản không còn tràn khỏi khung điện thoại.
- Có nút hủy đơn. Khách hủy và bị từ chối là hai trạng thái khác nhau.
- Cộng tiền xong, nội dung mờ dần, logo và lời cảm ơn hiện lên rồi đóng thẻ.

## 3.9.0 · 07:00 ngày 10/11/2026

Thẻ chuyển khoản có sao chép, đếm giờ và tự cộng tiền.

- Sao chép số tài khoản, số tiền và mã nội dung.
- Đơn còn 15 phút. Hết giờ thì đóng. Đúng mã thì tự cộng rồi đóng thẻ.
- Lịch sử: đang chờ màu cam, đã cộng màu xanh, hết hạn hoặc bị từ chối màu đỏ.

## 3.8.0 · 02:44 ngày 10/11/2026

Chọn cách dịch bằng lời thường, không cần đọc tên model.

- Bốn lối: cho nhanh, xem là hiểu, phim Trung Nhật Hàn, có hồn hơn.
- Mỗi lối ghi hợp với ai, nhanh hay chậm, và giá bằng tiền Việt.
- Một lần dịch giữ một lối. Lối xem là hiểu không gọi model nhỏ.

## 3.7.1 · 21:39 ngày 09/11/2026

Khung thư không còn tràn, xem trước nằm ngay chỗ sửa.

- Ô số nằm gọn trong khung trên điện thoại.
- Xem trước thư giữ ở trên khi kéo xuống sửa.

## 3.7.0 · 21:10 ngày 09/11/2026

Xác minh email và quên mật khẩu, làm lại từ bản ổn.

- Mặc định tắt, tài khoản cũ vẫn đăng nhập.
- Có thư xác minh, thư đặt lại mật khẩu và thư khi đổi xong.
- Sửa được nội dung, màu và kiểu thư, có xem trước.
- Đăng nhập không chờ gửi thư.

## 3.5.0 · 20:11 ngày 09/11/2026

Đã thêm chỗ gửi thư thử.

- Chủ nhập nhà gửi thư và khóa.
- Bấm gửi thử để nhận thư vào hộp thư của mình.
- Xác minh email vẫn tắt cho đến khi thư thử tới.

## 3.4.2 · 18:41 ngày 09/11/2026

Nạp tiền chỉ còn Sepay và Casso.

- Đã bỏ cổng xác nhận riêng.
- Chỉ cộng khi chuyển khoản khớp đơn đang chờ.

## 3.4.1 · 14:42 ngày 09/11/2026

Các kiểu thẻ được làm gọn để xếp nhiều thẻ.

- Thẻ nằm thành hàng, không đè tên hay số dư.
- Con dấu, góc gấp và thanh dọc không còn chiếm cả ô.
- Ô xem thử hiện hai thẻ để chọn cho đúng.

## 3.4.0 · 14:34 ngày 09/11/2026

Một tài khoản hiện đủ các thẻ, từ cao xuống thấp.

- Thứ tự là Chủ, Quản lý, Hỗ trợ, rồi Cộng tác.
- Các thẻ xếp ngang, không đè lên nhau.
- Thẻ Người dùng chỉ hiện khi không có thẻ nào khác.

## 3.3.0 · 14:16 ngày 09/11/2026

Khoản chi đã ghi có thể sửa hoặc dùng lại.

- Mỗi khoản chi hiện trong danh sách của khoảng đang xem.
- Sửa ngày, tên hoặc số tiền mà không phải gõ lại.
- Lấy một khoản cũ để ghi cho ngày mới.

## 3.2.1 · 14:13 ngày 09/11/2026

Tiền nạp Chủ xác nhận tay cũng được tính.

- Cổng chưa tự cộng, nhưng Chủ đã đối chiếu chuyển khoản thì vẫn vào sổ.

## 3.2.0 · 13:55 ngày 09/11/2026

Có số cộng tác viên, ô tìm, và thẻ Cộng tác.

- Mục Phòng hiện số cộng tác viên.
- Tìm theo tên, email hoặc mã.
- Thẻ Cộng tác cùng kiểu với Hỗ trợ, Quản lý và Chủ, có trên sơ đồ.
- Chữ Nhập file được căn giữa.

## 3.1.4 · 13:33 ngày 09/11/2026

Đã quay về bản ổn, rồi sửa chỗ cộng tác viên.

- Nút Cộng tác viên căn giữa, cạnh số dư.
- Đăng ký mới có ô mã giới thiệu.
- Trang quản lý dễ đọc hơn trên điện thoại.

## 3.1.1 · 13:10 ngày 09/11/2026

Cộng tác viên tạo đủ bảng trên bản xem trước.

- Hết báo thiếu bảng khi mở mã giới thiệu.

## 3.1.0 · 12:40 ngày 09/11/2026

Chủ nhập xuất thuật ngữ, và có chỗ xác nhận nạp riêng.

- Bộ thuật ngữ xuất ra file và nhập lại được.
- Lời lỗ đã trừ hoa hồng.
- Có chỗ dán khóa để xác nhận đơn nạp từ bên ngoài.

## 3.0.0 · 12:28 ngày 09/11/2026

Báo cáo tiền tách phần chênh, và có chương trình giới thiệu.

- Lời lỗ trừ giá vốn của lượt dùng key của phòng.
- Giới thiệu bạn bè thì được hoa hồng trên gói thuê và trên phần chênh.
- Hoa hồng mặc định hưởng cả đời, có ngày chờ trước khi rút.

## 2.23.0 · 12:19 ngày 09/11/2026

Thuật ngữ có sẵn hiện đủ, và báo khi không tải được.

- Trang quản lý hiện tên thể loại tiếng Việt và xem tiếp được các trang.
- Có thể ẩn hoặc mở mọi bộ, và khôi phục từ còn thiếu.
- Không tải được thuật ngữ thì báo rõ, không còn hiện như bộ trống.

## 2.22.0 · 11:46 ngày 09/11/2026

Thuật ngữ thể loại do phòng quản lý.

- Bộ thuật ngữ không còn mở công khai.
- Thuật ngữ bạn thêm vẫn chỉ lưu trên máy này.
- Có thể chọn gửi bản sao để phòng xem. Mặc định tắt.

## 2.21.0 · 09:33 ngày 09/11/2026

Chỉnh nghe bằng núm kéo, và đọc sớm hoặc muộn hơn phụ đề.

- Chạm thân thanh không đổi tốc độ, cao độ hay âm lượng.
- Có thể đọc thuyết minh trước hoặc sau lúc câu hiện.
- Bảng cập nhật viết ngắn, mỗi việc một dòng.

## 2.20.0 · 06:40 ngày 09/11/2026

Số dư và câu trả theo lượt dễ hiểu hơn.

- Số dư hiện khoản đang giữ cho lần chạy.
- Trả theo lượt ghi rõ tiền trừ trong ví, không trừ ngày gói.
- Số trong email thông báo hiển thị đúng.
- Mỗi yêu cầu có ô trả lời riêng.

## 2.19.2 · 20:28 ngày 08/11/2026

Tài khoản điều hành vào lại được khi chưa gửi thư.

- Email chưa xác minh không còn bị chặn khỏi trang điều hành.

## 2.19.1 · 19:13 ngày 08/11/2026

Video còn nguyên khi đổi tab.

- Sang tài khoản rồi quay lại không phải chọn lại tệp.
- Mốc thời gian không còn hiện 0:60.
- Tắt nghe ở lần đầu thì lần sau không bị bật lại.
- Hai lần trả theo lượt không dùng nhầm một phiếu.

## 2.19.0 · 18:52 ngày 08/11/2026

Câu đã sửa tay được giữ, chuyển khoản khớp tài khoản.

- File nói nhỏ không còn bị coi là im cả tệp.
- Câu đã sửa tay giữ nguyên khi đổi model.
- Từ điển tiếng Trung nhận từ một chữ.
- Chỉ cộng tiền khi đúng tài khoản nhận.

## 2.18.0 · 18:15 ngày 08/11/2026

Lượt dùng thử chỉ trừ khi đã gọi được máy dịch.

- Lỗi trước bước dịch không mất lượt dùng thử.
- Hoàn tiền không còn cộng hai lần khi bấm cùng lúc.
- Bản dịch thiếu hoặc thừa câu thì dịch lại, không lệch hàng.

## 2.17.1 · 17:20 ngày 08/11/2026

Tài khoản bị khóa vẫn xem được số dư.

- Tài khoản bị khóa vẫn gửi được yêu cầu hỗ trợ.

## 2.17.0 · 08:16 ngày 08/11/2026

Trả theo lượt giữ tiền trước, trừ số thực khi xong.

- Giữ một khoản ước tính, trừ số thực và trả phần thừa.
- Đoạn báo lỗi không tính tiền.
- Đăng ký có thể cần mở thư xác minh.

## 2.16.1 · 01:35 ngày 08/11/2026

Tài khoản bị khóa bị chặn ngay khi nạp hoặc chạy.

- Khóa hoặc cấm có hiệu lực ngay khi nạp hoặc chạy, không chỉ trên trình duyệt.

## 2.16.0 · 23:44 ngày 07/11/2026

Chuông chỉ còn việc cần xử lý.

- Thông báo chưa xem có chấm đỏ và mất chấm khi bấm.

## 2.15.0 · 22:12 ngày 07/11/2026

Số tiền hiện dấu chấm nghìn.

- Ô nhập tiền hiện dạng 100.000.
- Bấm thông báo mở đúng đơn cần xử lý.

## 2.14.0 · 21:05 ngày 07/11/2026

Lời lỗ có màu, và số dư cần mã xác nhận khi đưa về 0.

- Lời hiện xanh, lỗ hiện đỏ.
- Đưa số dư về 0 phải nhập mã 6 ký tự.

## 2.13.0 · 19:37 ngày 07/11/2026

Gói dài hiện giá đã tiết kiệm.

- Gói 7 ngày và 30 ngày hiện giá gốc gạch ngang và số đã tiết kiệm.

## 2.12.0 · 18:50 ngày 07/11/2026

Mã nạp hiện ngay trên trang.

- Mã QR được vẽ trên trang, không phụ thuộc ảnh bên ngoài.
- Có thể hủy đơn nạp khi báo chuyển nhầm.

## 2.11.0 · 18:14 ngày 07/11/2026

Nạp tiền nằm trong khung tài khoản.

- Nhập từ 10.000 đến 1.000.000 đồng.
- Tự đăng xuất sau 30 phút không dùng.

## 2.10.1 · 07:41 ngày 07/11/2026

Phiếu trả theo lượt và hạn gói nói đúng trạng thái.

- Chưa có phiếu thì ghi rõ chưa có.
- Sổ gần đây chỉ hiện vài dòng.

## 2.10.0 · 22:43 ngày 06/11/2026

Chọn trả theo lượt thì không cần nhập lại key.

- Key đã lưu được giữ sau khi tải lại trang.
- Phiếu hiện giờ, trạng thái và số tiền.

## 2.9.0 · 22:22 ngày 06/11/2026

Hai thể loại phim đổi tên cho dễ hiểu.

- Tên hiển thị thành Phim gắn nhãn 18+ và Phim thông thường.

## 2.8.0 · 22:05 ngày 06/11/2026

Có bản mới thì trang báo tải lại.

- Bảng cập nhật chỉ hiện tám lần gần nhất.
- Đang làm việc thì có thể để sau.

## 2.7.0 · 21:47 ngày 06/11/2026

Cửa trả theo lượt mặc định mở.

- Dùng key của bạn thì không hiện giá.
- Có thể đặt giá riêng cho từng model.

## 2.6.1 · 21:11 ngày 06/11/2026

Đóng cửa trả theo lượt thì vẫn dùng key của bạn.

- Khi đóng, chỉ hiện câu tạm ngưng.

## 2.6.0 · 21:04 ngày 06/11/2026

Trang điều hành xem được phiếu trả theo lượt.

- Hiện số đang giữ, số đã trừ và phiếu lỗi trong ngày.

## 2.5.2 · 20:54 ngày 06/11/2026

Menu phòng gọn thành một nút danh sách.

- Tên mục đang mở hiện cạnh nút.

## 2.5.1 · 13:12 ngày 06/11/2026

Mỗi lần cập nhật có mốc thời gian.

- Nội dung cập nhật viết bằng câu đủ ý.

## 2.5.0 · 10:02 ngày 06/11/2026

Bấm số phiên bản để xem các lần cập nhật.

- Phiên bản chưa xem được đánh dấu nhẹ.

## 2.4.2 · 01:09 ngày 06/11/2026

Nhãn menu thẳng hàng.

- Các mục menu nằm cùng một hàng.

## 2.4.1 · 00:54 ngày 06/11/2026

Chốt bảng giá thuê phòng.

- 9.000 đồng mỗi 24 giờ, 39.000 đồng mỗi 7 ngày, 99.000 đồng mỗi 30 ngày.

## 2.4.0 · 00:52 ngày 06/11/2026

Nghe và thuyết minh được bật sẵn.

- Đăng nhập có thể ghi nhớ email.
- Tài khoản được cấp quyền thấy nút điều hành.

## 2.3.0 · 00:26 ngày 06/11/2026

Video giữ đúng tỷ lệ khi xoay máy.

- Đăng ký phải nhập lại mật khẩu và thấy mức mạnh yếu.

## 2.2.0 · 00:03 ngày 06/11/2026

Ô tài khoản hiện cấp của người dùng.

- Có mười kiểu thẻ quyền để chọn.

## 2.1.0 · 23:46 ngày 05/11/2026

Từ chối yêu cầu phải có lý do.

- Yêu cầu được đóng sau khi trả lời hoặc từ chối.

## 2.0.0 · 23:18 ngày 05/11/2026

Phòng có bốn cấp xử lý yêu cầu.

- Yêu cầu quá 2 giờ được chuyển lên cấp trên.
- Có sơ đồ cấp và trang theo dõi tiền.

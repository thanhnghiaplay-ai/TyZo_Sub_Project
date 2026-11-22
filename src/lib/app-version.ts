/** Số đưa lên Vercel. Đổi số cuối khi sửa chữ, số giữa khi thêm chức năng nhỏ, số đầu khi thêm chức năng lớn. */
export const APP_VERSION = "5.42.1";

export type ReleaseNote = {
  version: string;
  time: string;
  title: string;
  points: string[];
};

/** Bảng khách thấy. Một câu tiêu đề, vài dòng việc. Không ghi việc nội bộ. */
export const CHANGELOG: ReleaseNote[] = [
  {
    version: "5.42.1",
    time: "22:06 22/11/2026",
    title: "Menu trên điện thoại đóng đúng khi bấm ra ngoài, không bấm nhầm vào Ví.",
    points: [
      "Đang mở Ví mà mở menu, bấm ra ngoài menu giờ chỉ đóng menu, không mở hộp mua Token dịch.",
      "Điều khoản ghi rõ thêm số đo tốc độ có phân biệt web và ứng dụng; bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.42.0",
    time: "21:35 22/11/2026",
    title: "Dịch trực tiếp bắt đầu nhanh hơn, không mất mấy chữ đầu, tự dừng khi im lặng lâu.",
    points: [
      "Bấm Bắt đầu là phòng chuẩn bị phiên ngay trong lúc bạn chọn tab hay cho phép micro.",
      "Tiếng nghe được lúc phiên đang mở hoặc đang nối lại được giữ lại để dịch, không bị bỏ.",
      "Không nghe thấy tiếng liền 5 phút thì phiên tự dừng, khỏi trừ Token dịch lúc im lặng.",
      "Điều khoản ghi thêm việc tự dừng và số đo tốc độ không kèm tài khoản; bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.41.0",
    time: "20:46 22/11/2026",
    title: "Phòng tự phát hiện dấu hiệu vi phạm điều khoản, mỗi trường hợp có hồ sơ bằng chứng.",
    points: [
      "Khóa hay cấm đều ghi rõ ý điều khoản và mã hồ sơ RR-…; bạn yêu cầu xem hồ sơ qua Yêu cầu xem lại.",
      "Chỉ chung địa chỉ mạng (mạng di động, mạng công ty) không bị coi là cùng một người.",
      "Điều khoản ghi thêm các dữ kiện được lưu để phát hiện vi phạm; bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.40.0",
    time: "20:16 22/11/2026",
    title: "Trang Cộng tác viên làm lại: mã QR, rút tiền về ngân hàng, lịch sử hoa hồng.",
    points: [
      "Hoa hồng tính trên phần lời của đơn mua Token dịch và thuê phòng, xem rõ ở mục Cách tính.",
      "Nhập tài khoản ngân hàng nhận tiền; xem lịch sử hoa hồng, lịch sử rút, khách đã giới thiệu.",
      "Lịch sử trong Tài khoản cuộn trong khung; mã liên kết ứng dụng có nút sao chép.",
      "Điều khoản ghi thêm cách tính hoa hồng và thông tin ngân hàng; bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.39.0",
    time: "19:23 22/11/2026",
    title: "Ứng dụng Android tự cập nhật; nút tải tệp cài luôn là bản mới nhất.",
    points: [
      "Trang Tài khoản tự hiện nút Tải tệp cài khi ứng dụng có bản phát hành mới.",
      "Ứng dụng 0.5: thấy bản mới thì bấm Cập nhật ngay, máy tự tải và mở màn cài.",
    ],
  },
  {
    version: "5.38.1",
    time: "16:01 22/11/2026",
    title: "Dịch trực tiếp bằng Qwen 3.5 ra chữ sớm hơn.",
    points: [
      "Qwen 3.5 chốt câu sau nửa giây im lặng thay vì một giây, chữ dịch hiện sớm hơn.",
      "Hướng dẫn ghi rõ độ trễ của từng model và cách để chữ ra nhanh nhất.",
    ],
  },
  {
    version: "5.38.0",
    time: "13:04 22/11/2026",
    title: "Ứng dụng Android 0.4: cùng logo, màu và chức năng Dịch trực tiếp với web.",
    points: [
      "Ứng dụng có Từ cần giữ đúng, Tùy chỉnh chữ (cỡ, số dòng, chữ gốc, nền đậm) như web.",
      "Phiên gần nhất lưu trên điện thoại, tải SRT, VTT, TXT hoặc gửi sang ứng dụng khác.",
      "Đổi mật khẩu thì máy đã liên kết phải liên kết lại; máy bỏ không 90 ngày cũng vậy.",
      "Điều khoản ghi thêm phần ứng dụng lưu trên điện thoại; bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.37.1",
    time: "12:35 22/11/2026",
    title: "Hướng dẫn ứng dụng Android; mã liên kết đếm từng giây.",
    points: [
      "Trang Hướng dẫn có mục Ứng dụng Android: cài, liên kết, cho phép hiện phụ đề, dùng và gỡ máy.",
      "Mã liên kết đếm ngược từng giây; app nối xong thì trang báo tên máy vừa liên kết.",
      "Ứng dụng bản 0.3 có các bước dùng ngay trên màn hình và nút mở hướng dẫn trên web.",
    ],
  },
  {
    version: "5.37.0",
    time: "12:06 22/11/2026",
    title: "Ứng dụng Android: phụ đề dịch nổi trên video ở Bilibili, YouTube, TikTok.",
    points: [
      "Trang Tài khoản có mục Ứng dụng Android: lấy mã liên kết, xem và gỡ máy đã liên kết.",
      "Nghe tiếng video đang phát rồi hiện phụ đề nổi, trừ Token dịch như Dịch trực tiếp.",
      "Điều khoản ghi thêm phần ứng dụng Android; bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.36.0",
    time: "11:08 22/11/2026",
    title: "Dịch trực tiếp: phụ đề nổi trên video, chữ lớn, giữ đúng tên nhân vật.",
    points: [
      "Phụ đề nổi: khung chữ dịch luôn nằm trên video ở tab khác (Chrome, Edge máy tính).",
      "Chữ lớn toàn màn hình cho điện thoại, có nút Bắt đầu, Dừng; chỉnh cỡ chữ, số dòng, chữ gốc.",
      "Ô Từ cần giữ đúng cho tên nhân vật, thuật ngữ. Tải lại trang vẫn tải được phụ đề phiên trước.",
      "Điều khoản ghi thêm việc lưu chữ phiên trước trên máy; bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.35.2",
    time: "09:59 22/11/2026",
    title: "Lưu được key ElevenLabs có giới hạn quyền.",
    points: [
      "Key ElevenLabs không có quyền đọc danh sách model vẫn lưu được, vì app không cần quyền đó.",
      "Key thiếu quyền khi nhận dạng hay đọc giọng thì báo đúng tên quyền cần bật.",
    ],
  },
  {
    version: "5.35.1",
    time: "08:31 22/11/2026",
    title: "Thông báo lỗi gọn trên điện thoại; lỗi key rõ ràng hơn.",
    points: [
      "Thông báo dài tự xuống dòng, không tràn ra ngoài màn hình, hiện lâu hơn để kịp đọc.",
      "Key sai báo bằng tiếng Việt theo từng nhà, kèm trang lấy key, không hiện mã lỗi thô.",
      "Key ElevenLabs dán thiếu hay thừa ký tự được báo ngay khi lưu.",
    ],
  },
  {
    version: "5.35.0",
    time: "05:53 22/11/2026",
    title: "Thuyết minh bằng giọng ElevenLabs, đọc được tiếng Việt.",
    points: [
      "Ở mục Thuyết minh, chọn ElevenLabs rồi chọn giọng nam hoặc nữ theo danh sách giọng của key.",
      "Trả theo lượt trừ Token dịch theo số chữ đọc. Thuê phòng dùng key ElevenLabs của bạn.",
      "Nhận dạng ElevenLabs xong thì bản nhận dạng được xóa ở ElevenLabs.",
    ],
  },
  {
    version: "5.34.0",
    time: "03:59 22/11/2026",
    title: "Thêm nhà nhận dạng giọng ElevenLabs (Scribe v3, Scribe v2).",
    points: [
      "Chọn ElevenLabs Scribe ở ô Nhận dạng giọng, dán link file https trực tiếp.",
      "Dùng được ở cả Thuê phòng (key ElevenLabs của bạn) và Trả theo lượt.",
      "Điều khoản mục Dữ liệu ghi ElevenLabs nhận lời thoại; bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.33.0",
    time: "21:19 21/11/2026",
    title: "Tải lại trang không mất phụ đề đã làm; điều khoản cập nhật.",
    points: [
      "Chọn lại đúng tệp đã làm, app hỏi khôi phục: không phải nhận dạng lại, dịch nốt phần còn thiếu.",
      "Lưu trên máy bạn tối đa 5 tệp gần nhất; bấm Làm lại là xóa bản lưu của tệp đó.",
      "Điều khoản mục Dữ liệu ghi việc lưu này và đổi cách gọi người phụ trách web; bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.32.4",
    time: "20:24 21/11/2026",
    title: "Trả theo lượt: trang chủ cho thấy gói đang dùng và số Token dịch video này cần.",
    points: [
      "Dưới dòng trả theo lượt có tên gói đang dùng và số Token dịch video này cần giữ.",
      "Bấm Đổi gói hoặc Chọn gói là mở đúng chỗ chọn gói.",
    ],
  },
  {
    version: "5.32.3",
    time: "20:21 21/11/2026",
    title: "Bấm Tải và dịch mà chưa chạy được thì lý do hiện ngay dưới nút.",
    points: [
      "Câu báo vì sao chưa chạy (key sai, thiếu gói…) hiện đỏ dưới nút chính, không biến mất vội.",
      "Đổi tệp, link hay cách trả thì câu báo cũ tự ẩn.",
    ],
  },
  {
    version: "5.32.2",
    time: "20:16 21/11/2026",
    title: "Lần đầu vào bớt bị hỏi dồn dập.",
    points: [
      "Hướng dẫn nhanh không tự bật lên; trang chủ có dòng mời Xem hoặc Ẩn.",
      "Mỗi lúc chỉ một câu hỏi: chọn cách trả, rồi câu hỏi lần đầu, rồi mới mời xem hướng dẫn.",
    ],
  },
  {
    version: "5.32.1",
    time: "20:11 21/11/2026",
    title: "Lượt dịch đang chạy được giữ kỹ hơn trên điện thoại.",
    points: [
      "Đang chạy có dòng nhắc giữ trang mở; màn hình được giữ sáng.",
      "Lỡ tay đóng hay tải lại trang lúc đang chạy, trình duyệt hỏi lại trước.",
      "Quay lại từ ứng dụng khác, app nhắc bấm Tiếp tục nếu tiến độ đứng yên.",
    ],
  },
  {
    version: "5.32.0",
    time: "19:44 21/11/2026",
    title: "Trang quản lý tính đúng hơn chi phí dịch vụ của phòng.",
    points: [
      "Chi phí mỗi lần dịch được ghi đúng lúc chạy, theo từng dịch vụ đã dùng.",
    ],
  },
  {
    version: "5.31.3",
    time: "19:07 21/11/2026",
    title: "Tiến độ nhận dạng ghi đúng nhà đang làm.",
    points: [
      "Lúc nhận dạng bằng AssemblyAI, Deepgram hay nhà khác không còn ghi nhầm «Alibaba đang nhận dạng».",
    ],
  },
  {
    version: "5.31.2",
    time: "18:53 21/11/2026",
    title: "Ước tính Token dịch theo từng phần và không hiện sai lúc đang chạy.",
    points: [
      "Ước tính ghi riêng phần nhận dạng và phần dịch, giữ lần lượt, xong phần nào trả phần thừa phần đó.",
      "Đang chạy thì không hiện «cần giữ, thiếu…» nữa; nhận dạng xong thì chỉ tính phần dịch.",
      "Phần dịch giữ dư hơn để không hụt giữa chừng; phần thừa vẫn trả lại khi xong.",
    ],
  },
  {
    version: "5.31.1",
    time: "18:09 21/11/2026",
    title: "Mua Token dịch là dùng được trả theo lượt và xuất file phụ đề, không cần thuê phòng.",
    points: [
      "Trả theo lượt chạy được khi còn Token dịch, kể cả chưa từng thuê phòng.",
      "Còn Token dịch thì xuất được file phụ đề như khi còn gói thuê phòng.",
      "Chưa chọn gói mà bấm Tải và dịch: app mở đúng chỗ chọn gói.",
    ],
  },
  {
    version: "5.31.0",
    time: "17:29 21/11/2026",
    title: "Trang tài khoản có lịch sử đầy đủ: tệp đã dịch, thời lượng, model, Token dịch.",
    points: [
      "Lượt dịch: tên tệp, dài bao lâu, model nào, Token dịch đã giữ, đã trừ, đã trả lại và trạng thái.",
      "Lượt dùng key của bạn cũng có trong lịch sử, ghi trên máy này.",
      "Mua và gói: từng gói Token dịch còn bao nhiêu, hạn đến bao giờ; các lần mua và thuê phòng.",
      "Nút Xem lịch sử ngay dưới tên tài khoản.",
    ],
  },
  {
    version: "5.30.3",
    time: "17:21 21/11/2026",
    title: "Tắt bàn phím ảo thì thanh dưới và tab Ví về đúng chỗ.",
    points: [
      "Tắt bàn phím bằng nút quay lại: thanh dưới hiện lại, tab không lộ khoảng trống.",
    ],
  },
  {
    version: "5.30.2",
    time: "17:04 21/11/2026",
    title: "Web vừa lên bản mới thì trang tự tải lại, không đứng ở màn lỗi.",
    points: [
      "Trang đang mở từ bản cũ tự tải lại một lần để lấy bản mới.",
      "Màn lỗi có nút Tải lại trang.",
    ],
  },
  {
    version: "5.30.1",
    time: "16:45 21/11/2026",
    title: "Dễ tìm trang tài khoản và lịch sử giao dịch.",
    points: [
      "Menu trái, nhóm Ví và gói, có mục Tài khoản và lịch sử, ở mọi trang.",
      "Khối lịch sử giao dịch luôn hiện, kể cả khi chưa có giao dịch nào.",
      "Hướng dẫn chỉ đúng tên mục trên menu.",
    ],
  },
  {
    version: "5.30.0",
    time: "16:33 21/11/2026",
    title: "Trả theo lượt giữ Token dịch theo từng phần: nhận dạng trước, dịch sau.",
    points: [
      "Bắt đầu chỉ giữ Token dịch cho phần nhận dạng; phần dịch giữ khi bắt đầu dịch.",
      "Lúc chờ bạn xem bảng nhân vật không giữ gì; phần nhận dạng đã trừ số thực và trả phần thừa.",
      "Dịch lại bằng model khác hay làm nốt chỉ giữ phần dịch, không giữ lại phần nhận dạng.",
      "Thiếu Token dịch khi sang phần dịch: phần nhận dạng vẫn giữ, mua thêm rồi bấm Tiếp tục.",
    ],
  },
  {
    version: "5.29.0",
    time: "16:26 21/11/2026",
    title: "Giọng văn trau chuốt của từng thể loại được phòng tinh chỉnh dần.",
    points: [
      "Mỗi thể loại có lời dặn giọng văn riêng khi trau chuốt, phòng sửa được mà không cần chờ bản mới.",
      "Luật giữ nghĩa câu và giữ thuật ngữ vẫn cố định.",
    ],
  },
  {
    version: "5.28.0",
    time: "16:15 21/11/2026",
    title: "Trau chuốt viết lại tự nhiên hơn, và nhận thêm yêu cầu của bạn.",
    points: [
      "Trau chuốt được phép đổi cách nói cho giống lời thoại thật, vẫn giữ nghĩa và độ dài câu.",
      "Có ô Yêu cầu thêm, ví dụ: văn kiếm hiệp, xưng huynh đệ, bớt trang trọng. App nhớ cho lần sau.",
      "Trau chuốt xem thêm nhiều câu phía trước để giữ đúng xưng hô trong cảnh.",
    ],
  },
  {
    version: "5.27.1",
    time: "16:10 21/11/2026",
    title: "Câu báo dùng cách gọi mới cho người phụ trách web.",
    points: [
      "Các câu như «chưa mở model này» không còn ghi «Chủ», dùng cách gọi chung mới.",
    ],
  },
  {
    version: "5.27.0",
    time: "16:06 21/11/2026",
    title: "Nhận dạng xong, bước cuối của tab có nút Dịch tiếp; dừng lượt luôn hỏi lại.",
    points: [
      "Đang chờ xem bảng nhân vật: bước cuối có nút Dịch tiếp, bấm là tab tự đóng và dịch luôn.",
      "Bấm Hủy khi đang chạy thì app hỏi lại trước khi dừng, tránh lỡ tay mất phần nhận dạng.",
      "Thanh tiến độ ghi đang chờ bạn, câu giá ghi đã giữ Token dịch khi lượt đang chạy.",
      "Hộp Làm lại nói rõ trừ thêm Token dịch; muốn đổi model dịch thì dùng Dịch lại.",
    ],
  },
  {
    version: "5.26.0",
    time: "13:52 21/11/2026",
    title: "Đổi mật khẩu trong trang tài khoản cũng có thư báo.",
    points: [
      "Đổi mật khẩu xong, bạn nhận thư «Mật khẩu đã đổi» như khi đặt lại qua thư.",
      "Nhập sai mật khẩu cũ thì không có thư.",
    ],
  },
  {
    version: "5.25.0",
    time: "13:44 21/11/2026",
    title: "Điều khoản mới: đếm ẩn danh lựa chọn để phục vụ bạn tốt hơn.",
    points: [
      "Khi bạn trả lời câu hỏi lần đầu hoặc chọn cách trả, phòng chỉ cộng một vào số lần của lựa chọn đó.",
      "Lần đếm không kèm tài khoản, email, mã máy hay địa chỉ mạng.",
      "Điều khoản cập nhật ở mục Dữ liệu đi những đâu; bạn sẽ được hỏi đồng ý lại một lần.",
    ],
  },
  {
    version: "5.24.0",
    time: "13:37 21/11/2026",
    title: "Lần đầu vào, app hỏi bạn dùng để làm gì để đặt sẵn lựa chọn hợp.",
    points: [
      "Chọn Xem phim bộ, Làm phụ đề, Học ngoại ngữ hoặc Việc khác; bấm Bỏ qua cũng được.",
      "Học ngoại ngữ: Thuyết minh tắt sẵn để nghe giọng gốc; bật lại ở tab Thuyết minh.",
      "Chỉ hỏi một lần trên máy này.",
    ],
  },
  {
    version: "5.23.0",
    time: "13:28 21/11/2026",
    title: "Nút chính trang chủ chỉ đúng bước còn thiếu; thanh dưới còn 4 nút có chữ.",
    points: [
      "Chưa có key, gói hết hạn hay hết Token dịch: nút chính thành Thêm key, Gia hạn hoặc Mua thêm.",
      "Dưới nút có một dòng nói vì sao chưa dịch được: chưa chọn tệp, mất mạng hay đang bảo trì.",
      "Thanh dưới điện thoại: Trang chủ, Công cụ, Ví, Menu, nút nào cũng có chữ.",
      "Dịch trực tiếp mở từ ô đầu trang chủ hoặc trong Menu.",
    ],
  },
  {
    version: "5.22.0",
    time: "21/11/2026",
    title: "Thêm key gọn hơn; Ví chia rõ Thuê phòng và Token dịch.",
    points: [
      "Cài đặt dịch: bấm Thêm key, chọn nhà rồi dán. Mỗi key ghi việc làm được và đã hợp lệ chưa.",
      "Key Groq được nhớ ngay khi dán; xóa key là xóa hẳn khỏi máy.",
      "Ví: khối Thuê phòng và khối Token dịch tách riêng; cách bạn đang dùng đứng trước.",
      "Gửi yêu cầu hỗ trợ nằm cuối Ví.",
    ],
  },
  {
    version: "5.21.0",
    time: "21/11/2026",
    title: "Trang chủ rõ cách trả; đầu trang gọn với một nút Hiển thị.",
    points: [
      "Lần đầu: chọn dùng key AI của bạn hoặc trả theo lượt bằng Token dịch. Web nhớ cho lần sau.",
      "Đầu trang báo đúng gói, dùng thử, key đã thêm, Token dịch còn hay hết, kèm bước tiếp theo.",
      "Chưa có key: lấy key theo hướng dẫn, thêm key, hoặc dùng Token dịch cho lần này.",
      "Sáng tối, khoảng cách, cỡ chữ, hiệu ứng và màu gom vào nút Hiển thị, có chữ rõ.",
    ],
  },
  {
    version: "5.20.1",
    time: "21/11/2026",
    title: "Điện thoại: khung không còn lệch ở đầu trang và quanh thanh dưới.",
    points: [
      "Hàng nút đầu trang xuống dòng khi màn hẹp, nút chuông không còn bị cắt.",
      "Phần cuộn xuống mờ dần trước thanh dưới, không lộ ra quanh mép thanh.",
    ],
  },
  {
    version: "5.20.0",
    time: "21/11/2026",
    title: "TyZo Sub là công cụ phụ đề AI theo yêu cầu; xác nhận quyền với nội dung mỗi tệp.",
    points: [
      "Trước lần xử lý đầu của mỗi tệp, bạn xác nhận có quyền với nội dung. Chỉ hỏi một lần cho mỗi tệp.",
      "Ba loại nội dung người lớn gộp thành «Phim có nhãn 18+»; bỏ loại «phim mới chiếu».",
      "Tab Phim đổi tên thành Video; chữ trên web theo cách gọi của công cụ AI.",
      "Điều khoản bổ sung quy trình khiếu nại bản quyền và những việc không được làm.",
    ],
  },
  {
    version: "5.19.0",
    time: "20/11/2026",
    title: "Dịch bằng nhiều nhà: Groq và Alibaba (Qwen), cả trả theo lượt lẫn key riêng.",
    points: [
      "Model dịch của Alibaba (Qwen Plus, Max, Turbo) chọn được như model Groq, có nhãn nhà.",
      "Tự động chỉ chọn model của nhà bạn có key, hoặc phòng đang mở khi trả bằng Token dịch.",
      "Model phòng chưa có thì app báo tên model ngay, trước khi giữ Token dịch.",
      "Điều khoản bổ sung nơi chữ thoại được gửi để dịch.",
    ],
  },
  {
    version: "5.18.2",
    time: "20/11/2026",
    title: "Điện thoại: tắt hiệu ứng không còn dải trống che góc dưới.",
    points: [
      "Trang chính chạy xuống tận đáy màn hình, không bị cắt ngang phía trên thanh dưới.",
      "Cuộn hết trang vẫn thấy đủ nút, không bị thanh dưới đè.",
    ],
  },
  {
    version: "5.18.1",
    time: "20/11/2026",
    title: "Điện thoại không còn bị thanh dưới và nhãn công cụ đè chữ.",
    points: [
      "Nhãn công cụ vàng không đè Bản dịch, nút Sửa hay thanh tua của video.",
      "Trong Ví, dòng nói về gói dùng thử không đè nút Ngày, Tuần, Tháng.",
      "Thanh mục đứng trên phần đang xem, không đè tiêu đề khi cuộn.",
      "Thẻ một khách gập thêm Ghi chú, Bảo mật và Quyền.",
    ],
  },
  {
    version: "5.18.0",
    time: "20/11/2026",
    title: "Đọc file có phần trăm. Thuyết minh không đọc vào chỗ im.",
    points: [
      "Lúc đọc âm thanh, thanh tiến độ hiện phần trăm ước và số giây, không còn đứng ở 0%.",
      "Ô ngôn ngữ nguồn có thêm «Tự động» khi chưa chắc phim nói tiếng gì.",
      "Dịch xong có thể trau chuốt, hoặc dịch lại bằng model khác mà không nhận dạng lại.",
      "Thuyết minh bỏ khoảng im giữa các từ, và không đổi sang giọng máy khi giọng đã chọn lỗi.",
    ],
  },
  {
    version: "5.17.7",
    time: "20/11/2026",
    title: "Báo khi nhận dạng ra quá ít chữ so với độ dài video.",
    points: [
      "Video từ 20 giây mà chữ nhận ra quá thưa sẽ có thêm dòng nhắc là có thể đã sót lời.",
      "Bạn có thể thử model nhận dạng khác hoặc chạy lại để so sánh. Bản dịch không đổi.",
    ],
  },
  {
    version: "5.17.6",
    time: "20/11/2026",
    title: "Nhận dạng giọng nói không còn bỏ sót lời ở phim thường.",
    points: [
      "Sửa lỗi nhận dạng chỉ chép được vài câu trong video có thoại liên tục và nhạc nền.",
      "Phim thể loại người lớn vẫn giữ bước lọc tiếng thở, tiếng rên như trước.",
    ],
  },
  {
    version: "5.17.5",
    time: "20/11/2026",
    title: "Thoại tiếng Trung, Nhật, Hàn được tách thành từng câu kỹ hơn.",
    points: [
      "Đoạn thoại chứa nhiều câu ngắn nay được tách thành từng câu, thay vì gộp thành vài dòng.",
      "Câu đơn vẫn giữ nguyên một dòng; chỉ tách ở dấu câu hoặc khi dòng quá dài.",
    ],
  },
  {
    version: "5.17.4",
    time: "20/11/2026",
    title: "Nhận dạng giọng nói tách đủ từng câu khi lời thoại nói liền không nghỉ.",
    points: [
      "Trước đây thoại liền mạch dễ bị gộp thành vài dòng rất dài; nay tách lại thành từng câu.",
      "Mỗi câu có mốc thời gian riêng, nên phụ đề và thuyết minh khớp với tiếng hơn.",
      "Câu ngắn và câu đã đủ gọn vẫn giữ nguyên như trước.",
    ],
  },
  {
    version: "5.17.3",
    time: "20/11/2026",
    title: "Giá thuê phòng nay có thể thay đổi, và luôn hiện đúng giá đang bán.",
    points: [
      "Trang Gói, Tài khoản, điều khoản và hướng dẫn đều hiện đúng giá đang bán, kể cả giá gạch.",
      "Số tiền tiết kiệm tự tính theo giá gạch và giá bán, không còn số cố định.",
      "Đơn đã tạo vẫn thu đúng giá lúc bạn đặt, dù giá đổi sau đó.",
    ],
  },
  {
    version: "5.17.2",
    time: "20/11/2026",
    title: "Thuyết minh đọc đúng lúc hơn, bớt trễ so với tiếng gốc.",
    points: [
      "App đo độ trễ thật của từng loại giọng và bắt đầu đọc sớm đúng bằng độ trễ đó.",
      "Các câu kế tiếp được tạo tiếng trước, nên câu sau gần như có tiếng ngay khi tới lượt.",
      "Câu dài hơn khoảng thoại thì đọc nhanh vừa phải; ô «Đọc trước / sau phụ đề» vẫn chỉnh tay được.",
    ],
  },
  {
    version: "5.17.1",
    time: "20/11/2026",
    title: "Gọn lại chỗ chọn cách trả và bỏ khung ước tính chiếm chỗ.",
    points: [
      "«Trả bằng» ở tab Phim chỉ báo trạng thái; muốn đổi bấm nút Đổi riêng bên cạnh.",
      "Giải thích Key của tôi nay đúng cho mọi nhà bạn đã nhập key, không riêng Groq.",
      "Bỏ khung giữ Token dịch ở màn chính; chỉ báo khi số dư không đủ.",
    ],
  },
  {
    version: "5.17.0",
    time: "20/11/2026",
    title: "Các tab thành một chuỗi bước, có nút Tiếp tục luôn nằm trên đầu.",
    points: [
      "Thứ tự: Cài đặt dịch, Phim, Ngữ cảnh, Thuyết minh, Tải và dịch. Cuộn xuống vẫn thấy Tiếp tục.",
      "Bước cuối là Tải và dịch: nút Tiếp tục đổi thành chạy dịch luôn.",
      "Cách trả và ước tính Token dịch dời xuống bước cuối. Ô dán key vẫn ở bước đầu.",
    ],
  },
  {
    version: "5.16.2",
    time: "20/11/2026",
    title: "Số model dùng được nay là tổng của tất cả key bạn nhập.",
    points: [
      "Bấm đồng bộ model thì app cộng model của mọi key, kèm số theo từng nhà (Groq, Alibaba...).",
      "Trả theo lượt: số model là tổng của các key mà phòng đã lưu.",
    ],
  },
  {
    version: "5.16.1",
    time: "20/11/2026",
    title: "Tab công cụ tự đóng khi bắt đầu dịch, và không còn che phần hướng dẫn.",
    points: [
      "Bấm Tải và dịch thì tab Phim tự đóng, thấy ngay video và tiến độ, không cần bấm X.",
      "Phần hướng dẫn «Chỉ tôi» tự mở hoặc đóng tab công cụ đúng lúc nên không bị che chỗ cần chỉ.",
    ],
  },
  {
    version: "5.16.0",
    time: "20/11/2026",
    title: "Thêm nút chọn cỡ chữ: Vừa, Lớn, Rất lớn.",
    points: [
      "Nút «Aa» cạnh nút sáng/tối ở đầu trang; bấm để đổi qua ba cỡ chữ.",
      "Lựa chọn được nhớ trên máy của bạn, không bị nháy khi mở lại trang.",
    ],
  },
  {
    version: "5.15.0",
    time: "20/11/2026",
    title: "Nhân vật, Thuật ngữ và Ghi chú phim gom vào một tab Ngữ cảnh.",
    points: [
      "Tab Ngữ cảnh có ba nhánh chuyển nhanh: Nhân vật, Thuật ngữ, Ghi chú phim.",
      "Nút vàng giữa thanh dưới còn 4 công cụ: Phim, Ngữ cảnh, Thuyết minh, Kiểm tra.",
      "Menu vẫn có lối tắt Thuật ngữ; bảng thuật ngữ riêng cho phim nằm cùng chỗ với thuật ngữ thể loại.",
    ],
  },
  {
    version: "5.14.0",
    time: "20/11/2026",
    title: "Tab Phim gọn hơn: chỉ còn việc chính, phần ít dùng gập lại.",
    points: [
      "Video và link ở ngay trên; nút Tải và dịch luôn dính đáy tab.",
      "Âm thanh riêng và cách xử lý file lớn gom vào mục «Tùy chọn thêm»; chọn âm thanh rồi thì mục tự mở.",
    ],
  },
  {
    version: "5.13.0",
    time: "20/11/2026",
    title: "Cách trả chuyển sang mục Cài đặt dịch trong Menu; nút vàng gọn còn 5 công cụ.",
    points: [
      "Cách trả và ô dán key nằm ở Menu, mục Cài đặt dịch; bấm dòng «Trả bằng» ở tab Phim cũng mở được.",
      "Nút vàng giữa thanh dưới chỉ lướt qua Phim, Nhân vật, Thuật ngữ, Thuyết minh, Kiểm tra.",
      "Model dịch, nhận dạng giọng, số luồng và các ô tùy chọn gom vào mục «Nâng cao» đóng sẵn.",
    ],
  },
  {
    version: "5.12.0",
    time: "20/11/2026",
    title: "Ghi chú dài gom vào nút (i) cho gọn màn hình.",
    points: [
      "Chữ giải thích ở Cách trả, Nhận dạng, Phân tích phim và Thuyết minh nay nằm trong nút (i).",
      "Máy tính rê chuột vào (i), điện thoại bấm vào (i) để đọc; bấm ra ngoài thì đóng.",
      "Lỗi và cảnh báo vẫn hiện sẵn, không bị giấu.",
    ],
  },
  {
    version: "5.11.0",
    time: "19/11/2026",
    title: "Thêm ô Yêu cầu thêm cho bản dịch để chỉnh giọng văn.",
    points: [
      "Ở Ngữ cảnh phim, ghi thêm yêu cầu như dịch trang trọng hơn hoặc xưng hô thân mật, tối đa 300 ký tự.",
      "Dùng cho cả dịch và Trau chuốt bản dịch; chỉ đổi giọng văn, không làm hỏng phụ đề.",
    ],
  },
  {
    version: "5.10.1",
    time: "19/11/2026",
    title: "Câu chỉ có tiếng đệm như «okay okay» không còn bị báo chưa dịch.",
    points: ["Các tiếng đệm giữ nguyên như okay, haha, wow không bị đánh dấu lỗi và không bị dịch lại."],
  },
  {
    version: "5.10.0",
    time: "19/11/2026",
    title: "Thêm nút Trau chuốt bản dịch, xem so sánh rồi mới chọn dùng.",
    points: [
      "Bấm Trau chuốt bản dịch để model sửa lại câu cho đúng giọng thể loại.",
      "Hiện giá Token dịch trước, bạn đồng ý mới chạy; không đồng ý thì không trừ gì.",
      "Xem bản cũ cạnh bản mới, dùng từng câu hoặc tất cả, quay lại bản cũ bất cứ lúc nào.",
      "Câu bạn đã sửa tay được giữ nguyên.",
    ],
  },
  {
    version: "5.9.1",
    time: "19/11/2026",
    title: "Ô chọn ngôn ngữ và thể loại dùng hộp của web, có khu 18+ riêng.",
    points: [
      "Các ô chọn mở hộp của web thay cho danh sách của điện thoại.",
      "Thể loại có khu 18+ nổi bật ở trên, chọn mức Thấp, Vừa hoặc Cao.",
      "Chọn mức 18+ vẫn hỏi xác nhận trên 18 tuổi.",
    ],
  },
  {
    version: "5.9.0",
    time: "19/11/2026",
    title: "Thể loại 18+ phải xác nhận đủ 18 tuổi mới chọn được.",
    points: [
      "Phim gắn nhãn 18+, Phim cấp 3 và Phim thoại kín hiện hộp xác nhận trên 18 tuổi khi chọn.",
      "Phim 18+ dịch nhẹ hơn Phim thoại kín; mỗi loại có bộ thuật ngữ riêng, không lẫn.",
    ],
  },
  {
    version: "5.8.0",
    time: "19/11/2026",
    title: "Thêm 9 thể loại phim mới để dịch sát giọng phim hơn.",
    points: [
      "Thêm Kiếm hiệp, Tiên hiệp, Ngôn tình, Phim cấp 3, Tâm lý xã hội.",
      "Thêm Chiến tranh, Gia đình, Học đường / thanh xuân, Tài liệu / phóng sự.",
      "Mỗi thể loại dặn cách xưng hô và giọng văn riêng khi dịch.",
    ],
  },
  {
    version: "5.7.0",
    time: "19/11/2026",
    title: "Bố cục mới trên điện thoại: nút vàng lướt chọn công cụ.",
    points: [
      "Kéo nút vàng giữa thanh dưới để lướt qua Phim, Nhân vật, Thuật ngữ, Thuyết minh, Kiểm tra, Cách trả.",
      "Bấm nút vàng mở tab công cụ cao khoảng 80% màn hình; Ví mở cùng kiểu.",
      "Tải và dịch nằm sát đáy tab Phim; vòng quanh nút vàng chạy theo tiến độ dịch.",
    ],
  },
  {
    version: "5.6.1",
    time: "22:23 ngày 18/11/2026",
    title: "Giải thích nhà nhận dạng ngắn hơn.",
    points: [
      "Dưới ô Nhận dạng giọng chỉ còn một đoạn, không lặp năm lần.",
      "Đoạn nói rõ link tải thẳng, hoặc tệp trên máy khi kho tạm bật.",
    ],
  },
  {
    version: "5.6.0",
    time: "18/11/2026",
    title: "Tự chọn màu, số dư ở đầu trang và giao diện Tương lai.",
    points: [
      "Nút Màu ở đầu trang cho bạn tự chọn màu nhấn bằng thanh kéo hoặc mã màu, được nhớ trên máy.",
      "Số dư Token dịch nằm ngay đầu trang chủ; trên máy tính, ô thả video cạnh bảng Bản dịch.",
      "Giao diện Tương lai (lưới mờ, kính mờ, vòng thả video sáng) là mặc định; có nút tắt hiệu ứng.",
    ],
  },
  {
    version: "5.5.0",
    time: "18/11/2026",
    title: "Thêm nhà nhận dạng giọng Soniox.",
    points: ["Chọn Soniox Async ở ô Nhận dạng giọng, dán link file trực tiếp.", "Dùng được ở cả Thuê phòng (key của bạn) và Trả theo lượt."],
  },
  {
    version: "5.4.0",
    time: "18/11/2026",
    title: "Thêm nhà nhận dạng giọng Speechmatics.",
    points: ["Chọn Speechmatics Standard hoặc Enhanced ở ô Nhận dạng giọng, dán link file trực tiếp.", "Dùng được ở cả Thuê phòng (key của bạn, đúng vùng tài khoản) và Trả theo lượt."],
  },
  {
    version: "5.3.0",
    time: "18/11/2026",
    title: "Thêm nhà nhận dạng giọng AssemblyAI.",
    points: ["Chọn Universal-3.5 Pro hoặc Universal-2 ở ô Nhận dạng giọng, dán link file trực tiếp.", "Dùng được ở cả Thuê phòng (key của bạn) và Trả theo lượt."],
  },
  {
    version: "5.2.3",
    time: "17/11/2026",
    title: "Giọng đọc Orpheus theo danh sách Chủ mở khi thuê phòng.",
    points: ["Giọng Orpheus chưa được mở thì app tự đọc bằng giọng khác và báo cho bạn biết."],
  },
  {
    version: "5.2.2",
    time: "17/11/2026",
    title: "Chọn được Alibaba và Deepgram ở cửa Trả theo lượt.",
    points: ["Ô Nhận dạng giọng hiện số Token dịch của từng model, không còn ghi nhầm là chưa có.", "Dịch trực tiếp báo rõ khi Chủ chưa mở model nào."],
  },
  {
    version: "5.2.1",
    time: "17/11/2026",
    title: "Giá model ở cửa Trả theo lượt tính bằng Token dịch.",
    points: ["Mỗi model hiện số Token dịch cần dùng, quy từ giá gốc, không còn giá đồng cộng thêm."],
  },
  {
    version: "5.2.0",
    time: "17/11/2026",
    title: "Thuê phòng hiện đủ ô key của mọi nhà.",
    points: ["Khi thuê phòng, bạn thấy ô key của Groq, Alibaba và Deepgram, nhập nhà nào dùng nhà đó.", "Mục Hướng dẫn «Lấy key» và Chỉ tôi nay nói chung cho cả ba nhà."],
  },
  {
    version: "5.1.3",
    time: "17/11/2026",
    title: "Ghi chú việc của từng model hiện đúng hơn.",
    points: ["Model nhận dạng và giọng đọc Deepgram không còn bị ghi nhầm là model dịch.", "Model dịch trực tiếp có ghi chú riêng."],
  },
  {
    version: "5.1.2",
    time: "17/11/2026",
    title: "Nhận dạng Deepgram dùng được cả hai cửa.",
    points: ["Cửa Trả theo lượt chạy Deepgram bằng key của phòng, tính theo thời lượng thực của tệp.", "Cửa Thuê phòng vẫn dùng key Deepgram của bạn."],
  },
  {
    version: "5.1.1",
    time: "17/11/2026",
    title: "Giá Deepgram tự cập nhật theo trang chính thức.",
    points: ["Giá nhận dạng và giọng đọc Deepgram tự lấy từ trang giá của Deepgram, bỏ giá khuyến mãi cũ.", "Nova-3 tính theo 0,0048 đô mỗi phút."],
  },
  {
    version: "5.1.0",
    time: "10:50 ngày 17/11/2026",
    title: "Thêm Deepgram: nhận dạng Nova-3 và giọng đọc Aura.",
    points: [
      "Nhận dạng Deepgram Nova-3 cho phim Anh, Trung, Nhật, Hàn, dùng key Deepgram của bạn.",
      "Giọng đọc Aura cho tiếng Anh và Tây Ban Nha, trừ Token dịch giống Orpheus.",
      "Điều khoản cập nhật: dữ liệu gửi Deepgram. Cần đồng ý lại khi vào.",
    ],
  },
  {
    version: "5.0.6",
    time: "02:45 ngày 17/11/2026",
    title: "Cách trả nằm trong Key Sub.",
    points: [
      "Chọn Key của tôi hoặc Trả theo lượt ngay trong Key Sub.",
      "Nâng cao không còn mục Gói dịch.",
      "Gói trả theo lượt đọc cùng thời lượng với thẻ Token dịch.",
    ],
  },
  {
    version: "5.0.5",
    time: "02:20 ngày 17/11/2026",
    title: "Mã QR nổi giữa màn hình.",
    points: [
      "Mã QR mua gói hiện giữa màn hình, không nằm ở góc.",
      "Tiền về thì hiện lời cảm ơn giữa màn hình.",
      "Đơn đóng hoặc hủy thì hiện lời xin lỗi giữa màn hình.",
    ],
  },
  {
    version: "5.0.4",
    time: "02:05 ngày 17/11/2026",
    title: "Chữ tiền khớp cách trả.",
    points: [
      "Đơn Token dịch ghi đã cộng Token dịch, không ghi đã cộng tiền.",
      "Trả theo lượt nói trừ Token dịch, không nói trừ trong ví.",
      "Không còn chỗ đặt số dư. Số dư cũ chỉ được gỡ về 0.",
    ],
  },
  {
    version: "5.0.3",
    time: "01:45 ngày 17/11/2026",
    title: "Xóa số liệu thử cho bản sạch.",
    points: [
      "Một nút xóa Token dịch, đơn, phiếu, chuông và gói thuê thử.",
      "Lượt thử về lại 1. Tài khoản, cấu hình và key giữ nguyên.",
      "Việc này không hoàn tiền.",
    ],
  },
  {
    version: "5.0.2",
    time: "01:10 ngày 17/11/2026",
    title: "Tiền về thì được Token dịch.",
    points: [
      "Đơn mua Token dịch đã trả mà chưa vào tài khoản thì được cộng khi mở Tài khoản.",
      "Chuyển khoản đúng số thì được Token dịch, không vào số dư.",
      "Thẻ Token dịch ở phòng dịch cũng cập nhật sau khi mua.",
    ],
  },
  {
    version: "5.0.1",
    time: "00:35 ngày 17/11/2026",
    title: "Điều khoản nói rõ quyền, dữ liệu và cách trả.",
    points: [
      "Token dịch là đơn vị dùng dịch vụ, không phải tiền và không chuyển được.",
      "Tiếng và chữ cần dịch được gửi tới nhà bạn chọn. Video xử lý trên máy bạn.",
      "Có cách báo nội dung không có quyền. Phòng tạm dừng xử lý nội dung đó.",
      "Mua gói và thuê phòng vẫn chuyển khoản đúng số, không giữ số dư.",
    ],
  },
  {
    version: "5.0.0",
    time: "23:55 ngày 16/11/2026",
    title: "Mua gói bằng mã QR, không giữ số dư.",
    points: [
      "Bấm mua Token dịch thì hiện mã QR. Chuyển khoản đúng số thì được gói.",
      "Thuê phòng cũng chuyển khoản theo mã, không giữ số dư.",
      "Orpheus khi dùng key của phòng trừ Token dịch. Giọng Neural vẫn miễn phí.",
      "Không còn chỗ nạp số dư.",
    ],
  },
  {
    version: "4.1.1",
    time: "22:55 ngày 16/11/2026",
    title: "Hướng dẫn khớp cách trừ gói giây.",
    points: [
      "Hướng dẫn nói rõ trả theo lượt và dịch trực tiếp cùng trừ gói giây.",
      "Thuyết minh khi dùng key của phòng vẫn trừ số dư đồng.",
      "Chỗ chọn Trả theo lượt không còn nói giữ tiền ví.",
    ],
  },
  {
    version: "4.1.0",
    time: "22:12 ngày 16/11/2026",
    title: "Dịch trực tiếp trừ gói giây.",
    points: [
      "Dịch trực tiếp trừ gói giây đã mua, không giữ số dư cho phiên.",
      "Hết giây thì phiên dừng. Mua thêm gói ở trang Số dư.",
      "Thuê phòng giữ giá tay như cũ.",
      "Giá model theo bảng niêm yết, không còn giá riêng từng model.",
    ],
  },
  {
    version: "4.0.0",
    time: "21:50 ngày 16/11/2026",
    title: "Cửa trả theo lượt trừ gói giây, không giữ ví.",
    points: [
      "Mua gói giây ở Số dư. Gói có hạn. Hết hạn thì phần còn lại mất, không hoàn tiền.",
      "Lần chạy giữ số giây ước tính, xong trừ số thực. Phần thừa trả lại nếu gói còn hạn.",
      "Giá gói mới có thể đổi. Gói đã mua giữ nguyên số giây đến hết hạn.",
      "Thuê phòng và nạp ví vẫn như cũ. Dịch trực tiếp vẫn trừ ví.",
    ],
  },
  {
    version: "3.47.13",
    time: "12:20 ngày 16/11/2026",
    title: "Huy hiệu, bóng chữ và màn hướng dẫn theo giao diện.",
    points: [
      "Viền huy hiệu, bóng chữ bảo trì và màn tối hướng dẫn theo thanh đang có.",
      "Mức mặc định không đổi hình. Nút tròn và màu phụ đề khách chọn vẫn giữ.",
    ],
  },
  {
    version: "3.47.12",
    time: "12:13 ngày 16/11/2026",
    title: "Xem trước cả trang và hoàn tác.",
    points: [
      "Khi đang chỉnh, trang đổi ngay, không cần tải lại.",
      "Có nút hoàn tác một bước. Khách chỉ thấy sau khi công bố.",
    ],
  },
  {
    version: "3.47.11",
    time: "12:06 ngày 16/11/2026",
    title: "Biểu tượng chia theo nhóm.",
    points: [
      "Điều hướng, hành động, trạng thái và giao diện có thể chọn nét riêng.",
      "Mặc định mỗi nhóm theo nét chung, nên hình không đổi.",
    ],
  },
  {
    version: "3.47.10",
    time: "11:59 ngày 16/11/2026",
    title: "Chia giao diện thành sáu phần.",
    points: [
      "Màu, chữ, hình khối, biểu tượng, chuyển động và trang riêng nằm mỗi phần một chỗ.",
      "Xem trước và các nút lưu vẫn ở trên. Không đổi giá trị mặc định.",
    ],
  },
  {
    version: "3.47.9",
    time: "11:51 ngày 16/11/2026",
    title: "Chỉnh biển trang bảo trì.",
    points: [
      "Đổi được chữ trên biển, màu biển, hiệu ứng mạnh, và robot hay chỉ biển.",
      "Mặc định vẫn «BẢO TRÌ», màu lỗi, có robot và hiệu ứng mạnh.",
    ],
  },
  {
    version: "3.47.8",
    time: "11:41 ngày 16/11/2026",
    title: "Bật tắt hiệu ứng và chọn tốc độ.",
    points: [
      "Hiệu ứng có thể tắt hoặc để chậm, vừa, nhanh. Mặc định vẫn bật và vừa.",
      "Máy đang giảm chuyển động thì hiệu ứng luôn tắt.",
    ],
  },
  {
    version: "3.47.7",
    time: "11:29 ngày 16/11/2026",
    title: "Độ rộng trang và vị trí menu.",
    points: [
      "Trang rộng có thể hẹp hơn. Mức 120 giữ nguyên như trước.",
      "Menu có thể sang phải. Mặc định vẫn bên trái.",
    ],
  },
  {
    version: "3.47.6",
    time: "11:02 ngày 16/11/2026",
    title: "Phông tiêu đề, độ đậm và giãn dòng.",
    points: [
      "Tiêu đề có phông riêng và độ đậm riêng. Mặc định trùng như trước.",
      "Giãn dòng nội dung chỉnh được. Mức 1.5 giữ nguyên.",
    ],
  },
  {
    version: "3.47.5",
    time: "10:50 ngày 16/11/2026",
    title: "Kiểu nút và tám bộ màu.",
    points: [
      "Nút đang tô màu nhấn có thể đặc, chỉ viền hoặc mờ. Đặc giữ nguyên.",
      "Có tám bộ màu. Bộ Vàng là màu đang dùng.",
    ],
  },
  {
    version: "3.47.4",
    time: "10:41 ngày 16/11/2026",
    title: "Chọn độ dày viền khung.",
    points: [
      "Viền thẻ, nút và ô nhập có thể dày 1, 2 hoặc 3 px.",
      "Mức 1 giữ nguyên như trước. Viền huy hiệu không đổi.",
    ],
  },
  {
    version: "3.47.3",
    time: "10:32 ngày 16/11/2026",
    title: "Chọn cỡ icon và màu icon.",
    points: [
      "Icon có ba cỡ: nhỏ, vừa, lớn. Mức vừa giữ nguyên như trước.",
      "Màu icon theo chữ, hoặc theo màu nhấn.",
    ],
  },
  {
    version: "3.47.2",
    time: "10:23 ngày 16/11/2026",
    title: "Tìm icon và đặt lại từng chỗ.",
    points: [
      "Có ô tìm chức năng, ô tìm hình, và bấm vào hình để chọn.",
      "Nút đặt lại từng chỗ đưa về hình sẵn. Hình sẵn không đổi.",
    ],
  },
  {
    version: "3.47.1",
    time: "10:15 ngày 16/11/2026",
    title: "Quầng sáng cũng theo mức bóng.",
    points: [
      "Quầng sáng màu và khung tóm tắt phiên bản đổi theo mức bóng đang chọn.",
      "Mức 1 giữ nguyên như trước. Viền huy hiệu và bóng chữ không đổi.",
    ],
  },
  {
    version: "3.47.0",
    time: "10:08 ngày 16/11/2026",
    title: "Thêm mức độ đậm của bóng nổi.",
    points: [
      "Hộp thoại, menu và banner nổi đổi theo mức bóng đang chọn.",
      "Mức 1 giữ nguyên như trước. Kéo về 0 thì những bóng đó tắt.",
    ],
  },
  {
    version: "3.46.18",
    time: "09:50 ngày 16/11/2026",
    title: "Các nút còn lại lấy icon trong giao diện.",
    points: [
      "Phòng chiếu, dịch trực tiếp, trang chủ, sáng tối và tải phụ đề dùng icon đang chọn.",
      "Có thêm chỗ cho video, âm thanh, vòng chạy, bảo trì, micro và loa.",
    ],
  },
  {
    version: "3.46.17",
    time: "09:37 ngày 16/11/2026",
    title: "Nút tải lên, dán link và khóa theo icon giao diện.",
    points: [
      "Ô chọn tệp và ô dán link dùng icon Tải lên và Dán link.",
      "Nút đổi sang khóa của tôi dùng icon Khóa API.",
    ],
  },
  {
    version: "3.46.16",
    time: "09:29 ngày 16/11/2026",
    title: "Nút chép, lưu và trang lỗi theo icon giao diện.",
    points: [
      "Nút sao chép và nút lưu câu dùng icon Sao chép và Thành công.",
      "Nút hủy dùng icon Đóng. Trang khi có lỗi dùng icon Lỗi.",
    ],
  },
  {
    version: "3.46.15",
    time: "09:21 ngày 16/11/2026",
    title: "Icon ví theo giao diện.",
    points: [
      "Icon ví ở trang chủ, thẻ tiền và dịch trực tiếp lấy icon chỗ Ví.",
      "Đổi icon Ví trong giao diện thì ba chỗ này đổi theo.",
    ],
  },
  {
    version: "3.46.14",
    time: "08:40 ngày 16/11/2026",
    title: "Nút xem hoặc ẩn khóa theo icon giao diện.",
    points: [
      "Nút hiện và ẩn khóa lấy icon đang chọn trong giao diện.",
      "Đổi icon chỗ Xem hoặc Ẩn thì các ô khóa đổi theo.",
    ],
  },
  {
    version: "3.46.13",
    time: "08:33 ngày 16/11/2026",
    title: "Ô nhập và ô thả video theo thanh bo góc.",
    points: [
      "Ô nhập, ảnh nhỏ và cột biểu đồ bo theo mức ô nhập.",
      "Ô thả video bo theo mức thẻ. Nút tròn giữ nguyên.",
    ],
  },
  {
    version: "3.46.12",
    time: "08:26 ngày 16/11/2026",
    title: "Khung thẻ và mục menu theo thanh bo góc.",
    points: [
      "Khung thẻ trong trang cũng bo theo mức đang chọn.",
      "Mục trong menu theo mức của ô nhập. Nút tròn giữ nguyên.",
    ],
  },
  {
    version: "3.46.11",
    time: "08:18 ngày 16/11/2026",
    title: "Góc thẻ và ô nhập theo thanh bo góc.",
    points: [
      "Góc cỡ thẻ và cỡ ô nhập đổi theo mức bo đang chọn.",
      "Nút tròn và góc nhỏ hơn giữ nguyên.",
    ],
  },
  {
    version: "3.46.10",
    time: "08:11 ngày 16/11/2026",
    title: "Thư và cửa sổ đăng nhập theo màu gốc.",
    points: [
      "Thư chưa tự chọn màu dùng nền, chữ và nút của giao diện sáng.",
      "Cửa sổ đăng nhập chớp qua dùng nền và chữ phụ của giao diện tối.",
    ],
  },
  {
    version: "3.46.9",
    time: "08:04 ngày 16/11/2026",
    title: "Nền trang bảo trì theo màu giao diện.",
    points: [
      "Nền, lời nhắn và nút cuối trang đổi theo màu nền và màu chữ đang chọn.",
      "Lúc chữ nhấp, bóng dùng màu thông tin và màu lỗi.",
    ],
  },
  {
    version: "3.46.8",
    time: "07:55 ngày 16/11/2026",
    title: "Robot bảo trì theo màu giao diện.",
    points: [
      "Thân, mắt và biển của robot đổi theo màu chữ, màu thông tin và màu lỗi.",
      "Đèn trên mũ nhấp theo màu lỗi đang chọn.",
    ],
  },
  {
    version: "3.46.7",
    time: "07:47 ngày 16/11/2026",
    title: "Logo, thanh mật khẩu và huy hiệu cấp theo giao diện.",
    points: [
      "Nền logo và vạch mật khẩu chưa bật đổi theo màu thẻ và màu viền.",
      "Huy hiệu hỗ trợ, quản lý và chủ đổi theo màu của cấp đó.",
    ],
  },
  {
    version: "3.46.6",
    time: "07:41 ngày 16/11/2026",
    title: "Trang lỗi viết bằng tiếng Việt.",
    points: ["Khi trang bị lỗi, tiêu đề và lời nhắn dự phòng hiện bằng tiếng Việt."],
  },
  {
    version: "3.46.5",
    time: "07:28 ngày 16/11/2026",
    title: "Nhãn đơn nạp và trang lỗi theo màu giao diện.",
    points: [
      "Đã cộng, đang chờ, hết hạn và đã hủy đổi theo màu thành công, chờ và lỗi.",
      "Nút hủy đơn và trang khi có lỗi cũng dùng màu đó.",
    ],
  },
  {
    version: "3.46.4",
    time: "07:21 ngày 16/11/2026",
    title: "Đèn chất lượng và đường tiền theo màu giao diện.",
    points: [
      "Mức tốt, cần chú ý và kém đổi theo màu thành công, chờ và lỗi.",
      "Đường tiền thu và chi trên biểu đồ cũng theo hai màu đó.",
    ],
  },
  {
    version: "3.46.3",
    time: "07:12 ngày 16/11/2026",
    title: "Trang bảo trì dùng màu cảnh báo của giao diện.",
    points: [
      "Dải cảnh báo, tiêu đề, đèn và tia lửa đổi theo màu chờ đang chọn.",
      "Áo, sọc và viền biển theo màu chờ. Mũ robot theo màu nhấn.",
    ],
  },
  {
    version: "3.46.2",
    time: "06:58 ngày 16/11/2026",
    title: "Thông báo và chấm trạng thái theo màu giao diện.",
    points: [
      "Thông báo, dải mất mạng và nút đăng xuất đổi theo màu đang chọn.",
      "Chấm mở hoặc đóng, ô thuê, ô khóa và chữ trên nhãn cấp cũng theo màu đó.",
    ],
  },
  {
    version: "3.46.1",
    time: "05:58 ngày 16/11/2026",
    title: "Chủ web xem thử được trang bảo trì trước khi bật.",
    points: ["Có nút xem trước ngay ở phần cài đặt bảo trì, đóng bằng nút hoặc phím Esc."],
  },
  {
    version: "3.46.0",
    time: "19:56 ngày 15/11/2026",
    title: "Trang bảo trì mới: công nhân robot cắm biển ngay dưới logo.",
    points: [
      "Lúc bảo trì, robot mang biển «BẢO TRÌ» vào, cắm xuống rồi tiêu đề và lời nhắn hiện ra.",
      "Tiêu đề và lời nhắn của trang do chủ web tự viết, kèm giờ dự kiến mở lại.",
    ],
  },
  {
    version: "3.45.1",
    time: "18:13 ngày 15/11/2026",
    title: "Các ô hỏi lại trước khi xóa hay đăng xuất nay cùng giao diện với web.",
    points: [
      "Thay các hộp mặc định của trình duyệt bằng hộp của web, dùng được bằng phím Esc và Tab.",
      "Việc khó hoàn tác có nút đỏ, và nút Hủy được chọn sẵn để tránh bấm nhầm.",
    ],
  },
  {
    version: "3.45.0",
    time: "17:57 ngày 15/11/2026",
    title: "Khi cần nâng cấp, cả web có thể tạm bảo trì.",
    points: [
      "Lúc bảo trì, mọi trang hiện lời nhắn và giờ dự kiến mở lại.",
      "Việc đang chạy vẫn chạy nốt. Số dư và lịch sử của bạn được giữ nguyên.",
    ],
  },
  {
    version: "3.44.1",
    time: "10:54 ngày 15/11/2026",
    title: "Sửa dòng trạng thái đầu trang khi Dịch bình thường đang bảo trì.",
    points: [
      "Đang bảo trì thì dòng đầu trang không còn báo «Sẵn sàng», nói rõ chưa bắt đầu dịch được.",
      "Vẫn chọn được tệp trước; nút bắt đầu mở lại khi nhóm hoạt động.",
    ],
  },
  {
    version: "3.44.0",
    time: "10:15 ngày 15/11/2026",
    title: "Tách Dịch trực tiếp và Dịch bình thường, mỗi nhóm có trạng thái Hoạt động hoặc Bảo trì.",
    points: [
      "Trang chủ và trang Dịch trực tiếp có hai nhóm đứng cạnh nhau, kèm chấm trạng thái.",
      "Nhóm đang bảo trì hiện lời nhắn và giờ dự kiến mở lại, nút bắt đầu bị khóa.",
      "Lượt đang chạy vẫn chạy nốt, không bị cắt giữa chừng.",
    ],
  },
  {
    version: "3.43.3",
    time: "09:17 ngày 15/11/2026",
    title: "Sửa khung tóm tắt cập nhật bị lệch.",
    points: [
      "Khung hiện đúng vị trí, nằm gọn trong màn hình điện thoại lẫn máy tính.",
      "Các bản cập nhật cách nhau bằng đường kẻ, dễ đọc hơn.",
    ],
  },
  {
    version: "3.43.2",
    time: "09:10 ng\u00e0y 15/11/2026",
    title: "Sửa khung thông báo bị lệch và bắt buộc có tài khoản mới vào phòng dịch.",
    points: [
      "Khung thông báo trên điện thoại nằm gọn trong màn hình, không tràn ra mép.",
      "Chưa đăng nhập thì được đưa sang trang đăng nhập, không vào thẳng phòng dịch.",
      "Phiên đăng nhập hết hạn giữa chừng cũng được đưa về trang đăng nhập.",
    ],
  },
  {
    version: "3.43.1",
    time: "04:15 ngày 15/11/2026",
    title: "Sửa lỗi không cuộn được ở Dịch trực tiếp, Hướng dẫn, Cộng tác viên và Tải video.",
    points: [
      "Các trang này giờ cuộn xuống được hết, kể cả phần chữ chạy và nút tải phụ đề.",
    ],
  },
  {
    version: "3.43.0",
    time: "02:40 ngày 15/11/2026",
    title: "Điều khoản cập nhật: ghi rõ ai xem được tên tệp trong phiếu trả theo lượt.",
    points: [
      "Nhân viên của phòng chỉ thấy tên tệp đã che; chỉ Chủ xem được tên đầy đủ.",
      "Mỗi lần Chủ xem tên đầy đủ đều được ghi vào nhật ký thao tác.",
      "Bạn cần đọc và đồng ý lại điều khoản mới khi vào phòng.",
    ],
  },
  {
    version: "3.42.0",
    time: "02:10 ngày 15/11/2026",
    title: "Có mũi tên quay lại ở đầu trang, và điều khoản gọn lại còn ba chỗ.",
    points: [
      "Mũi tên ở đầu Hướng dẫn, Dịch trực tiếp, Tài khoản, Thuê phòng, Tải video, Điều khoản.",
      "Bấm mũi tên về trang vừa xem; mở thẳng link thì về trang chủ.",
      "Trong Số dư, mũi tên về màn vừa xem.",
      "Liên kết Điều khoản chỉ còn ở ô tích đăng ký, menu trái và Tài khoản.",
    ],
  },
  {
    version: "3.41.0",
    time: "01:35 ngày 15/11/2026",
    title: "Điều khoản gom về một chỗ: tích đồng ý khi đăng ký, đọc lại bất cứ lúc nào.",
    points: [
      "Đăng ký hoặc đăng nhập chỉ cần tích một ô «Tôi đồng ý Điều khoản và Chính sách».",
      "Không còn màn điều khoản chen giữa lúc vào phòng dịch.",
      "Đọc lại ở trang Điều khoản và Chính sách, có liên kết ở menu trái, Tài khoản và Hướng dẫn.",
    ],
  },
  {
    version: "3.40.0",
    time: "00:52 ngày 15/11/2026",
    title: "Hướng dẫn «Chỉ tôi» làm tối nền, chỉ sáng đúng chỗ cần bấm.",
    points: [
      "Mọi mục trong trang Hướng dẫn đều có nút «Chỉ tôi» chạy ngay trên màn hình thật.",
      "Nền tối mờ, chỗ cần bấm sáng lên kèm một câu ngắn, rồi sang bước kế.",
      "Điện thoại tự mở menu trái khi cần chỉ vào mục trong menu.",
    ],
  },
  {
    version: "3.39.0",
    time: "00:23 ngày 15/11/2026",
    title: "Có trang Hướng dẫn: tìm nhanh cách dùng, nạp tiền, lấy key và cách liên hệ hỗ trợ.",
    points: [
      "Mở Hướng dẫn ở menu trái, hoặc bấm Ctrl+K rồi gõ «hướng dẫn».",
      "Có ô tìm kiếm, câu hỏi thường gặp và cách liên hệ hỗ trợ của phòng.",
      "Bấm «Chỉ tôi» ở mục Bắt đầu nhanh để được chỉ từng bước ngay trên màn hình thật.",
      "Mục mật khẩu tự đổi theo việc phòng đã gửi được thư đặt lại hay chưa.",
    ],
  },
  {
    version: "3.38.0",
    time: "23:55 ngày 14/11/2026",
    title: "Có màn hình Dịch trực tiếp: nghe và dịch ngay khi đang nói.",
    points: [
      "Chọn ngôn ngữ nói và ngôn ngữ dịch, bấm Bắt đầu để thu từ micro hoặc từ một tab trình duyệt.",
      "Chữ gốc và chữ dịch chạy theo thời gian thực, có tiếng dịch nếu bạn bật.",
      "Thấy số dư, còn khoảng bao nhiêu phút, và cảnh báo khi sắp hết tiền.",
      "Tải phụ đề SRT, VTT hoặc TXT của buổi vừa dịch.",
    ],
  },
  {
    version: "3.37.0",
    time: "23:20 ngày 14/11/2026",
    title: "Chạy tốt hơn trên điện thoại, máy tính bảng và máy tính.",
    points: [
      "Điện thoại: chữ gợi ý đổi thành Chạm để chọn video, không nhắc phím tắt.",
      "Đang dịch thì màn hình không tự tắt (máy nào hỗ trợ).",
      "Toàn màn hình chạy cả trên iPhone; nút Xoay chỉ hiện ở máy khóa được hướng.",
    ],
  },
  {
    version: "3.36.0",
    time: "22:40 ngày 14/11/2026",
    title: "Trang chủ thoáng hơn, chữ lớn hơn, kéo thả có hiệu ứng.",
    points: [
      "Ô thả và các lựa chọn thoáng hơn; tiêu đề, ô link và nút Tải và dịch chữ lớn hơn.",
      "Kéo tệp vào trang thì ô thả nhấp nháy; kéo vào ô thì phóng nhẹ và sáng viền.",
      "Thả tệp ngoài ô cũng nhận được. Bật giảm chuyển động thì không còn hiệu ứng.",
    ],
  },
  {
    version: "3.35.0",
    time: "22:10 ngày 14/11/2026",
    title: "Thuật ngữ và Gói dịch có mục riêng trong menu trái, tab Key và Phim gọn lại.",
    points: [
      "Menu trái có nhóm Nâng cao với hai mục: Gói dịch và Thuật ngữ.",
      "Tab Key chỉ còn ô key; chọn cách trả và gói dịch ở mục Gói dịch.",
      "Tab Phim chỉ còn ngôn ngữ, thể loại, tệp và nút chạy; sửa thuật ngữ ở mục Thuật ngữ.",
    ],
  },
  {
    version: "3.34.0",
    time: "21:30 ngày 14/11/2026",
    title: "Thấy số dư còn được bao nhiêu phút, ước tính trước khi chạy, nạp nhanh tại chỗ.",
    points: [
      "Chọn Trả theo lượt thì hiện số dư kèm Còn khoảng bao nhiêu phút.",
      "Chọn video xong thấy ước tính tiền cho video đó và số tiền phòng giữ trước khi chạy.",
      "Ví thiếu thì báo rõ thiếu bao nhiêu, có nút Nạp nhanh ngay tại trang chủ.",
    ],
  },
  {
    version: "3.33.0",
    time: "20:50 ngày 14/11/2026",
    title: "Tiến trình chạy liền một thanh, sửa câu ngay tại dòng, tải phụ đề SRT, VTT hoặc TXT.",
    points: [
      "Thanh tiến trình chạy liền một mạch, có vạch ngăn bốn bước và phần trăm tổng.",
      "Bấm Sửa thì ô sửa mở ngay tại dòng đó, không còn hộp trượt từ dưới lên.",
      "Nút Tải phụ đề mở menu chọn SRT, WebVTT hoặc chữ thuần TXT.",
      "Bấm một dòng bản dịch vẫn nhảy video tới đúng câu đó.",
    ],
  },
  {
    version: "3.32.0",
    time: "20:20 ngày 14/11/2026",
    title: "Trang chủ gọn lại thành một ô thả lớn, dán link là tự chạy, Ctrl+K mở lệnh nhanh.",
    points: [
      "Chưa có video thì trang chủ chỉ còn một ô thả lớn, một hàng chip và nút Tải và dịch.",
      "Dán link video ở bất cứ đâu trên trang, app nhận link và tự bắt đầu dịch.",
      "Bấm Ctrl+K (Cmd+K trên Mac) rồi gõ việc muốn làm: chọn video, tải file, nạp tiền.",
      "Menu trái có mục Trang chủ để quay về ô thả bất cứ lúc nào.",
    ],
  },
  {
    version: "3.31.2",
    time: "19:30 ngày 14/11/2026",
    title: "Menu ba gạch bên trái gom các chức năng; Đăng xuất nằm cuối menu.",
    points: [
      "Bấm nút ba gạch để mở menu trái. Chức năng lớn gập các mục nhỏ bên trong.",
      "Nút Đăng xuất nằm cuối menu, có hỏi lại một lần trước khi thoát.",
      "Các tab quản lý xếp thẻ có viền, cao bằng nhau. Key và giá gọn hơn.",
      "Phần soạn thư và danh sách icon dài được gập lại.",
    ],
  },

  {
    version: "3.31.1",
    time: "11:40 ngày 14/11/2026",
    title: "Các tab quản lý xếp đều như nhau, phần key và giá gom sang tab Cấu hình.",
    points: [
      "Mọi tab xếp thẻ theo lưới đều, cao bằng nhau, không còn cột dài cột ngắn.",
      "Tab Cấu hình mới gom key Groq, key Alibaba, giá, gói dịch, model thuê phòng và cổng nạp.",
      "Các danh sách dài được gập lại, bấm vào mới mở.",
    ],
  },
  {
    version: "3.31.0",
    time: "10:20 ngày 14/11/2026",
    title: "Trang quản lý có thanh bên trái, tìm nhanh bằng Ctrl+K và biểu đồ thu chi.",
    points: [
      "Màn rộng có thanh bên trái để chuyển mục. Điện thoại giữ hàng nút phía trên, dính khi cuộn.",
      "Bấm Ctrl+K (hoặc nút Tìm) rồi gõ tên mục hay email khách để nhảy tới ngay.",
      "Có thêm biểu đồ đường thu và chi, tiền nạp mỗi khách, tỷ lệ dùng thử rồi mua và chi phí theo loại.",
    ],
  },
  {
    version: "3.30.0",
    time: "10:03 ngày 14/11/2026",
    title: "Trang quản lý có màn Tổng quan để theo dõi và xử lý nhanh hơn.",
    points: [
      "Chủ phòng và nhân viên thấy ngay số lượt chạy, lỗi, đơn nạp đang chờ và các cảnh báo.",
      "Danh sách phiếu lọc được theo trạng thái và tìm được theo email hoặc tên tệp.",
    ],
  },
  {
    version: "3.29.4",
    time: "09:15 ngày 14/11/2026",
    title: "Báo lỗi rõ hơn khi đăng nhập, mất mạng, nhập link và chọn model.",
    points: [
      "Đăng nhập sai nói rõ email hoặc mật khẩu chưa đúng. Nút Đăng nhập khóa hẳn và quay khi đang xử lý.",
      "Mất mạng thì hiện banner đỏ phía trên và các nút hành động tạm khóa.",
      "Dán link không phải file video trực tiếp sẽ được nhắc ngay. Chưa có phụ đề thì nút xuất file khóa.",
      "Model mà key chưa mở thì mờ đi, có nhãn Key chưa mở và không chọn được.",
    ],
  },
  {
    version: "3.29.3",
    time: "07:22 ngày 14/11/2026",
    title: "Báo rõ khi file có loại âm thanh không đọc được, kèm cách đổi.",
    points: [
      "File MKV, AVI hay âm thanh AC3/DTS mà trình duyệt không đọc được nay được nhận ra và nói rõ.",
      "Lỗi ghi sẵn lệnh đổi sang M4A với đúng tên file của bạn, chỉ cần chép và chạy.",
      "File chỉ hỏng hoặc tải dở thì báo là hỏng, không đổ lỗi cho loại âm thanh.",
    ],
  },
  {
    version: "3.29.2",
    time: "07:19 ngày 14/11/2026",
    title: "Dịch không còn treo mãi khi Groq trả dữ liệu dở dang.",
    points: [
      "Nếu Groq gửi dữ liệu nửa chừng rồi đứng im, app tự dừng sau 2 phút và thử lại.",
      "Lần thử lại không làm mất phần đã nhận dạng hay đã dịch.",
      "Báo lỗi rõ ràng bằng tiếng Việt thay vì quay mãi không có kết quả.",
    ],
  },
  {
    version: "3.29.1",
    time: "07:00 ngày 14/11/2026",
    title: "Nút sáng/tối luôn hiện, chế độ gọn không còn làm lệch bố cục.",
    points: [
      "Nút sáng/tối ở đầu trang nay luôn hiện. Bạn chọn gì, máy nhớ cho lần mở sau.",
      "Chế độ gọn không còn làm hẹp ô tìm kiếm hay lệch khung trên màn hình rộng.",
      "Thanh trình duyệt đổi màu theo giao diện sáng hoặc tối ngay khi mở trang.",
    ],
  },
  {
    version: "3.29.0",
    time: "05:46 ngày 14/11/2026",
    title: "Chuyển sáng/tối, chọn giao diện gọn hoặc thoải mái, kiểm tra key trước khi dịch.",
    points: [
      "Hai nút nhỏ ở đầu trang: đổi sáng/tối và gọn/thoải mái. Máy nhớ lựa chọn của bạn.",
      "Dán key Groq xong, app tự kiểm tra key, hạn mức và model đã chọn có dùng được không.",
      "Key sai hoặc thiếu model thì báo ngay, không tốn lượt thử.",
    ],
  },
  {
    version: "3.28.0",
    time: "05:07 ngày 14/11/2026",
    title: "Kéo thả video, tiến trình theo từng bước, hướng dẫn lần đầu.",
    points: [
      "Kéo thả video vào khung phát, có ảnh xem trước, tên tệp và thời lượng.",
      "Thanh tiến trình chia bước: cắt, nhận dạng, dịch, sửa lại.",
      "Lần đầu vào có hướng dẫn 4 bước. Bấm nút dấu hỏi để xem lại.",
    ],
  },
  {
    version: "3.27.0",
    time: "04:34 ngày 14/11/2026",
    title: "Thuật ngữ nền tự bật theo ngôn ngữ nguồn.",
    points: [
      "Chọn một thể loại thì app tự thêm bộ thuật ngữ nền của ngôn ngữ nguồn.",
      "Có ô để tắt nếu bạn chỉ muốn dùng bộ của thể loại đã chọn.",
      "Thể loại 18+ vẫn dùng bộ riêng, không kèm bộ nền.",
    ],
  },
  {
    version: "3.26.0",
    time: "04:25 ngày 14/11/2026",
    title: "Đăng nhập dán được cả email, cách trả rõ hơn.",
    points: [
      "Ô email nhận địa chỉ dán nguyên, không bắt gõ tên rồi chọn gợi ý.",
      "Hai cách trả Key của tôi và Trả theo lượt có ghi chú ngay bên dưới.",
      "Rê chuột vào từng cách trả để xem tiền được tính thế nào.",
    ],
  },
  {
    version: "3.25.0",
    time: "01:38 ngày 13/11/2026",
    title: "Trả theo lượt nhận dạng bằng Alibaba.",
    points: [
      "Gói nhận dạng Alibaba dùng key của phòng.",
      "Cần link file trực tiếp, không phải trang xem.",
      "Dịch vẫn bằng Groq. Việc Alibaba khác chưa chạy.",
    ],
  },
  {
    version: "3.24.1",
    time: "00:49 ngày 13/11/2026",
    title: "Trang quản lý tự mở lại sau mỗi bản cập nhật.",
    points: [
      "Sau khi cập nhật, trang tự thử lại thay vì đứng im.",
      "Quyền hiện đúng khi trang đã mở xong.",
      "Số liệu phòng tải sau, không chặn cửa vào.",
    ],
  },
  {
    version: "3.24.0",
    time: "00:25 ngày 13/11/2026",
    title: "Giá gói là số đã cộng phần vận hành.",
    points: [
      "Giá bán bằng giá nhà phát hành cộng phần trăm Chủ đặt.",
      "Bạn chỉ thấy ước tính và khoản giữ ví.",
      "Không hiện giá gốc và không hiện phần trăm.",
    ],
  },
  {
    version: "3.23.0",
    time: "00:20 ngày 13/11/2026",
    title: "Trả theo lượt chọn gói Chủ đã mở.",
    points: [
      "Có gói thì nhận dạng và dịch theo gói đó.",
      "Lần chạy dùng key của phòng. Bạn không nhập key.",
      "Chưa có gói thì cửa vẫn nhận dạng bằng Whisper.",
    ],
  },
  {
    version: "3.22.0",
    time: "00:10 ngày 13/11/2026",
    title: "Thuê phòng chỉ hiện model Chủ đã mở.",
    points: [
      "Key của bạn chỉ chọn model Chủ đã mở cho thuê phòng.",
      "Whisper cần key Groq. Filetrans cần key Alibaba.",
      "Chủ chưa lưu danh sách thì cách chọn giữ như trước.",
    ],
  },
  {
    version: "3.21.0",
    time: "00:01 ngày 13/11/2026",
    title: "Chủ lập gói, mỗi việc một nhà và một model.",
    points: [
      "Mỗi gói gán nhận dạng, dịch và các việc phụ.",
      "Mỗi việc chọn Groq hoặc Alibaba, rồi chọn một model.",
      "Khách chưa thấy gói. Cửa trả theo lượt vẫn nhận dạng bằng Whisper.",
    ],
  },
  {
    version: "3.20.0",
    time: "23:55 ngày 12/11/2026",
    title: "Chủ lưu key Alibaba riêng, không đè key Groq.",
    points: [
      "Trang quản lý có ô key Alibaba, tách khỏi ô key Groq.",
      "Chỉ thấy 4 ký tự cuối. Key đã lưu không hiện lại.",
      "Cửa trả theo lượt vẫn chỉ nhận dạng bằng Whisper.",
    ],
  },
  {
    version: "3.19.0",
    time: "23:44 ngày 12/11/2026",
    title: "Nhận dạng Alibaba tách khỏi Whisper.",
    points: [
      "Chọn key của bạn thì Alibaba Filetrans không còn báo chưa cập nhật.",
      "Cửa trả theo lượt chỉ nhận dạng bằng Whisper.",
      "Alibaba cần key Alibaba của bạn và link file trực tiếp.",
    ],
  },
  {
    version: "3.18.0",
    time: "22:50 ngày 12/11/2026",
    title: "Chọn nhận dạng Alibaba Filetrans hoặc Whisper.",
    points: [
      "Có thể chọn Alibaba Filetrans cho nhận dạng cả file.",
      "Cần key Alibaba và link file trực tiếp.",
      "Điều khoản cập nhật để ghi nhà cung cấp Alibaba.",
    ],
  },
  {
    version: "3.14.0",
    time: "17:21 ngày 12/11/2026",
    title: "Chuẩn bị giao diện mới: có chế độ sáng, tối và đổi phông, màu, icon.",
    points: [
      "Chủ phòng chỉnh được phông chữ, màu, icon và logo, xem trước rồi mới công bố.",
      "Giao diện hiện tại giữ nguyên cho đến khi Chủ công bố bản mới.",
    ],
  },
  {
    version: "3.13.0",
    time: "18:15 ngày 11/11/2026",
    title: "Điều khoản mới: app báo số liệu chất lượng về cho Chủ.",
    points: [
      "Mỗi lần nhận dạng xong, app gửi lên các con số về độ tin và đoạn lỗi.",
      "Không gửi phụ đề, tên tệp, video, âm thanh, key hay tài khoản.",
      "Cần đồng ý lại điều khoản để tiếp tục dùng.",
    ],
  },
  {
    version: "3.12.1",
    time: "12:36 ngày 11/11/2026",
    title: "Tab Kiểm tra hiện thêm mức tin cậy của bản nhận dạng.",
    points: [
      "Có đèn Tốt, Cần chú ý, Kém, kèm thanh ba màu cao, cần kiểm tra, thấp.",
      "Mỗi ngôn ngữ có độ tin trung bình riêng. Xuất JSON có thêm các số này.",
      "Nếu bật Kiểm tra ngôn ngữ, hiện số đoạn đã nhận lại và độ tin trước, sau.",
    ],
  },
  {
    version: "3.12.0",
    time: "12:16 ngày 11/11/2026",
    title: "Thêm ô Kiểm tra ngôn ngữ từng đoạn, hợp phim lẫn nhiều thứ tiếng.",
    points: [
      "Ô nằm cạnh Chỉ gửi đoạn có tiếng người, mặc định tắt.",
      "Đoạn nghe lệch ngôn ngữ đã chọn được nhận dạng lại một lần, chỉ đổi khi tốt hơn rõ.",
      "Tốn thêm lượt nhận dạng, tối đa khoảng 2 phút âm thanh mỗi lần chạy.",
    ],
  },
  {
    version: "3.11.0",
    time: "09:40 ngày 11/11/2026",
    title: "Thêm nút Lưu bản Whisper: lưu chữ gốc nhận ra từ tiếng nói, chưa dịch.",
    points: [
      "Nút nằm cạnh Xuất file Vietsub. Ra file .whisper.srt, từng câu theo giờ.",
      "Chữ giữ đúng như nhận dạng, không bị sửa tên nhân vật hay dịch.",
    ],
  },
  {
    version: "3.10.11",
    time: "09:15 ngày 11/11/2026",
    title: "Sửa nút Quản lý biến mất sau khi bấm dịch, phải tải lại trang mới hiện.",
    points: [
      "Nút Quản lý không còn biến mất khi mạng chậm một lúc.",
      "Trang Quản lý tự thử lại khi mạng chậm, không báo lỗi ngay.",
    ],
  },
  {
    version: "3.10.10",
    time: "05:20 ngày 11/11/2026",
    title: "Sửa trang Tài khoản trên điện thoại bị mất đầu trang, trống giữa và cụt đáy.",
    points: [
      "Trang Tài khoản hiện đủ các thẻ từ trên xuống, kéo xuống được tới Lịch sử Nạp/Mua gói.",
    ],
  },
  {
    version: "3.10.9",
    time: "04:58 ngày 11/11/2026",
    title: "Sửa giật khi dịch phim dài, ô sửa câu nhảy câu khác, và bị đăng xuất giữa phim.",
    points: [
      "Danh sách bản dịch không còn giật mỗi khi có câu mới, kể cả phim dài.",
      "Ô sửa câu giữ đúng câu đang sửa. Câu bạn sửa tay không bị bản dịch máy ghi đè.",
      "Đang xem phim hoặc đang dịch thì không bị đăng xuất sau 30 phút.",
    ],
  },
  {
    version: "3.10.8",
    time: "04:19 ngày 11/11/2026",
    title: "Sửa lỗi đứng máy khi dịch và trang tự tải lại làm mất việc đang làm.",
    points: [
      "Nhận dạng hoặc dịch báo lỗi thì bên còn lại dừng theo, không quay mãi nữa.",
      "Mạng không trả lời quá 2 phút thì báo và thử lại, không đứng im.",
      "Quay lại tab sau khi đi xa, trang không tự tải lại. Có bản mới thì hiện nút Tải lại.",
    ],
  },
  {
    version: "3.10.7",
    time: "03:28 ngày 11/11/2026",
    title: "Sửa chữ hướng dẫn đè lên nút phát khi chưa chọn video.",
    points: [
      "Câu «Chọn video để phát ở đây» nay nằm dưới nút phát, không còn chồng lên nhau.",
    ],
  },
  {
    version: "3.10.6",
    time: "18:10 ngày 10/11/2026",
    title: "Trang quản lý lấp đầy màn hình, chia nhiều cột. Sửa thư xác minh không tới.",
    points: [
      "Màn rộng xếp nhiều cột, máy tính bảng hai cột, điện thoại một cột.",
      "Tìm tài khoản và chi tiết nằm cạnh nhau, trang thuê phòng và cộng tác viên cũng xếp lưới.",
      "Đăng ký hoặc quên mật khẩu, thư nay được gửi xong rồi mới trả lời.",
    ],
  },
  {
    version: "3.10.5",
    time: "17:10 ngày 10/11/2026",
    title: "Sửa cài đặt xem trước phụ đề bị méo video và đè lên bản dịch.",
    points: [
      "Mở cài đặt phụ đề, video giữ đúng tỉ lệ, bảng cuộn trong khung của nó.",
    ],
  },
  {
    version: "3.10.4",
    time: "16:40 ngày 10/11/2026",
    title: "Gửi thư xác minh bằng Gmail cá nhân, không cần tên miền.",
    points: [
      "Chủ phòng chọn Email cá nhân ở mục Thư, dán mật khẩu ứng dụng Gmail là gửi được.",
      "Dùng cho xác minh email và quên mật khẩu, có nút gửi thư thử.",
    ],
  },
  {
    version: "3.10.3",
    time: "12:00 ngày 10/11/2026",
    title: "Sửa bố cục phòng chiếu trên điện thoại nằm ngang, màn thấp và máy tính bảng.",
    points: [
      "Điện thoại nằm ngang: video một bên, bản dịch hoặc công cụ bên kia, không còn mất bản dịch.",
      "Màn laptop thấp và máy tính bảng đứng: các khung không còn chồng lên nhau hay bị bóp nhỏ.",
      "Thiếu chỗ thì cả khung cuộn được thay vì bị cắt.",
    ],
  },
  {
    version: "3.10.2",
    time: "07:56 ngày 10/11/2026",
    title: "Làm lại thẻ nạp cho thẳng hàng, có dòng chờ và lời xin lỗi.",
    points: [
      "Nút Nạp tiền cùng hàng, cùng cỡ với Cộng tác viên và Đăng xuất.",
      "Dưới hai nút có dòng chờ, một hàng, có vòng xoay, chữ nhỏ lại cho vừa khung.",
      "Hết giờ hoặc bị từ chối thì nội dung mờ dần, hiện lời xin lỗi rồi đóng thẻ.",
    ],
  },
  {
    version: "3.10.1",
    time: "07:45 ngày 10/11/2026",
    title: "Nút nạp thẳng hàng, có dòng chờ và lời xin lỗi.",
    points: [
      "Nút Nạp tiền thẳng hàng với Cộng tác viên và Đăng xuất.",
      "Dưới hai nút có dòng chờ, một hàng, có vòng xoay, chữ nhỏ lại cho vừa khung.",
      "Hết giờ hoặc bị từ chối thì nội dung mờ dần, hiện lời xin lỗi rồi đóng thẻ.",
    ],
  },
  {
    version: "3.10.0",
    time: "07:15 ngày 10/11/2026",
    title: "Thẻ nạp vừa khung điện thoại, có hủy đơn và lời cảm ơn.",
    points: [
      "Thẻ chuyển khoản không còn tràn khỏi khung điện thoại.",
      "Có nút hủy đơn. Khách hủy và bị từ chối là hai trạng thái khác nhau.",
      "Cộng tiền xong, nội dung mờ dần, logo và lời cảm ơn hiện lên rồi đóng thẻ.",
    ],
  },
  {
    version: "3.9.0",
    time: "07:00 ngày 10/11/2026",
    title: "Thẻ chuyển khoản có sao chép, đếm giờ và tự cộng tiền.",
    points: [
      "Sao chép số tài khoản, số tiền và mã nội dung.",
      "Đơn còn 15 phút. Hết giờ thì đóng. Đúng mã thì tự cộng rồi đóng thẻ.",
      "Lịch sử: đang chờ màu cam, đã cộng màu xanh, hết hạn hoặc bị từ chối màu đỏ.",
    ],
  },
  {
    version: "3.8.0",
    time: "02:44 ngày 10/11/2026",
    title: "Chọn cách dịch bằng lời thường, không cần đọc tên model.",
    points: [
      "Bốn lối: cho nhanh, xem là hiểu, phim Trung Nhật Hàn, có hồn hơn.",
      "Mỗi lối ghi hợp với ai, nhanh hay chậm, và giá bằng tiền Việt.",
      "Một lần dịch giữ một lối. Lối xem là hiểu không gọi model nhỏ.",
    ],
  },
  {
    version: "3.7.1",
    time: "21:39 ngày 09/11/2026",
    title: "Khung thư không còn tràn, xem trước nằm ngay chỗ sửa.",
    points: [
      "Ô số nằm gọn trong khung trên điện thoại.",
      "Xem trước thư giữ ở trên khi kéo xuống sửa.",
    ],
  },
  {
    version: "3.7.0",
    time: "21:10 ngày 09/11/2026",
    title: "Xác minh email và quên mật khẩu, làm lại từ bản ổn.",
    points: [
      "Mặc định tắt, tài khoản cũ vẫn đăng nhập.",
      "Có thư xác minh, thư đặt lại mật khẩu và thư khi đổi xong.",
      "Sửa được nội dung, màu và kiểu thư, có xem trước.",
      "Đăng nhập không chờ gửi thư.",
    ],
  },
  {
    version: "3.5.0",
    time: "20:11 ngày 09/11/2026",
    title: "Đã thêm chỗ gửi thư thử.",
    points: [
      "Chủ nhập nhà gửi thư và khóa.",
      "Bấm gửi thử để nhận thư vào hộp thư của mình.",
      "Xác minh email vẫn tắt cho đến khi thư thử tới.",
    ],
  },
  {
    version: "3.4.2",
    time: "18:41 ngày 09/11/2026",
    title: "Nạp tiền chỉ còn Sepay và Casso.",
    points: ["Đã bỏ cổng xác nhận riêng.", "Chỉ cộng khi chuyển khoản khớp đơn đang chờ."],
  },
  {
    version: "3.4.1",
    time: "14:42 ngày 09/11/2026",
    title: "Các kiểu thẻ được làm gọn để xếp nhiều thẻ.",
    points: [
      "Thẻ nằm thành hàng, không đè tên hay số dư.",
      "Con dấu, góc gấp và thanh dọc không còn chiếm cả ô.",
      "Ô xem thử hiện hai thẻ để chọn cho đúng.",
    ],
  },
  {
    version: "3.4.0",
    time: "14:34 ngày 09/11/2026",
    title: "Một tài khoản hiện đủ các thẻ, từ cao xuống thấp.",
    points: [
      "Thứ tự là Chủ, Quản lý, Hỗ trợ, rồi Cộng tác.",
      "Các thẻ xếp ngang, không đè lên nhau.",
      "Thẻ Người dùng chỉ hiện khi không có thẻ nào khác.",
    ],
  },
  {
    version: "3.3.0",
    time: "14:16 ngày 09/11/2026",
    title: "Khoản chi đã ghi có thể sửa hoặc dùng lại.",
    points: [
      "Mỗi khoản chi hiện trong danh sách của khoảng đang xem.",
      "Sửa ngày, tên hoặc số tiền mà không phải gõ lại.",
      "Lấy một khoản cũ để ghi cho ngày mới.",
    ],
  },
  {
    version: "3.2.1",
    time: "14:13 ngày 09/11/2026",
    title: "Tiền nạp Chủ xác nhận tay cũng được tính.",
    points: ["Cổng chưa tự cộng, nhưng Chủ đã đối chiếu chuyển khoản thì vẫn vào sổ."],
  },
  {
    version: "3.2.0",
    time: "13:55 ngày 09/11/2026",
    title: "Có số cộng tác viên, ô tìm, và thẻ Cộng tác.",
    points: [
      "Mục Phòng hiện số cộng tác viên.",
      "Tìm theo tên, email hoặc mã.",
      "Thẻ Cộng tác cùng kiểu với Hỗ trợ, Quản lý và Chủ, có trên sơ đồ.",
      "Chữ Nhập file được căn giữa.",
    ],
  },
  {
    version: "3.1.4",
    time: "13:33 ngày 09/11/2026",
    title: "Đã quay về bản ổn, rồi sửa chỗ cộng tác viên.",
    points: [
      "Nút Cộng tác viên căn giữa, cạnh số dư.",
      "Đăng ký mới có ô mã giới thiệu.",
      "Trang quản lý dễ đọc hơn trên điện thoại.",
    ],
  },
  {
    version: "3.1.1",
    time: "13:10 ngày 09/11/2026",
    title: "Cộng tác viên tạo đủ bảng trên bản xem trước.",
    points: ["Hết báo thiếu bảng khi mở mã giới thiệu."],
  },
  {
    version: "3.1.0",
    time: "12:40 ngày 09/11/2026",
    title: "Chủ nhập xuất thuật ngữ, và có chỗ xác nhận nạp riêng.",
    points: [
      "Bộ thuật ngữ xuất ra file và nhập lại được.",
      "Lời lỗ đã trừ hoa hồng.",
      "Có chỗ dán khóa để xác nhận đơn nạp từ bên ngoài.",
    ],
  },
  {
    version: "3.0.0",
    time: "12:28 ngày 09/11/2026",
    title: "Báo cáo tiền tách phần chênh, và có chương trình giới thiệu.",
    points: [
      "Lời lỗ trừ giá vốn của lượt dùng key của phòng.",
      "Giới thiệu bạn bè thì được hoa hồng trên gói thuê và trên phần chênh.",
      "Hoa hồng mặc định hưởng cả đời, có ngày chờ trước khi rút.",
    ],
  },
  {
    version: "2.23.0",
    time: "12:19 ngày 09/11/2026",
    title: "Thuật ngữ có sẵn hiện đủ, và báo khi không tải được.",
    points: [
      "Trang quản lý hiện tên thể loại tiếng Việt và xem tiếp được các trang.",
      "Có thể ẩn hoặc mở mọi bộ, và khôi phục từ còn thiếu.",
      "Không tải được thuật ngữ thì báo rõ, không còn hiện như bộ trống.",
    ],
  },
  {
    version: "2.22.0",
    time: "11:46 ngày 09/11/2026",
    title: "Thuật ngữ thể loại do phòng quản lý.",
    points: [
      "Bộ thuật ngữ không còn mở công khai.",
      "Thuật ngữ bạn thêm vẫn chỉ lưu trên máy này.",
      "Có thể chọn gửi bản sao để phòng xem. Mặc định tắt.",
    ],
  },
  {
    version: "2.21.0",
    time: "09:33 ngày 09/11/2026",
    title: "Chỉnh nghe bằng núm kéo, và đọc sớm hoặc muộn hơn phụ đề.",
    points: [
      "Chạm thân thanh không đổi tốc độ, cao độ hay âm lượng.",
      "Có thể đọc thuyết minh trước hoặc sau lúc câu hiện.",
      "Bảng cập nhật viết ngắn, mỗi việc một dòng.",
    ],
  },
  {
    version: "2.20.0",
    time: "06:40 ngày 09/11/2026",
    title: "Số dư và câu trả theo lượt dễ hiểu hơn.",
    points: [
      "Số dư hiện khoản đang giữ cho lần chạy.",
      "Trả theo lượt ghi rõ tiền trừ trong ví, không trừ ngày gói.",
      "Số trong email thông báo hiển thị đúng.",
      "Mỗi yêu cầu có ô trả lời riêng.",
    ],
  },
  {
    version: "2.19.2",
    time: "20:28 ngày 08/11/2026",
    title: "Tài khoản điều hành vào lại được khi chưa gửi thư.",
    points: ["Email chưa xác minh không còn bị chặn khỏi trang điều hành."],
  },
  {
    version: "2.19.1",
    time: "19:13 ngày 08/11/2026",
    title: "Video còn nguyên khi đổi tab.",
    points: [
      "Sang tài khoản rồi quay lại không phải chọn lại tệp.",
      "Mốc thời gian không còn hiện 0:60.",
      "Tắt nghe ở lần đầu thì lần sau không bị bật lại.",
      "Hai lần trả theo lượt không dùng nhầm một phiếu.",
    ],
  },
  {
    version: "2.19.0",
    time: "18:52 ngày 08/11/2026",
    title: "Câu đã sửa tay được giữ, chuyển khoản khớp tài khoản.",
    points: [
      "File nói nhỏ không còn bị coi là im cả tệp.",
      "Câu đã sửa tay giữ nguyên khi đổi model.",
      "Từ điển tiếng Trung nhận từ một chữ.",
      "Chỉ cộng tiền khi đúng tài khoản nhận.",
    ],
  },
  {
    version: "2.18.0",
    time: "18:15 ngày 08/11/2026",
    title: "Lượt dùng thử chỉ trừ khi đã gọi được máy dịch.",
    points: [
      "Lỗi trước bước dịch không mất lượt dùng thử.",
      "Hoàn tiền không còn cộng hai lần khi bấm cùng lúc.",
      "Bản dịch thiếu hoặc thừa câu thì dịch lại, không lệch hàng.",
    ],
  },
  {
    version: "2.17.1",
    time: "17:20 ngày 08/11/2026",
    title: "Tài khoản bị khóa vẫn xem được số dư.",
    points: ["Tài khoản bị khóa vẫn gửi được yêu cầu hỗ trợ."],
  },
  {
    version: "2.17.0",
    time: "08:16 ngày 08/11/2026",
    title: "Trả theo lượt giữ tiền trước, trừ số thực khi xong.",
    points: [
      "Giữ một khoản ước tính, trừ số thực và trả phần thừa.",
      "Đoạn báo lỗi không tính tiền.",
      "Đăng ký có thể cần mở thư xác minh.",
    ],
  },
  {
    version: "2.16.1",
    time: "01:35 ngày 08/11/2026",
    title: "Tài khoản bị khóa bị chặn ngay khi nạp hoặc chạy.",
    points: ["Khóa hoặc cấm có hiệu lực ngay khi nạp hoặc chạy, không chỉ trên trình duyệt."],
  },
  {
    version: "2.16.0",
    time: "23:44 ngày 07/11/2026",
    title: "Chuông chỉ còn việc cần xử lý.",
    points: ["Thông báo chưa xem có chấm đỏ và mất chấm khi bấm."],
  },
  {
    version: "2.15.0",
    time: "22:12 ngày 07/11/2026",
    title: "Số tiền hiện dấu chấm nghìn.",
    points: ["Ô nhập tiền hiện dạng 100.000.", "Bấm thông báo mở đúng đơn cần xử lý."],
  },
  {
    version: "2.14.0",
    time: "21:05 ngày 07/11/2026",
    title: "Lời lỗ có màu, và số dư cần mã xác nhận khi đưa về 0.",
    points: ["Lời hiện xanh, lỗ hiện đỏ.", "Đưa số dư về 0 phải nhập mã 6 ký tự."],
  },
  {
    version: "2.13.0",
    time: "19:37 ngày 07/11/2026",
    title: "Gói dài hiện giá đã tiết kiệm.",
    points: ["Gói 7 ngày và 30 ngày hiện giá gốc gạch ngang và số đã tiết kiệm."],
  },
  {
    version: "2.12.0",
    time: "18:50 ngày 07/11/2026",
    title: "Mã nạp hiện ngay trên trang.",
    points: ["Mã QR được vẽ trên trang, không phụ thuộc ảnh bên ngoài.", "Có thể hủy đơn nạp khi báo chuyển nhầm."],
  },
  {
    version: "2.11.0",
    time: "18:14 ngày 07/11/2026",
    title: "Nạp tiền nằm trong khung tài khoản.",
    points: ["Nhập từ 10.000 đến 1.000.000 đồng.", "Tự đăng xuất sau 30 phút không dùng."],
  },
  {
    version: "2.10.1",
    time: "07:41 ngày 07/11/2026",
    title: "Phiếu trả theo lượt và hạn gói nói đúng trạng thái.",
    points: ["Chưa có phiếu thì ghi rõ chưa có.", "Sổ gần đây chỉ hiện vài dòng."],
  },
  {
    version: "2.10.0",
    time: "22:43 ngày 06/11/2026",
    title: "Chọn trả theo lượt thì không cần nhập lại key.",
    points: ["Key đã lưu được giữ sau khi tải lại trang.", "Phiếu hiện giờ, trạng thái và số tiền."],
  },
  {
    version: "2.9.0",
    time: "22:22 ngày 06/11/2026",
    title: "Hai thể loại phim đổi tên cho dễ hiểu.",
    points: ["Tên hiển thị thành Phim gắn nhãn 18+ và Phim thông thường."],
  },
  {
    version: "2.8.0",
    time: "22:05 ngày 06/11/2026",
    title: "Có bản mới thì trang báo tải lại.",
    points: ["Bảng cập nhật chỉ hiện tám lần gần nhất.", "Đang làm việc thì có thể để sau."],
  },
  {
    version: "2.7.0",
    time: "21:47 ngày 06/11/2026",
    title: "Cửa trả theo lượt mặc định mở.",
    points: ["Dùng key của bạn thì không hiện giá.", "Có thể đặt giá riêng cho từng model."],
  },
  {
    version: "2.6.1",
    time: "21:11 ngày 06/11/2026",
    title: "Đóng cửa trả theo lượt thì vẫn dùng key của bạn.",
    points: ["Khi đóng, chỉ hiện câu tạm ngưng."],
  },
  {
    version: "2.6.0",
    time: "21:04 ngày 06/11/2026",
    title: "Trang điều hành xem được phiếu trả theo lượt.",
    points: ["Hiện số đang giữ, số đã trừ và phiếu lỗi trong ngày."],
  },
  {
    version: "2.5.2",
    time: "20:54 ngày 06/11/2026",
    title: "Menu phòng gọn thành một nút danh sách.",
    points: ["Tên mục đang mở hiện cạnh nút."],
  },
  {
    version: "2.5.1",
    time: "13:12 ngày 06/11/2026",
    title: "Mỗi lần cập nhật có mốc thời gian.",
    points: ["Nội dung cập nhật viết bằng câu đủ ý."],
  },
  {
    version: "2.5.0",
    time: "10:02 ngày 06/11/2026",
    title: "Bấm số phiên bản để xem các lần cập nhật.",
    points: ["Phiên bản chưa xem được đánh dấu nhẹ."],
  },
  {
    version: "2.4.2",
    time: "01:09 ngày 06/11/2026",
    title: "Nhãn menu thẳng hàng.",
    points: ["Các mục menu nằm cùng một hàng."],
  },
  {
    version: "2.4.1",
    time: "00:54 ngày 06/11/2026",
    title: "Chốt bảng giá thuê phòng.",
    points: ["9.000 đồng mỗi 24 giờ, 39.000 đồng mỗi 7 ngày, 99.000 đồng mỗi 30 ngày."],
  },
  {
    version: "2.4.0",
    time: "00:52 ngày 06/11/2026",
    title: "Nghe và thuyết minh được bật sẵn.",
    points: ["Đăng nhập có thể ghi nhớ email.", "Tài khoản được cấp quyền thấy nút điều hành."],
  },
  {
    version: "2.3.0",
    time: "00:26 ngày 06/11/2026",
    title: "Video giữ đúng tỷ lệ khi xoay máy.",
    points: ["Đăng ký phải nhập lại mật khẩu và thấy mức mạnh yếu."],
  },
  {
    version: "2.2.0",
    time: "00:03 ngày 06/11/2026",
    title: "Ô tài khoản hiện cấp của người dùng.",
    points: ["Có mười kiểu thẻ quyền để chọn."],
  },
  {
    version: "2.1.0",
    time: "23:46 ngày 05/11/2026",
    title: "Từ chối yêu cầu phải có lý do.",
    points: ["Yêu cầu được đóng sau khi trả lời hoặc từ chối."],
  },
  {
    version: "2.0.0",
    time: "23:18 ngày 05/11/2026",
    title: "Phòng có bốn cấp xử lý yêu cầu.",
    points: ["Yêu cầu quá 2 giờ được chuyển lên cấp trên.", "Có sơ đồ cấp và trang theo dõi tiền."],
  },
];

export function versionKind(version = APP_VERSION) {
  const [major, minor, patch] = version.split(".").map((part) => Number(part) || 0);
  if (patch > 0) return "sửa chữ";
  if (minor > 0) return "chức năng nhỏ";
  if (major > 1) return "chức năng lớn";
  return "bản đầu";
}

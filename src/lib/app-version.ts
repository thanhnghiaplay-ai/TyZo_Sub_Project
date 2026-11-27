/** Số đưa lên Vercel. Đổi số cuối khi sửa chữ, số giữa khi thêm chức năng nhỏ, số đầu khi thêm chức năng lớn. */
export const APP_VERSION = "5.49.5";

type ReleaseNote = {
  version: string;
  time: string;
  title: string;
  points: string[];
};

/** Bảng khách thấy. Một câu tiêu đề, vài dòng việc. Không ghi việc nội bộ. */
export const CHANGELOG: ReleaseNote[] = [
  {
    version: "5.49.5",
    time: "27/11/2026",
    title: "Kiểm tra phần đã giữ trước khi dịch.",
    points: [
      "Hệ thống kiểm tra phần đã giữ trước khi gửi yêu cầu dịch.",
      "Khi có số liệu từ nhà cung cấp, số Token dịch trừ theo lượng đã dùng.",
      "Phần dịch trực tiếp dùng suất trống khi các đoạn đang chờ không thể dùng suất đó.",
    ],
  },
  {
    version: "5.49.4",
    time: "20:42 27/11/2026",
    title: "Chia lượt công bằng khi đông khách, tính phí dịch trực tiếp chắc chắn hơn.",
    points: [
      "Khi hệ thống đông, bạn được xếp hàng và thấy vị trí; người chờ lâu được ưu tiên.",
      "Dịch trực tiếp trừ phí đúng một lần, kể cả khi mạng chập chờn.",
      "Độ dài đoạn âm thanh được kiểm chính xác trước khi giữ Token dịch.",
    ],
  },
  {
    version: "5.49.3",
    time: "16:33 27/11/2026",
    title: "Xử lý nhiều đoạn an toàn hơn khi hệ thống bận.",
    points: [
      "Giữ riêng ngân sách từng đoạn; dịch trực tiếp không tính lặp phần đã nhận.",
      "Đóng lần chạy sẽ chờ đoạn đang xử lý hoàn tất trước khi trả phần dư.",
      "Khi hệ thống bận, bạn được nhắc thử lại sau ít giây.",
      "Mất phản hồi khi dùng Token dịch: không tự gửi lại để tránh tính phí hai lần.",
    ],
  },
  {
    version: "5.49.2",
    time: "05:33 27/11/2026",
    title: "Giữ bản phụ đề riêng và dừng xử lý an toàn hơn.",
    points: [
      "Bản phụ đề lưu trên máy được tách theo từng tài khoản.",
      "Trau chuốt giữ số, phủ định và tên; câu chưa chắc chắn dùng lại bản gốc.",
      "Dừng giọng đọc không làm kẹt hàng đợi phát tiếng.",
      "Trang không tự tải lại khi bạn đang xử lý phụ đề hoặc dịch trực tiếp.",
    ],
  },
  {
    version: "5.49.1",
    time: "01:59 27/11/2026",
    title: "Trừ Token dịch chính xác và an toàn hơn khi chạy nhiều đoạn cùng lúc.",
    points: [
      "Bấm hủy khi đoạn TyZo đang chạy: đoạn đó vẫn có kết quả, phần Token dịch dư trả về ngay sau.",
      "Một lô câu không còn bị gửi dịch nhiều lần cùng lúc.",
      "Dịch trực tiếp tạm ngưng gửi tiếng khi phần Token dịch đã giữ vừa hết, chờ giữ thêm.",
      "Lệnh rút hoa hồng bấm nhiều lần cùng lúc chỉ tạo một lệnh.",
    ],
  },
  {
    version: "5.49.0",
    time: "22:30 26/11/2026",
    title: "Bảng giá có thêm gói Token dịch, báo lỗi dễ hiểu hơn.",
    points: [
      "Trang Bảng giá hiện cả gói Thuê phòng và gói Token dịch, có nút Mua.",
      "Khi Trả theo lượt tạm đóng hay bảo trì, app báo rõ bằng lời thường, không hiện mã lỗi.",
      "Màn chờ hiện một lần, trang không còn bị xô khi vừa mở.",
      "Bấm ‹ › ở thanh dưới là chuyển và mở luôn bước đó.",
    ],
  },
  {
    version: "5.48.0",
    time: "21:00 26/11/2026",
    title: "Phòng chỉ còn ba nhà: Groq, Alibaba và TyZo.",
    points: [
      "Bỏ Deepgram, AssemblyAI, Speechmatics, Soniox, ElevenLabs và giọng Aura.",
      "Ai đang chọn giọng Aura hoặc ElevenLabs sẽ tự về giọng Neural.",
      "TyZo tính theo thời gian máy GPU thật sự xử lý, chỉ có ở cửa Trả theo lượt.",
      "Điều khoản 2026-11-26.2: dữ liệu không còn gửi tới năm nhà đã bỏ; bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.47.0",
    time: "15:00 26/11/2026",
    title: "Nhận dạng TyZo Modal (Nhanh và Kỹ) ở cửa trả theo lượt, khi phòng mở gói có TyZo.",
    points: [
      "Phim dài chia nhiều đoạn chạy cùng lúc (tối đa 9), ghép phụ đề đúng thứ tự.",
      "Tiếng cảm thán lặp sát nhau gộp thành một dòng, đỡ nhấp nháy khi đọc.",
      "Mỗi đoạn chỉ tính một lần, kể cả khi mạng rớt và gửi lại; điều khoản 2026-11-26.1.",
    ],
  },
  {
    version: "5.46.0",
    time: "18:26 25/11/2026",
    title: "Trang giới thiệu mới: xem TyZo Sub làm được gì trước khi đăng ký.",
    points: [
      "Khách chưa đăng nhập vào trang chủ sẽ thấy trang giới thiệu, có nút Đăng nhập và Dùng thử.",
      "Xem cách dùng, tính năng, bảng giá, ứng dụng Android và hỏi đáp ngay trên một trang.",
      "Mở thẳng tại địa chỉ /gioi-thieu; giá và hạn mức dùng thử luôn khớp với trang Bảng giá.",
    ],
  },
  {
    version: "5.45.0",
    time: "15:25 23/11/2026",
    title: "Dịch trực tiếp nhận dạng rõ hơn khi lấy tiếng thẳng từ tab hay điện thoại; ứng dụng 0.11.",
    points: [
      "Lọc cho giọng nói: bớt nhạc nền và tiếng trầm, tự chỉnh âm lượng như micro.",
      "Video tiếng nhỏ vẫn nhận đủ câu; lúc im vẫn không gửi, không trừ thêm Token dịch.",
      "Bật sẵn; tắt được ở ô «Lọc cho giọng nói» trên web và trong ứng dụng.",
    ],
  },
  {
    version: "5.44.0",
    time: "14:59 23/11/2026",
    title: "Lịch sử Dịch trực tiếp chung giữa web và ứng dụng Android 0.10.",
    points: [
      "Phiên dịch xong tự lưu theo tài khoản: mở web hay ứng dụng đều thấy.",
      "Giữ 30 phiên gần nhất trong 30 ngày; tải SRT, VTT, TXT hoặc xóa từng phiên, xóa hết.",
      "Điều khoản nói rõ nhà nào phòng gửi lệnh xóa bản nhận dạng, nhà nào không.",
    ],
  },
  {
    version: "5.43.0",
    time: "13:49 23/11/2026",
    title: "Dịch trực tiếp trên web: tự nối lại, có Tạm dừng, phụ đề dễ đọc; ứng dụng Android 0.9.",
    points: [
      "Mạng chập chờn thì tự nối lại, giữ phụ đề đang có, không phải bấm Bắt đầu lại.",
      "Nút Tạm dừng / Tiếp tục; lúc im lặng hay tạm dừng không trừ Token dịch.",
      "Phụ đề tách theo câu, câu dài chia đều hai dòng, câu cũ tự ẩn; thêm Chỉ hiện câu đã xong.",
      "Không mất mấy chữ đầu; lỗi của dịch vụ dịch báo bằng tiếng Việt, kèm việc cần làm.",
    ],
  },
  {
    version: "5.42.7",
    time: "08:44 23/11/2026",
    title: "Ứng dụng Android 0.8: phụ đề nổi hiện như phụ đề phim, dễ đọc khi thoại liên tục.",
    points: [
      "Tách theo câu: câu đã xong đứng yên, câu đang nói mờ hơn, câu cũ tự ẩn sau vài giây.",
      "Mặc định chữ viền đen không nền; vẫn bật được Nền đậm.",
      "Thêm lựa chọn Chỉ hiện câu đã xong để đọc êm hơn.",
      "Qwen 3.5 chốt câu đúng lúc hơn trên phim có nhạc nền.",
    ],
  },
  {
    version: "5.42.6",
    time: "07:08 23/11/2026",
    title: "Ứng dụng Android 0.7: dịch mượt hơn trên 5G, có Tạm dừng, phụ đề dễ đọc hơn.",
    points: [
      "Tiếng gửi đi gọn một nửa, mạng chậm thì bỏ phần cũ nên phụ đề không trễ dồn.",
      "Nút Tạm dừng / Tiếp tục ngay trên khung phụ đề; im lặng hay tạm dừng không trừ Token dịch.",
      "Bấm Bắt đầu xong ứng dụng tự lùi về phim; khung phụ đề nền nhạt, chữ đứng yên hơn.",
      "Điều khoản ghi việc không trừ Token dịch lúc im lặng; bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.42.5",
    time: "23:17 22/11/2026",
    title: "Ứng dụng Android 0.6: tự nối lại khi mất mạng, phụ đề nổi gọn hơn.",
    points: [
      "Đường nối bị đứt thì ứng dụng tự nối lại tối đa 3 lần, giữ phụ đề đang có, báo rõ lý do.",
      "Bài hát hay lời nói liền không còn dồn cả đoạn che video: khung chỉ hiện phần cuối.",
      "Video im lâu không còn hiện câu báo lỗi tiếng Anh; có tiếng lại là dịch tiếp.",
    ],
  },
  {
    version: "5.42.4",
    time: "22:42 22/11/2026",
    title: "Dịch trực tiếp quay về cách chạy trước bản 5.42.0.",
    points: [
      "Bỏ các thay đổi tốc độ của bản 5.42.0 đến 5.42.3; phiên không còn tự dừng khi im lặng.",
      "Giữ phần sửa menu điện thoại; điều khoản về lại như trước, bạn đồng ý lại một lần.",
    ],
  },
  {
    version: "5.42.3",
    time: "22:33 22/11/2026",
    title: "Dịch trực tiếp chờ êm khi video im lâu, có tiếng lại là dịch tiếp.",
    points: [
      "Im lặng quá một phút không còn hiện câu báo lỗi tiếng Anh hay làm phiên bị ngắt.",
      "Lúc chờ không gửi tiếng im đi dịch nên không tốn Token dịch.",
    ],
  },
  {
    version: "5.42.2",
    time: "22:21 22/11/2026",
    title: "Dịch trực tiếp không còn bị ngắt «Mất kết nối» giữa chừng.",
    points: [
      "Sửa lỗi phiên đang dịch ở web và ứng dụng bị cắt sau vài giây.",
    ],
  },
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
];


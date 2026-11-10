/** Số đưa lên Vercel. Đổi số cuối khi sửa chữ, số giữa khi thêm chức năng nhỏ, số đầu khi thêm chức năng lớn. */
export const APP_VERSION = "3.10.7";

export type ReleaseNote = {
  version: string;
  time: string;
  title: string;
  points: string[];
};

/** Bảng khách thấy. Một câu tiêu đề, vài dòng việc. Không ghi việc nội bộ. */
export const CHANGELOG: ReleaseNote[] = [
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

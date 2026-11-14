import { ROOM_PLANS } from "@/lib/room-plans";

/**
 * Nội dung điều khoản, một chỗ duy nhất. Cửa hỏi lại khi điều khoản đổi (entry-gate.tsx)
 * và trang đọc bất cứ lúc nào (routes/dieu-khoan.tsx) cùng vẽ từ đây.
 * Sửa chữ ở đây thì phải nâng TERMS_VERSION trong lib/terms.ts.
 */
export function TermsDocument() {
  return (
    <article className="gate-scroll">
      <h2>Tóm tắt</h2>
      <table className="gate-table">
        <thead>
          <tr>
            <th>Việc</th>
            <th>Ai chịu</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nhận dạng lời, dịch, chiếu phụ đề, thuyết minh, xuất file</td>
            <td>Phòng cung cấp công cụ</td>
          </tr>
          <tr>
            <td>Key Groq, key Alibaba và cước của nhà đó khi bạn tự chọn</td>
            <td>Bạn</td>
          </tr>
          <tr>
            <td>Quyền của video và tiếng đưa vào</td>
            <td>Bạn</td>
          </tr>
          <tr>
            <td>Xem lại bản dịch trước khi đăng hoặc phát</td>
            <td>Bạn</td>
          </tr>
          <tr>
            <td>Đúng hết câu, đúng ý, đúng giọng</td>
            <td>Không cam kết</td>
          </tr>
        </tbody>
      </table>

      <h2>Bảng giá</h2>
      <p>Đăng ký chưa nạp là dùng thử: 1 tệp, tối đa 10 phút, xem đủ chức năng, không xuất file Vietsub. Lượt thử chỉ bị trừ khi nhận dạng đã gọi được máy dịch. Lỗi trước bước đó không mất lượt. Gói đã mua thì trong hạn không giới hạn số tệp.</p>
      <table className="gate-table">
        <thead>
          <tr>
            <th>Gói</th>
            <th>Giá</th>
            <th>Quyền</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Dùng thử</td>
            <td>0 đ</td>
            <td>1 tệp, 10 phút, không xuất file</td>
          </tr>
          {ROOM_PLANS.map((plan) => (
            <tr key={plan.id}>
              <td>{plan.name}</td>
              <td>{new Intl.NumberFormat("vi-VN").format(plan.price)} đ</td>
              <td>Không giới hạn số tệp trong hạn, được xuất file</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>1. Phòng này làm gì</h2>
      <p>
        Phòng chiếu TyZo Sub là công cụ chạy trên trình duyệt. Bạn chọn file video hoặc tiếng, dán key của chính bạn. Phòng nhận dạng lời bằng Whisper trên Groq hoặc bằng Alibaba Filetrans khi bạn chọn nhà đó, dịch sang tiếng Việt, chiếu phụ đề trên video, có thể đọc thuyết minh, và xuất file phụ đề .srt.
      </p>
      <p>Phòng cho thuê theo gói ngày, tuần hoặc tháng. Khi bạn dùng key của mình thì cước Groq hoặc Alibaba vẫn là của bạn, tùy nhà bạn chọn. Nạp ví bằng chuyển khoản qua Sepay hoặc Casso khi Chủ đã bật cổng. Chỉ cộng khi nội dung và số tiền khớp đơn đang chờ. Mã QR là VietQR nếu phòng nhận ra ngân hàng; không nhận ra thì chuyển theo số tài khoản và nội dung.</p>
      <p>Cửa trả theo lượt dùng key của phòng và tính tiền trong ví theo giá nhà phát hành công bố cộng phần chênh phòng niêm yết. Bạn chỉ thấy số tiền sau khi đã cộng phần chênh, gồm ước tính và khoản giữ ví. Bạn không thấy giá gốc và không thấy phần trăm. Khi Chủ đã mở gói trả theo lượt, bạn chọn một gói. Gói quyết định model nhận dạng và model dịch. Nhận dạng Alibaba ở cửa này dùng key Alibaba của phòng và cần link file trực tiếp, không phải trang xem. Việc Alibaba ngoài nhận dạng chưa chạy ở cửa này. Khi chưa có gói, cửa vẫn nhận dạng bằng Whisper trên Groq. Khi thuê phòng bằng key của bạn, bạn chỉ chọn model Chủ đã mở: Whisper cần key Groq, Filetrans cần key Alibaba. Dịch khi thuê phòng vẫn bằng model Groq đã mở. Nhận dạng tính theo giây âm thanh (tối thiểu 10 giây mỗi lần), dịch theo token, đọc thuyết minh theo ký tự. Trước khi chạy, phòng giữ tạm một khoản ước tính trong ví. Khi xong, phòng trừ số thực và trả lại phần giữ thừa. Đoạn nhà phát hành báo lỗi thì không tính tiền.</p>

      <h2>2. Điều kiện để dùng</h2>
      <p>Bạn tự chịu trách nhiệm khi đưa nội dung vào. Bạn phải có quyền dùng video và tiếng đó. Key Groq và key Alibaba là của bạn. Nhà đó tính cước cho tài khoản của bạn, không phải phí thuê phòng.</p>
      <p>Bạn phải đọc và bấm đồng ý bản điều khoản đang hiện. Không đồng ý thì không mở được phòng dịch. Khi phòng bật, email dùng để xác minh tài khoản và lấy lại mật khẩu. Liên kết trong thư có thời hạn. Phòng không gửi mật khẩu.</p>

      <h2>3. Phòng không cam kết</h2>
      <p>
        Không cam kết nhận dạng hết câu, dịch đúng ý, giữ đúng tên hay giọng nam nữ, hoặc không mất câu. Kết quả là bản để bạn xem và sửa. Bạn tự kiểm tra trước khi đăng, phát hoặc giao cho người khác.
      </p>
      <p>Key sai, hết hạn mức Groq hoặc Alibaba, mạng lỗi, file hỏng hoặc trình duyệt chặn tiếng có thể làm một lần chạy thất bại. Phòng không bồi thường cho các lần đó khi bạn dùng key của mình. Ở cửa trả theo lượt, đoạn lỗi không bị tính tiền và khoản giữ thừa được trả lại ví.</p>
      <p>Phòng không phải Groq, không phải Alibaba, không phải nhà sản xuất video, và không phải nơi lưu phim.</p>

      <h2>4. Dữ liệu đi những đâu</h2>
      <p>
        Key Groq, key Alibaba, tên phim, ghi chú, thuật ngữ bạn thêm và giọng đã khóa được lưu trên máy bạn. Lần đồng ý điều khoản cũng lưu trên máy, và khi bạn đã đăng nhập thì máy chủ ghi số phiên bản điều khoản theo tài khoản. Xóa dữ liệu trang là mất các mục trên máy, không xóa dòng đã ghi trên máy chủ.
      </p>
      <p>Lời thoại được gửi tới Groq hoặc Alibaba tùy cách nhận dạng bạn chọn, theo điều khoản của nhà đó. Với Alibaba Filetrans, link file trực tiếp cũng được gửi tới Alibaba. File video xử lý trên máy bạn.</p>
      <p>
        Mỗi lần nhận dạng xong, app gửi lên máy chủ của phòng một bản số liệu chất lượng để Chủ biết hệ thống chạy tốt hay kém. Bản này chỉ có số: phiên bản app, bạn dùng key riêng hay key của phòng, tên model, ngôn ngữ nguồn đã chọn, độ dài âm thanh, số đoạn và số câu, mức tin cậy Whisper tự báo, số đoạn lỗi, và kết quả kiểm tra ngôn ngữ nếu bạn bật. Việc này áp dụng cả khi bạn dùng key riêng và không có công tắc tắt riêng.
      </p>
      <p>
        Không gửi phụ đề, lời thoại, tên file, tên phim, video, âm thanh hay key. Bản số liệu lưu trên máy chủ không có mã hay email tài khoản của bạn. Máy chủ chỉ dùng tài khoản để giới hạn số lần gửi. Chỉ Chủ xem được các số đã gộp, không xem được từng người.
      </p>
      <p>
        Khi bạn dùng cửa trả theo lượt, máy chủ của phòng ghi một phiếu cho lần chạy đó, trong phiếu có tên tệp bạn đưa vào, thời lượng, số tiền giữ và trừ. Nhân viên của phòng chỉ thấy tên tệp đã che (hai ký tự đầu và đuôi tệp), phần còn lại là dấu chấm tròn. Chỉ Chủ xem được tên đầy đủ, để đối chiếu khi bạn hỏi về một lượt chạy, và mỗi lần xem được ghi vào nhật ký thao tác của phòng. Phòng không lưu video của bạn nên không ai trong phòng xem được video.
      </p>
      <p>
        Thuật ngữ bạn tự thêm chỉ nằm trên máy của bạn. Nếu bạn bật gửi thuật ngữ, phòng nhận một bản sao để xem. Phòng không áp bản đó cho người khác nếu Chủ chưa nhận vào bộ chính thức. Không gửi tên người thật, số điện thoại hay địa chỉ.
      </p>
      <p>
        Khi bật thuyết minh Neural, câu chữ được gửi qua máy chủ của phòng tới dịch vụ đọc giọng. Giọng máy của trình duyệt đọc trên thiết bị của bạn. Orpheus dùng key Groq của bạn.
      </p>

      <h2>5. Phần mỗi bên chịu</h2>
      <p>Bạn chịu nội dung đưa vào và cách bạn dùng bản dịch, file phụ đề, hoặc tiếng đọc.</p>
      <p>
        Phòng chỉ cung cấp công cụ. Phòng không chịu thiệt hại gián tiếp do bản dịch sai, mất câu, hay key bị người khác thấy vì bạn để họ dùng máy của bạn.
      </p>
      <p>Điều khoản này không xóa trách nhiệm của phòng nếu phòng cố ý gây hại.</p>

      <h2>6. Khi điều khoản đổi</h2>
      <p>
        Sửa nội dung điều khoản thì số phiên bản đổi. Bản mới hiện lại lúc bạn mở phòng. Bạn phải đồng ý bản mới thì mới dùng tiếp. Không đồng ý thì dùng bản cũ cũng không được.
      </p>

      <h2>7. Ngừng dùng</h2>
      <p>Bạn có thể bấm không đồng ý và rời đi. Phần đã lưu trên máy vẫn còn đến khi bạn xóa dữ liệu của trang.</p>

      <h2>8. Khi nào bị khóa hoặc bị cấm</h2>
      <p className="gate-key">Hết hạn gói, hết lượt dùng thử, dịch chưa đúng, hoặc đăng nhập sai không phải lý do để khóa hay cấm. Những lúc đó bạn vẫn đăng nhập được.</p>
      <p className="gate-label gate-label-lock">Khóa</p>
      <p>Bạn vẫn vào phòng để gửi yêu cầu xem lại, nhưng không dịch và không xuất file.</p>
      <p className="gate-label gate-label-ban">Cấm</p>
      <p>Bạn không đăng nhập được. Người bị cấm vẫn gửi được yêu cầu từ trang không cần đăng nhập.</p>
      <p className="gate-key">Mỗi lần khóa hoặc cấm đều có lý do được ghi lại.</p>
      <p className="gate-label gate-label-lock">Có thể bị khóa nếu</p>
      <ul className="gate-points">
        <li>Một tài khoản đang hạn được nhiều người dùng chung.</li>
        <li>Tạo nhiều tài khoản chỉ để lấy thêm lượt dùng thử.</li>
        <li>Gửi yêu cầu hỗ trợ lặp lại để gây rối.</li>
      </ul>
      <p className="gate-label gate-label-ban">Có thể bị cấm nếu</p>
      <ul className="gate-points gate-points-ban">
        <li>Đưa vào phòng nội dung khai thác trẻ em.</li>
        <li>Cố tình tấn công hoặc làm quá tải trang.</li>
        <li>Đưa chứng từ thanh toán giả.</li>
        <li>Bán lại tài khoản hoặc bán lại phòng như dịch vụ của mình.</li>
        <li>Tiếp tục đưa nội dung không có quyền sau khi đã được báo.</li>
      </ul>
      <p className="gate-key">Gỡ khóa hoặc gỡ cấm không xóa lịch sử xử lý.</p>
      <h2>9. Giới thiệu</h2>
      <p>
        Nếu bạn dùng mã giới thiệu, hoa hồng tính trên gói thuê và trên phần chênh của lượt dùng key phòng. Mã gắn một lần, không đổi. Không tự giới thiệu. Hoa hồng chờ một thời gian rồi mới rút được. Phòng có thể tạm dừng mã.
      </p>
    </article>
  );
}

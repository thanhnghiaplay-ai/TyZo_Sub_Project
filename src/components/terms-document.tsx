import { TRIAL_FILES, TRIAL_MINUTES } from "@/lib/room-plans";
import { useRoomPlans } from "@/lib/use-room-plans";

/**
 * Nội dung điều khoản và chính sách, một chỗ duy nhất.
 * Cửa hỏi lại khi điều khoản đổi (entry-gate.tsx) và trang đọc bất cứ lúc nào
 * (routes/dieu-khoan.tsx) cùng vẽ từ đây.
 * Sửa chữ ở đây thì phải nâng TERMS_VERSION trong lib/terms.ts.
 */
export function TermsDocument() {
  const plans = useRoomPlans();
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
            <td>TyZo Sub cung cấp công cụ AI theo yêu cầu. Không cung cấp, phát hành hay lưu trữ nội dung</td>
          </tr>
          <tr>
            <td>Key Groq, key Alibaba, key Deepgram, key AssemblyAI, key Speechmatics, key Soniox, key ElevenLabs và cước của nhà đó khi bạn tự chọn</td>
            <td>Bạn</td>
          </tr>
          <tr>
            <td>Quyền của video và tiếng đưa vào</td>
            <td>Bạn, và bạn xác nhận lại cho mỗi tệp. Phòng có kênh nhận khiếu nại bản quyền</td>
          </tr>
          <tr>
            <td>Xem lại bản dịch trước khi đăng hoặc phát</td>
            <td>Bạn</td>
          </tr>
          <tr>
            <td>Token dịch cho trả theo lượt, dịch trực tiếp và Orpheus</td>
            <td>Đơn vị dùng dịch vụ, không phải tiền. Hết hạn thì mất, không hoàn</td>
          </tr>
          <tr>
            <td>Đọc thuyết minh khi dùng key của phòng</td>
            <td>Orpheus trừ Token dịch. Neural và giọng máy không trừ</td>
          </tr>
          <tr>
            <td>Tiếng và chữ gửi đi để xử lý</td>
            <td>Gửi tới nhà bạn chọn. Video xử lý trên máy bạn</td>
          </tr>
          <tr>
            <td>Đúng hết câu, đúng ý, đúng giọng</td>
            <td>Không cam kết</td>
          </tr>
        </tbody>
      </table>

      <h2>Bảng giá</h2>
      <p>
        Đăng ký chưa mua gói là dùng thử: {TRIAL_FILES} tệp, tối đa {TRIAL_MINUTES} phút, không quá 100 MB, xem đủ chức năng, không xuất file. Lượt thử chỉ bị trừ khi nhận dạng đã gọi được máy dịch. Lỗi trước bước đó không mất lượt. Gói thuê phòng đã trả thì trong hạn không giới hạn số tệp và được xuất file. Cửa trả theo lượt và dịch trực tiếp dùng cùng Token dịch, không dùng bảng giá thuê phòng. Giá từng gói Token dịch tính lúc tạo mã chuyển khoản. Orpheus khi dùng key của phòng trừ Token dịch. Neural và giọng máy không trừ.
      </p>
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
            <td>{TRIAL_FILES} tệp, {TRIAL_MINUTES} phút, không xuất file</td>
          </tr>
          {plans.map((plan) => (
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
        TyZo Sub là dịch vụ phần mềm (SaaS): công cụ AI chạy trên trình duyệt, xử lý theo yêu cầu của bạn. Bạn chọn file video hoặc tiếng trên máy, hoặc dán link file trực tiếp, và tự quyết định xử lý gì. Công cụ nhận dạng lời, dịch, hiện phụ đề trên video của bạn, có thể đọc thuyết minh, và xuất file phụ đề. Phòng không chọn, không cung cấp, không phát hành, không phân phối và không lưu trữ video hay tiếng của bạn, và không chia sẻ chúng cho người khác.
      </p>
      <p>
        Link phải là file trực tiếp. Phòng không nhận trang xem, không vượt khóa trả phí, và không tải video hộ bạn. Video được xử lý trên máy bạn. Phòng chỉ gửi phần tiếng hoặc chữ cần thiết tới nhà nhận dạng và dịch mà bạn đang dùng.
      </p>
      <p>
        Phòng cho thuê theo gói ngày, tuần hoặc tháng. Khi bạn dùng key của mình thì cước Groq, Alibaba, Deepgram, AssemblyAI, Speechmatics, Soniox hoặc ElevenLabs vẫn là của bạn. Mua Token dịch và thuê phòng bằng chuyển khoản đúng số tiền của đơn, qua Sepay hoặc Casso khi Admin đã bật cổng. Phòng không giữ số dư để chi tiêu. Chỉ giao gói khi nội dung và số tiền khớp đơn đang chờ. Mã QR là VietQR nếu phòng nhận ra ngân hàng; không nhận ra thì chuyển theo số tài khoản và nội dung.
      </p>

      <p>
        Ứng dụng Android (TyZo Sub, Android 10 trở lên) là một cách khác để dùng Dịch trực tiếp. Bạn liên kết ứng dụng với tài khoản bằng mã lấy ở trang Tài khoản. Khi bạn bấm Bắt đầu và đồng ý cho chia sẻ, ứng dụng thu tiếng mà điện thoại đang phát (ví dụ video bạn đang xem ở ứng dụng khác), gửi đi dịch và hiện phụ đề nổi trên màn hình. Android gọi đây là chia sẻ màn hình, nhưng ứng dụng chỉ lấy tiếng, không chụp hay quay hình. Ứng dụng không tải video và không lưu tiếng. Phiên dịch trừ Token dịch như Dịch trực tiếp trên web, kể cả lúc video im lặng, cho tới khi bạn bấm Dừng hoặc phiên tự dừng vì im lặng lâu như mục giá. Quyền đối với nội dung đang phát vẫn là trách nhiệm của bạn như mục 3.
      </p>

      <h2>2. Điều kiện để dùng</h2>
      <p>
        Bạn phải có quyền dùng video và tiếng đưa vào: bạn sở hữu nội dung, hoặc đã được chủ sở hữu cho phép nhận dạng, dịch, làm phụ đề hay thuyết minh cho nó, hoặc pháp luật cho phép bạn dùng nội dung theo cách đó. Bạn tự chịu nội dung đó và cách bạn dùng bản dịch, file phụ đề hoặc tiếng đọc, kể cả khi đăng, phát hoặc giao cho người khác.
      </p>
      <p>
        Trước lần xử lý đầu của mỗi tệp hoặc link, app hỏi bạn xác nhận quyền này. Phòng ghi lại việc bạn đã xác nhận: tài khoản, một mã rút gọn của tệp (không phải tên tệp hay nội dung), bản điều khoản và thời điểm. Không xác nhận thì không xử lý.
      </p>
      <p>
        Bạn phải đọc và tích đồng ý bản này ở Đăng ký hoặc Đăng nhập. Không đồng ý thì không mở được phòng dịch. Khi phòng bật thư, email dùng để xác minh tài khoản và lấy lại mật khẩu. Liên kết trong thư có thời hạn. Phòng không gửi mật khẩu.
      </p>

      <h2>3. Bản quyền và khiếu nại</h2>
      <p>
        Phòng là bên cung cấp công cụ kỹ thuật. Người dùng chọn nội dung, quyết định xử lý và quyết định dùng kết quả. Phòng không kiểm tra nội dung trước khi xử lý, không sửa nội dung đưa vào, và không lập thư viện, kho hay trang chia sẻ công khai video, phụ đề hoặc tiếng đọc. Kết quả nằm trên máy của người dùng. Câu «bạn tự chịu» không có nghĩa phòng cho phép xử lý nội dung không có quyền.
      </p>
      <p>Không được dùng công cụ để:</p>
      <ul className="gate-points">
        <li>Làm phụ đề, bản dịch hoặc thuyết minh cho tác phẩm của người khác để đăng, phát, bán hay chia sẻ khi chưa được phép.</li>
        <li>Xử lý nội dung có được bằng cách vượt khóa, gỡ bảo vệ kỹ thuật hoặc từ nguồn phát tán trái phép.</li>
        <li>Xử lý nội dung mà pháp luật cấm, kể cả nội dung khai thác trẻ em.</li>
      </ul>
      <p>
        Nếu bạn là chủ quyền hoặc người được ủy quyền và cho rằng nội dung của mình bị xử lý không có quyền, hãy gửi thông báo qua mục Hỗ trợ và liên hệ ở trang Hướng dẫn, hoặc qua yêu cầu xem lại. Thông báo cần nêu: tác phẩm bị xâm phạm; căn cứ quyền của bạn (hoặc giấy ủy quyền); thông tin giúp xác định tài khoản hay lần xử lý liên quan (email tài khoản, thời điểm, tên tệp hoặc nơi kết quả bị đăng); cách liên hệ với bạn; và lời cam đoan thông tin là đúng.
      </p>
      <p>
        Khi nhận thông báo đủ thông tin, phòng ghi nhận, tạm dừng việc xử lý nội dung đó của tài khoản liên quan và báo cho người dùng. Người dùng có thể gửi giải trình qua yêu cầu xem lại. Phòng có thể khóa tài khoản trong lúc xem xét, và cấm tài khoản tiếp tục đưa nội dung không có quyền sau khi đã được báo, hoặc bị khiếu nại hợp lệ nhiều lần. Phòng lưu lại việc đã nhận và đã xử lý, cung cấp thông tin tài khoản cho cơ quan nhà nước có thẩm quyền khi có yêu cầu theo pháp luật, và không thay cơ quan nhà nước kết luận ai đúng.
      </p>

      <h2>4. Thanh toán và Token dịch</h2>
      <p>
        Token dịch là đơn vị dùng dịch vụ trả trước. Một Token dịch tương ứng một giây của bản nhận dạng gốc đang dùng để tính giá. Token dịch không phải tiền, không phải số dư, không chuyển cho người khác, và không dùng để trả cho bên thứ ba.
      </p>
      <p>
        Bấm mua Token dịch hoặc thuê phòng thì phòng tạo một đơn đúng giá gói đó. Bạn chuyển khoản đúng số tiền và đúng nội dung. Tiền khớp đơn thì được gói hoặc được mở hạn. Chuyển thiếu thì đơn không xong. Chuyển dư thì phần dư không được lưu thành số dư.
      </p>
      <p>
        Cửa trả theo lượt dùng key của phòng và trừ Token dịch, không giữ tiền cho lần chạy. Bạn thấy số Token dịch, hạn dùng và giá gói. Bạn không thấy giá gốc, phần trăm chênh hay hệ số đệm. Khi Admin đã mở gói việc, bạn chọn một gói. Gói việc quyết định model nhận dạng và model dịch. Nhận dạng Alibaba ở cửa này dùng key Alibaba của phòng và cần link file trực tiếp. Việc Alibaba ngoài nhận dạng chưa chạy ở cửa này. Giọng đọc Aura của Deepgram ở cửa này dùng key Deepgram của phòng và trừ Token dịch theo số chữ đọc. Giọng đọc ElevenLabs ở cửa này dùng key ElevenLabs của phòng và trừ Token dịch theo số chữ đọc. Nhận dạng Deepgram chưa chạy ở cửa này. Nhận dạng AssemblyAI, Speechmatics, Soniox và ElevenLabs ở cửa này dùng key của phòng từng nhà, cần link file trực tiếp và trừ Token dịch theo giây âm thanh. Khi chưa có gói việc, cửa vẫn nhận dạng bằng Whisper trên Groq. Khi thuê phòng bằng key của bạn, bạn chỉ chọn model Admin đã mở. Dịch khi thuê phòng vẫn bằng model Groq đã mở. Nhận dạng Deepgram, AssemblyAI, Speechmatics, Soniox và ElevenLabs dùng key của chính nhà đó do bạn nhập và cần link file trực tiếp. Giọng đọc ElevenLabs khi thuê phòng dùng key ElevenLabs của bạn, chỉ với giọng Admin đã mở; phòng không lưu key và không trừ Token dịch.
      </p>
      <p>
        Nhận dạng tính theo giây âm thanh, tối thiểu 10 giây mỗi lần. Dịch tính theo lượng chữ gửi đi. Một model đắt hơn thì lần chạy trừ nhiều Token dịch hơn. Giá lấy từ giá niêm yết, không đặt giá riêng từng model. Giá Alibaba lấy theo bảng niêm yết vùng Singapore khi phòng đọc được; chưa đọc được thì dùng giá dự phòng đã gắn sẵn. Giọng đọc Aura tính theo số chữ đọc, giá lấy từ giá niêm yết Deepgram đã gắn sẵn. Giọng đọc ElevenLabs cũng tính theo số chữ đọc, theo bảng giá niêm yết đã gắn sẵn. Giá AssemblyAI, Speechmatics, Soniox và ElevenLabs là bảng giá niêm yết đã gắn sẵn trong phòng, không tự cập nhật; Admin có thể sửa tay khi nhà đổi giá. Dịch trực tiếp trừ cùng Token dịch theo phần đã dịch, không giữ số dư. Hết Token dịch thì phiên dừng. Khi cầu nối không nghe thấy tiếng liền 5 phút (video dừng, tab tắt tiếng), phiên tự dừng để không trừ Token lúc im lặng; Admin có thể đổi số phút này hoặc tắt, và phần giữ thừa được trả lại như khi bạn bấm Dừng. Khi cầu nối cập nhật, phòng chờ các phiên đang chạy xong rồi mới cập nhật; nếu buộc phải dừng giữa chừng thì phiên dừng nhẹ, phần đã dịch được trừ và phần giữ thừa được trả lại.
      </p>
      <p>
        Orpheus khi dùng key của phòng tính theo giá gốc rồi trừ Token dịch. Neural và giọng máy không trừ. Thuê phòng giữ giá tay, trả bằng chuyển khoản đúng giá, không tính theo Token dịch.
      </p>
      <p>
        Trước khi chạy cửa trả theo lượt, phòng giữ số Token dịch ước tính. Khi xong, phòng trừ số thực và trả phần giữ thừa vào gói còn hạn. Đoạn nhà phát hành báo lỗi thì không trừ. Gói hết hạn thì phần còn lại mất, không đổi lại thành tiền. Giá gói mới có thể đổi. Gói đã mua giữ nguyên số đến hết hạn.
      </p>

      <h2>5. Dữ liệu đi những đâu</h2>
      <p>
        Key Groq, key Alibaba, key Deepgram, key AssemblyAI, key Speechmatics, key Soniox, key ElevenLabs, tên video, ghi chú, thuật ngữ bạn thêm và giọng đã khóa được lưu trên máy bạn. Phụ đề bạn đã làm (câu gốc, bản dịch, giờ hiện và bảng nhân vật) của tối đa 5 tệp gần nhất cũng được lưu trên máy bạn, để tải lại trang không mất phần đã trả; bấm Làm lại là xóa bản lưu của tệp đó. Chữ của phiên Dịch trực tiếp gần nhất (câu gốc, bản dịch, giờ) và các từ bạn ghi ở ô «Từ cần giữ đúng» cũng được lưu trên máy bạn; bấm Xóa bản lưu là xóa chữ của phiên đó. Lần đồng ý điều khoản cũng lưu trên máy. Khi bạn đã đăng nhập, máy chủ ghi số phiên bản điều khoản theo tài khoản. Xóa dữ liệu trang là mất các mục trên máy, không xóa dòng đã ghi trên máy chủ.
      </p>
      <p>
        Lời thoại được gửi tới nhà nhận dạng bạn chọn, theo điều khoản của nhà đó. Câu thoại cần dịch, phân tích nội dung hay trau chuốt được gửi tới nhà có model dịch bạn chọn, hoặc nhà mà chế độ Tự động chọn trong số nhà bạn có key hay phòng đang mở: Groq xử lý ở Hoa Kỳ, Alibaba (Qwen) xử lý theo vùng Singapore. Groq xử lý ở Hoa Kỳ. Alibaba Filetrans xử lý theo vùng Singapore, và link file trực tiếp cũng được gửi tới Alibaba. Deepgram nhận dạng theo điều khoản của Deepgram, một công ty Hoa Kỳ, và link file trực tiếp cũng được gửi tới Deepgram. Chữ cần đọc bằng giọng Aura cũng được gửi tới Deepgram. AssemblyAI nhận dạng theo điều khoản của AssemblyAI, một công ty Hoa Kỳ, và link file trực tiếp cũng được gửi tới AssemblyAI. Speechmatics nhận dạng theo điều khoản của Speechmatics, một công ty Anh, phòng đang dùng máy chủ vùng Hoa Kỳ (US1), và link file trực tiếp cũng được gửi tới Speechmatics. Soniox nhận dạng theo điều khoản của Soniox; nơi đặt máy chủ do Soniox công bố, và link file trực tiếp cũng được gửi tới Soniox. ElevenLabs nhận dạng theo điều khoản của ElevenLabs, một công ty Hoa Kỳ, phòng dùng máy chủ chung của ElevenLabs (không chọn vùng lưu riêng), và link file trực tiếp cũng được gửi tới ElevenLabs. Chữ cần đọc bằng giọng ElevenLabs cũng được gửi tới ElevenLabs. Ở Dịch trực tiếp, âm thanh đang thu và các từ bạn ghi ở ô «Từ cần giữ đúng» được gửi tới Alibaba (Qwen LiveTranslate) qua cầu nối của phòng để dịch; phòng không lưu âm thanh đó. Cầu nối ghi số đo độ trễ của mỗi phiên (model, các khoảng thời gian chờ chữ dịch, số giây tiếng, lý do dừng) để Admin theo dõi tốc độ; số đo này không kèm tài khoản, chữ hay tiếng, và được xóa sau 30 ngày. Phòng gửi lệnh xóa bản nhận dạng ngay sau mỗi lần chạy, nhưng việc nhà đó có xóa thật hay không là theo điều khoản của nhà đó. Đây là chuyển dữ liệu ra ngoài Việt Nam để làm đúng việc bạn yêu cầu. File video xử lý trên máy bạn. Phòng không lưu video.
      </p>
      <p>
        Để phát hiện dùng chung, bán lại, lách dùng thử, báo chuyển khoản không có thật và làm quá tải trang (mục 10), phòng ghi theo tài khoản: giờ đăng ký, đăng nhập và lúc đang dùng web; địa chỉ mạng; loại trình duyệt; mã máy do trình duyệt tạo; lần nhận dùng thử; lần bấm «Tôi đã chuyển»; lần bị chặn vì gửi quá nhanh; địa chỉ mạng của mỗi máy ứng dụng Android. Các dữ kiện này giữ 180 ngày rồi tự xóa (lần bị chặn giữ 30 ngày, địa chỉ mạng của máy ứng dụng giữ 90 ngày), chỉ Quản lý và Admin xem được, và không dùng vào việc khác.
      </p>
      <p>
        Khi bạn liên kết ứng dụng Android, phòng ghi tên máy (hãng và đời máy) và lúc dùng gần nhất theo tài khoản, để bạn xem và gỡ ở trang Tài khoản. Phòng chỉ giữ bản băm của mã liên kết và khóa máy, không giữ bản gốc; khóa máy nằm trong ứng dụng trên điện thoại của bạn. Bấm Gỡ liên kết, đổi hoặc đặt lại mật khẩu, hay để máy không dùng quá 90 ngày là khóa đó hết dùng được. Tiếng mà ứng dụng thu được gửi qua cầu nối của phòng tới Alibaba (Qwen LiveTranslate) như Dịch trực tiếp trên web; phòng không lưu tiếng đó. Ứng dụng lưu trên điện thoại địa chỉ web, ngôn ngữ, cách hiện phụ đề, các từ bạn ghi ở ô «Từ cần giữ đúng» và chữ của phiên gần nhất (câu gốc, bản dịch, giờ); bấm Xóa bản lưu là xóa chữ của phiên đó. Từ cần giữ đúng được gửi qua cầu nối tới Alibaba như trên web. Tệp phụ đề bạn tải về hay gửi đi nằm ngoài ứng dụng, do bạn giữ.
      </p>
      <p>
        Khi bật thuyết minh Neural, câu chữ được gửi qua phòng tới dịch vụ đọc giọng. Giọng máy của trình duyệt đọc trên thiết bị của bạn. Orpheus khi bạn dùng key của mình thì gửi chữ tới Groq bằng key đó. Orpheus khi dùng key của phòng thì gửi chữ tới Groq bằng key của phòng và trừ Token dịch.
      </p>
      <p>
        Mỗi lần nhận dạng xong, app gửi lên phòng một bản số liệu chất lượng để Admin biết hệ thống chạy tốt hay kém. Bản này chỉ có số: phiên bản app, bạn dùng key riêng hay key của phòng, tên model, ngôn ngữ nguồn đã chọn, độ dài âm thanh, số đoạn và số câu, mức tin cậy Whisper tự báo, số đoạn lỗi, và kết quả kiểm tra ngôn ngữ nếu bạn bật. Việc này áp dụng cả khi bạn dùng key riêng và không có công tắc tắt riêng. Không gửi phụ đề, lời thoại, tên file, tên phim, video, âm thanh hay key. Bản số liệu không có mã hay email tài khoản của bạn. Chỉ Admin xem được các số đã gộp.
      </p>
      <p>
        Lần đầu vào, app hỏi bạn dùng dịch vụ chủ yếu để làm gì; bạn có thể bỏ qua. Câu trả lời lưu trên máy bạn để đặt sẵn lựa chọn phù hợp. Khi bạn trả lời câu này hoặc chọn cách trả (thuê phòng hay trả theo lượt), app gửi lên phòng một lần đếm ẩn danh: phòng chỉ cộng một vào số lần của lựa chọn đó trong ngày. Lần đếm không kèm mã hay email tài khoản, mã máy hay địa chỉ mạng, nên không ai trong phòng biết bạn đã chọn gì. Admin xem số đã gộp, cùng số tài khoản đang có gói thuê phòng hay Token dịch còn hạn tính từ sổ gói, để biết khách dùng dịch vụ theo cách nào.
      </p>
      <p>
        Khi bạn dùng cửa trả theo lượt, phòng ghi một phiếu cho lần chạy đó. Phiếu có tên tệp, thời lượng, số Token dịch đã giữ và đã trừ. Nhân viên chỉ thấy tên tệp đã che. Chỉ Admin xem được tên đầy đủ, để đối chiếu khi bạn hỏi về một lượt chạy, và mỗi lần xem được ghi vào nhật ký. Phòng không lưu video nên không ai trong phòng xem được video.
      </p>
      <p>
        Thuật ngữ bạn tự thêm chỉ nằm trên máy của bạn. Nếu bạn bật gửi thuật ngữ, phòng nhận một bản sao để xem. Phòng không áp bản đó cho người khác nếu Admin chưa nhận vào bộ chính thức. Không gửi tên người thật, số điện thoại hay địa chỉ.
      </p>
      <p>
        Phòng giữ tài khoản, đơn chuyển khoản, sổ gói và phiếu để đối soát. Bạn có thể ngừng dùng và xóa dữ liệu trên máy. Muốn ngừng hẳn tài khoản thì gửi yêu cầu qua hỗ trợ. Phòng không dùng video của bạn để huấn luyện mô hình.
      </p>

      <h2>6. Phòng không cam kết</h2>
      <p>
        Không cam kết nhận dạng hết câu, dịch đúng ý, giữ đúng tên hay giọng nam nữ, hoặc không mất câu. Kết quả là bản để bạn xem và sửa. Bạn tự kiểm tra trước khi đăng, phát hoặc giao cho người khác.
      </p>
      <p>
        Key sai, hết hạn mức Groq, Alibaba, Deepgram, AssemblyAI, Speechmatics, Soniox hoặc ElevenLabs, mạng lỗi, file hỏng hoặc trình duyệt chặn tiếng có thể làm một lần chạy thất bại. Phòng không bồi thường cho các lần đó khi bạn dùng key của mình. Ở cửa trả theo lượt, đoạn lỗi không bị trừ và phần giữ thừa được trả lại nếu gói còn hạn. Hết hạn thì không trả lại và không hoàn tiền.
      </p>
      <p>Phòng không phải Groq, không phải Alibaba, không phải Deepgram, không phải AssemblyAI, không phải Speechmatics, không phải Soniox, không phải ElevenLabs, không phải nhà sản xuất video, và không phải nơi lưu, phát hay phân phối nội dung.</p>

      <h2>7. Phần mỗi bên chịu</h2>
      <p>Bạn chịu nội dung đưa vào và cách bạn dùng bản dịch, file phụ đề, hoặc tiếng đọc.</p>
      <p>
        Nếu bên thứ ba khiếu nại hay kiện phòng vì nội dung bạn đưa vào hoặc vì cách bạn dùng kết quả, bạn chịu chi phí và thiệt hại phát sinh từ đó, trong phạm vi pháp luật cho phép.
      </p>
      <p>
        Phòng cung cấp công cụ và có trách nhiệm nhận khiếu nại, tạm dừng nội dung bị báo, và không cố ý gây hại. Phòng không chịu thiệt hại gián tiếp do bản dịch sai, mất câu, hay key bị người khác thấy vì bạn để họ dùng máy của bạn.
      </p>
      <p>Điều khoản này không xóa trách nhiệm của phòng nếu phòng cố ý gây hại.</p>

      <h2>8. Khi điều khoản đổi</h2>
      <p>
        Sửa nội dung điều khoản thì số phiên bản đổi. Bản mới hiện lại lúc bạn mở phòng. Bạn phải đồng ý bản mới thì mới dùng tiếp. Không đồng ý thì không dùng tiếp được.
      </p>

      <h2>9. Ngừng dùng</h2>
      <p>Bạn có thể không đồng ý bản mới và rời đi. Phần đã lưu trên máy vẫn còn đến khi bạn xóa dữ liệu của trang. Đơn đã trả và gói đã mở không tự hoàn tiền vì bạn ngừng dùng.</p>

      <h2>10. Khi nào bị khóa hoặc bị cấm</h2>
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
        <li>Có khiếu nại bản quyền đủ thông tin về nội dung bạn xử lý, trong lúc phòng xem xét.</li>
      </ul>
      <p className="gate-label gate-label-ban">Có thể bị cấm nếu</p>
      <ul className="gate-points gate-points-ban">
        <li>Đưa vào phòng nội dung khai thác trẻ em.</li>
        <li>Cố tình tấn công hoặc làm quá tải trang.</li>
        <li>Đưa chứng từ thanh toán giả.</li>
        <li>Bán lại tài khoản hoặc bán lại phòng như dịch vụ của mình.</li>
        <li>Tiếp tục đưa nội dung không có quyền sau khi đã được báo, hoặc bị khiếu nại bản quyền hợp lệ nhiều lần.</li>
      </ul>
      <p className="gate-key">Gỡ khóa hoặc gỡ cấm không xóa lịch sử xử lý.</p>
      <p>
        Phòng tự kiểm các dấu hiệu trên theo ngưỡng công bố trong phòng. Khi có dấu hiệu, phòng lập một hồ sơ (mã RR-…) gồm các dữ kiện cụ thể chụp lại lúc phát hiện (giờ, địa chỉ mạng, máy, đơn, yêu cầu) và mã băm để chứng minh hồ sơ không bị sửa. Người của phòng xem hồ sơ rồi mới khóa hay cấm. Riêng hai việc làm quá tải trang và bấm «Tôi đã chuyển» nhiều lần mà không có tiền về, phòng có thể tự khóa trước để bảo vệ trang, rồi người của phòng xem lại. Lý do khóa hay cấm ghi điều khoản và mã hồ sơ. Bạn có quyền yêu cầu xem hồ sơ của mình qua Yêu cầu xem lại. Hồ sơ giữ đến khi xử lý xong và tối đa 2 năm.
      </p>
      <p>
        Hai tài khoản chỉ bị coi là cùng một người khi dùng chung máy, hoặc chung địa chỉ mạng và cùng đúng một trình duyệt; chỉ chung địa chỉ mạng (thường gặp ở mạng di động, mạng công ty) thì không tính.
      </p>

      <h2>11. Giới thiệu</h2>
      <p>
        Cộng tác viên nhận hoa hồng khi người đăng ký qua mã của mình mua Token dịch hoặc thuê phòng. Hoa hồng tính trên phần lời của đơn (tiền khách trả trừ giá vốn và chi phí vận hành), theo tỷ lệ Admin công bố ở trang Cộng tác viên, và không quá một nửa phần lời đó; đơn lời quá ít thì không có hoa hồng. Mã gắn một lần, không đổi. Không tự giới thiệu. Hoa hồng chờ một thời gian rồi mới rút được; đơn bị hoàn hay hủy thì khoản hoa hồng của đơn đó bị hủy. Phòng có thể tạm dừng mã.
      </p>
      <p>
        Để nhận tiền, cộng tác viên nhập ngân hàng, số tài khoản và tên chủ tài khoản. Phòng lưu thông tin này theo tài khoản, chép lại vào mỗi lệnh rút để đối soát, và chỉ Admin xem được để chuyển tiền. Người được giới thiệu chỉ hiện với cộng tác viên dưới dạng email đã che, kèm ngày gắn mã và việc đã mua hay chưa.
      </p>
    </article>
  );
}

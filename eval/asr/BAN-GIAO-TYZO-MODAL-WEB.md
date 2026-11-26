# Claude tiếp quản TyZo Modal trên web · 26/11/2026

Tiếp tục trên nhánh `tyzo/modal-web` của `thanhnghiaplay-ai/TyZo_Sub_Project`. Bắt đầu từ `main` tại `39eff2b` sau PR #2. Commit `0211c91` thêm lõi nhận dạng. Commit chứa phiếu này lưu phần tích hợp đang dở. Chủ yêu cầu dừng để tiết kiệm hạn mức.

## Quyết định của chủ

- Chỉ bán lượt chạy bằng Token dịch của TyZo. Chuỗi bảo vệ Modal ở máy chủ.
- Hỗ trợ cả hai cách tính giá cho Nhanh và Kỹ. Chủ có thể mở gói bán riêng sau. Chưa có giá bán cụ thể hoặc yêu cầu phát hành gói ngay.
- Duy trì giới hạn 9 máy nhận dạng, gộp cảm thán, giới hạn ký tự phụ đề dịch và dự phòng khi Modal lỗi. Chi tiết thử phim ở dòng 97–109 của BAN-GIAO-2026-11-25.md cùng thư mục. Đọc PROVIDERS.md khi nối các cửa.
- Trả lời chủ bằng tiếng Việt, ngắn gọn. Nếu cần thao tác VPS, ghi tên menu, số mục và giá trị cần nhập. Mở PR cho chủ duyệt trước khi gộp.

## Mã đang có

Bộ xử lý trong src/lib/sub/tyzo-modal.ts đã thử với 18 phần giả, tối đa 9 phần cùng lúc, đúng thứ tự và chỉ chuyển phần lỗi sang dự phòng. Máy chủ dùng TYZO_ASR_URL và TYZO_ASR_TOKEN. Giao diện Admin mới ở Cấu hình → Nhà cung cấp. Bản nháp đã thêm model, đường gửi WAV, quyền truy cập, màn hình đặt giá, lựa chọn trong bảng gói và migration 0037 chụp giá khi mở phiếu.

Giá cố định = giờ âm thanh × đơn giá của luồng. Giá theo sử dụng trong bản nháp = giờ xử lý ASR × đơn giá + phí mô hình chữ do backend báo. Đây là phép tính từ số đo, chưa đối soát hóa đơn Modal, chưa tính đầy đủ thời gian khởi động/chờ hoặc GPU máy chữ. Hiện Admin lưu một chế độ và hai đơn giá cho cả phòng. Nếu cho hai gói có cách tính khác nhau đồng thời, cần gắn chính sách giá theo gói và chụp đúng chính sách trên phiếu.

## Bắt đầu kiểm tra ở đây

1. Chạy npm ci, npm run typecheck, npm test. Lượt tsc gần nhất báo thiếu tyzo-modal trong hai bộ dữ liệu thử audit-note và pack-auto. Đã sửa dữ liệu sau lượt đó, chưa chạy lại. npm test dừng ở bốn bài scripts/brand-check, check-auth-invariant, with-app-env, write-atomic. So sánh cùng môi trường với main để phân biệt lỗi nền. Chưa xác nhận build, lint, PostgreSQL thật, trình duyệt hoặc Modal thật.
2. Ưu tiên đường thu tiền trong tyzo-modal-call.ts, run-turn.ts và token-flow.ts. Kiểm tra giữ/trừ/hoàn khi chín phần chạy đồng thời, gửi lại, mất kết nối hoặc đóng phiếu. Bản nháp giữ thời lượng trước khi gọi GPU, tính Token sau khi nhận kết quả. Chưa có mã chống trừ lặp theo phần, chưa xử lý đầy đủ số thực trừ thấp hơn số phải thu. Kiểm tra tỷ giá, chi phí nhà cung cấp và việc giá đổi giữa chừng. Đối chiếu thời lượng phim với thời lượng các đoạn sau lọc im lặng ở chế độ giá cố định.
3. Kiểm tra cửa thực của use-pipeline.ts và groq.ts. Lõi thử có dự phòng, gộp cảm thán và tính ngân sách ký tự, nhưng chưa nối đủ các chức năng này vào đường chạy web. Kiểm tra WAV, tự nhận ngôn ngữ, HTTP 303, hủy lượt và giới hạn 9. Xác minh backend và giao diện đều khóa cửa dùng key khách, gói thuê và các đường quản trị key chung cho nhà chỉ trả theo lượt.
4. Thử từ Admin đặt giá → tạo gói thử → khách chọn Nhanh/Kỹ → báo số Token giữ → dịch → đóng phiếu. Dùng máy chủ giả và DB thử trước. Làm đủ kiểm tra, điều khoản và ghi chú phiên bản theo quy tắc dự án trước khi mở PR sẵn sàng duyệt. Chưa triển khai hoặc trừ Token khách thật.

## Ghi chú riêng về sao lưu

PR #2 đã gộp vào main. Bản đó xử lý menu tyzo, chưa chép tyzo-ai.conf như ghi chú bàn giao ban đầu. Cần báo chủ trước khi dựa vào bản sao đó để chuyển VPS Modal.

## Claude kiểm tra tính Token · 26/11/2026

- `npm ci`, `npm run typecheck`, `npm test` (1 506 bài), `eslint` các tệp TyZo: đều qua. Ba bài hỏng trước đó là do nhà mới: thêm `tyzo-modal` vào danh sách nhà nhận dạng trong `service-pack.test.ts`, điểm ƯỚC LƯỢNG ở `model-grade.ts`, giá dự phòng (chỉ để hiện ước tính) ở `types.ts`.
- Thu tiền tách sang `src/lib/tyzo-modal-charge.ts` (`runModalPartWith`), cửa `tyzo-modal-call.ts` chỉ còn kiểm WAV, giá và gọi Modal.
  - Chống trừ lặp: bảng `run_modal_parts` (phiếu, SHA-256 âm thanh). Gửi lại đoạn đã xong thì trả kết quả cũ, không gọi GPU, không trừ; gửi trùng lúc đang chạy thì từ chối.
  - Trước khi gọi GPU: còn giữ đủ Token cho ước tính đoạn (giờ phim × đơn giá trên phiếu) và không vượt thời lượng phiếu.
  - Modal lỗi: trả lại thời lượng, xóa đoạn, gửi lại được.
  - Số thực vượt phần còn giữ: trừ hết phần còn lại, ghi phần thiếu vào `run_tickets.modal_short` để Chủ đối soát (không trừ thêm của khách).
  - Migration 0037 thêm `modal_short` và bảng `run_modal_parts` (0037 chưa lên `main`).
  - 10 bài thử trên PGlite (`tyzo-modal-charge.test.ts`): trừ đúng, gửi lại, gửi trùng, lỗi, 9 đoạn cùng lúc, thiếu giữ, vượt thời lượng, thu thiếu, đóng phiếu hoàn phần thừa, sai chủ phiếu/model. PGlite chạy tuần tự; khóa khi nhiều kết nối dựa vào `for update` trong `chargeTokenWith` và câu cập nhật nguyên khối, chưa thử trên Postgres nhiều kết nối.
- Còn mở (chưa làm, trước khi bật cho khách):
  1. Khách hủy giữa chừng: Modal vẫn chạy và tốn GPU nhưng phiếu trả lại thời lượng, không thu. Giới hạn bởi takeRate 120/60 giây; cần chính sách (ví dụ chế độ giá cố định vẫn thu khi Modal đã nhận đoạn).
  2. Cửa web (`use-pipeline.ts`, `groq.ts`) mới gửi đoạn và giới hạn 9; CHƯA nối gộp cảm thán, giới hạn ký tự dịch, dự phòng sang nhà khác khi Modal lỗi.
  3. Hai gói khác cách tính giá cùng lúc: Admin mới lưu một chế độ cho cả phòng.
  4. Điều khoản (nhà nhận dữ liệu tiếng mới: Modal), nâng phiên bản và CHANGELOG: chưa làm. Chưa thử trình duyệt, Postgres thật, Modal thật.

## Claude làm 4 việc còn mở · 26/11/2026 (v5.47.0, điều khoản 2026-11-26.1)

1. **Khách hủy giữa chừng:** cửa máy chủ không còn gắn với kết nối trình duyệt; đoạn đã gửi chạy xong, được tính và lưu, gửi lại nhận kết quả cũ, không trừ lần hai. Điều khoản ghi rõ.
2. **Cửa web:** gộp cảm thán lặp (`src/lib/sub/merge-interjections.ts`, 2 bài thử) áp cho kết quả Modal; lỗi tạm (mạng, HTTP 5xx/429, hết giờ) thử lại 1 lần sau 3 giây (`isTransientModalError`). CHƯA làm, cố ý để PR khác: chuyển sang nhà khác khi Modal lỗi hẳn (cần đổi model nhận dạng trên phiếu đang mở, ảnh hưởng cách tính tiền), và giới hạn ký tự theo thời gian từng câu (lời nhắc dịch dùng chung cho mọi nhà, hiện đã có quy tắc khoảng 40 ký tự mỗi dòng, tối đa 2 dòng). Đoạn lỗi hẳn đi theo đường lỗi sẵn có của phiếu (đóng phiếu thì trả phần giữ thừa).
3. **Hai gói khác cách tính:** giữ một cách tính cho cả phòng; màn Admin ghi rõ, phiếu đã mở giữ giá lúc mở.
4. **Điều khoản 2026-11-26.1** (Modal Labs Hoa Kỳ nhận âm thanh, hợp nhất chữ trên Modal hoặc Alibaba Singapore, giữ chữ từng đoạn tối đa 24 giờ, cách tính khi hủy, giá TyZo do phòng đặt), dấu vân tay ở `entry-gate.test.ts`, v5.47.0 và CHANGELOG. `run_modal_parts` tự xóa dòng quá 24 giờ.

Kiểm tra: tsc, `npm test` 1 508 bài, eslint tệp sửa, `vite build`: qua. CHƯA: trình duyệt, Modal thật, Postgres thật nhiều kết nối, tiền thật. BANG_DIEU.md chưa sửa (chỉ sửa khi lên `work`/`main`).

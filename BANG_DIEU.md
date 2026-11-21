# Bảng điều khiển — TyZo Sub

Đọc file này trước khi làm bất cứ việc gì. Đây là chỗ nhìn một lần để biết dự án đang ở đâu. Không đọc nhật ký cũ để lấy lệnh.

Thứ tự khi các câu khác nhau:

1. Câu người dùng nói trong lượt này. Yêu cầu đứng trước quy tắc: khi khác quy tắc thì làm theo yêu cầu, nói rõ đang khác chỗ nào, và ghi vào «Ý đã nêu». Yêu cầu sửa trực tiếp cũng đủ để vai Thẩm định sửa code.
2. File này, rồi `huongdan.txt`.
3. Bảng trạng thái ở đầu `PROJECT_STATUS.md`.
4. Phần còn lại của `PROJECT_STATUS.md`, `HANDOFF.md` và `docs/lich-su/` chỉ để tra. Không được làm theo đoạn cũ.

`HANDOFF.md` là phiếu bàn giao (việc đang làm, việc còn lại), không phải bộ luật thứ hai. Nhật ký cũ nằm ở `docs/lich-su/`.

## Đang chạy

| Mục | Giá trị |
|---|---|
| Bản khách đang dùng | Nhánh `main` = v5.19.0 (đẩy chính thức 20/11/2026). `main` = `work`. |
| Bản mới nhất | v5.19.0 trên `work`: dịch bằng nhiều nhà (Groq, Alibaba Qwen), phân loại model theo nhà và việc, nhà mới tự theo luật chung. Lịch sử các bản: `CHANGELOG` trong `src/lib/app-version.ts` |
| Điều khoản | 2026-11-20.1 |
| Giá | 9.000 đ / 24 giờ, 39.000 đ / 7 ngày, 99.000 đ / 30 ngày |
| Dùng thử | Đã đăng nhập, 1 tệp, tối đa 10 phút, không quá 100 MB, không xuất file Vietsub |
| Key | Key Groq là của khách. Mua Token dịch và thuê phòng bằng chuyển khoản đúng giá (mã QR), không giữ số dư để chi. Số dư cũ đã đưa về 0, không hoàn. Trả theo lượt, dịch trực tiếp và Orpheus khi dùng key phòng trừ Token dịch. Neural không trừ. Hết hạn thì phần còn mất, không hoàn tiền. Cửa giữ số ước tính, trừ số thực khi xong, trả phần thừa nếu gói còn hạn |
| Kho | `thanhnghiaplay-ai/TyZo_Sub_Project`. Bản nén không làm gốc. Trước khi sửa, số phiên bản trong máy phải khớp `main` |
| Nhánh | Sửa trên `work`. Nhánh `main` chỉ đổi khi người dùng nói đúng câu «đẩy chính thức» |



## Ba vai

Không ai vừa đề xuất vừa tự nhận là đã duyệt.

| Vai | Model | Được làm | Không được làm |
|---|---|---|---|
| Làm | Grok | Sửa code, nâng phiên bản, điều khoản, văn phong, đẩy nhánh `work` | Tự thêm phạm vi, tự ghi đã duyệt, đẩy thẳng `main` |
| Thẩm định | Claude | Đọc code và bản vừa làm. Ghi lỗi còn đó hoặc lỗi mới: mức nặng, chỗ nào, vì sao. Ghi vào mục «Còn mở» và «Ý đã nêu» | Sửa sản phẩm, trừ khi người dùng nói «Claude sửa» hoặc yêu cầu sửa trực tiếp |
| Cố vấn | ChatGPT | Đề xuất hướng đi. Ghi khả thi: làm ngay, làm sau, hoặc không làm | Sửa code, đẩy kho, đổi giá, đổi điều khoản |

Người dùng là người chốt. Câu khởi đầu cho model khác chỉ cần: «Đọc `BANG_DIEU.md` và làm đúng vai của mình.»

## Việc đang giữ

Không có việc đẩy dở. `HANDOFF.md` mục 2 không còn việc mở (Chủ xác nhận 20/11/2026).

## Thư — còn lại

Làm lần lượt khi người dùng yêu cầu. Mục nào xong thì xóa khỏi danh sách này, không gạch và không giữ lại.

1. Gắn tên miền gửi trên Resend. Chưa gắn thì thư chỉ tới email đã đăng ký Resend.
2. Thử xác minh, chưa bật chặn. Bật gửi thư xác minh, nhận thư, bấm liên kết, đăng nhập lại.
3. Thử quên mật khẩu. Bật công tắc, nhận thư, đặt mật khẩu mới, đăng nhập bằng mật khẩu đó.
4. Bật chặn chỉ sau khi email Chủ đã xác minh. Bật sớm thì tài khoản chưa xác minh không vào được.
5. Thư báo đổi mật khẩu trong trang tài khoản. Công tắc hiện chỉ chạy khi đặt lại qua thư quên mật khẩu.

Thư chào mừng và thư đăng nhập lạ không nằm trong danh sách này.

## Ý đã nêu

| Thời điểm | Vai | Ý | Khả thi | Trạng thái |
|---|---|---|---|---|
| 2026-11-21 | Người dùng chốt | Hạn chế tối đa pháp lý bản quyền video, như công cụ SaaS AI theo nhu cầu. Chọn: bỏ «phim mới chiếu», gộp 3 loại người lớn thành «Phim có nhãn 18+»; giữ lưu tên tệp như cũ; xác nhận quyền mỗi tệp một lần; đổi toàn bộ cách gọi | Làm ngay | v5.20.0 trên nhánh phiên `ccr-bc99847a-xy1bgk`, chưa lên `work`. Điều khoản 2026-11-21.1. Nên nhờ luật sư xem điều khoản |
| 2026-11-20 22:30 | Người dùng chốt | Model dịch, nhận dạng và mọi chức năng dùng model phải theo nhiều nhà cung cấp, phân loại model theo nhà và việc làm được; nhà mới thêm sau cũng vậy. «Claude sửa» | Làm ngay | Đã vào `work` và `main` trong v5.19.0 (đẩy chính thức 20/11/2026). Điều khoản 2026-11-20.1. Thuyết minh (đọc giọng) vẫn mỗi nhà một đường riêng, chưa gom |
| 2026-11-18 22:23 | Người dùng chốt | Rút gọn năm đoạn nhà nhận dạng trong phòng dịch thành một đoạn | Làm ngay | Đã vào work trong v5.6.1. Không đổi điều khoản |
| 2026-11-17 00:35 | Người dùng chốt | Làm lại điều khoản và chính sách cho khớp web và luật. Cái cần thì làm | Làm ngay | Đã vào work trong v5.0.1. Một trang, không tách file. Điều khoản 2026-11-17.1 |
| 2026-11-16 23:55 | Người dùng chốt | Bỏ nạp số dư. Mua Token dịch và thuê phòng tạo mã QR đúng giá. Orpheus trừ Token dịch. Reset số dư test, không hoàn | Làm ngay | Đã vào work trong v5.0.0. Điều khoản 2026-11-16.4 |
| 2026-11-16 22:12 | Người dùng chốt | Làm bước 5 đến 8 gói giây | Làm ngay | Đã vào work trong v4.1.0. Điều khoản 2026-11-16.2 |
| 2026-11-16 21:50 | Người dùng chốt | Làm bước 1 đến 4 gói giây: 1 giây = 1 giây Turbo giá gốc; gói có hạn, giá tự tính; mua bằng số dư đồng; lần chạy trừ giây. Không quy đổi số dư cũ. Bước 5 đến 8 chưa làm | Làm ngay | Đã vào work trong v4.0.0. Điều khoản 2026-11-16.1 |
| 2026-11-14 | Người dùng chốt | Yêu cầu là ưu tiên, rồi mới đến quy tắc | Làm ngay | Đã có ở thứ tự ưu tiên số 1 của file này; thêm giải thích và dòng ƯU TIÊN đầu `huongdan.txt`. Yêu cầu sửa trực tiếp đủ để Claude sửa code |
| 2026-11-14 | Người dùng chốt | Làm xong mỗi bước thì đẩy `work` rồi mới làm bước khác; mục đã đẩy thì kiểm lại trước khi làm tiếp | Làm ngay | Đã ghi vào «Khi một bản hoàn thành» ở đây và `huongdan.txt` mục 15, 27 |
| 2026-11-15 02:10 | Người dùng chốt | Ba góp ý giao diện: (1) điều khoản chỉ còn ba chỗ (ô tích, menu trái, Tài khoản); (2) nút quay lại ở đầu các trang; (3) hiện tên tệp đầy đủ trong Phiếu cho Chủ, có nhật ký | Làm ngay | (1) và (2) vào `work` trong v3.42.0; tab cùng trang chọn «về tab vừa xem». (3) vào `work` trong v3.43.0 theo đề xuất (che ở máy chủ, chỉ Chủ xem, có nhật ký, sửa điều khoản) |
| 2026-11-15 00:14 | Người dùng chốt | Ba phần Hướng dẫn: (1) trang /huong-dan có menu trái, Ctrl+K, tìm kiếm, nút «Chỉ tôi», liên hệ do Chủ nhập ở Admin; (2) hướng dẫn chỉ đúng chỗ bấm, làm mờ phần còn lại; (3) gom điều khoản về một chỗ. Làm cả ba, từng bước. Nội dung hướng dẫn phải còn đúng khi app đổi | Làm theo giai đoạn | Phần 1 vào `work` trong v3.39.0 (giá, hạn dùng thử, thời gian giữ đơn lấy từ hằng số; `guide-topics.test.ts` kiểm tên nút còn khớp giao diện). Phần 2 (tour làm tối nền) trong v3.40.0. Phần 3 (điều khoản) trong v3.41.0 |
| 2026-11-14 20:10 | Người dùng chốt | Bảy mục «giao diện nhẹ kiểu tương lai» (một ô trung tâm, dòng thời gian tiến trình, xem trước là chính, tiền và hạn mức, giao diện nhẹ, phím tắt, chức năng nâng cao nằm sau một lớp). Làm theo ba bản nhỏ | Làm theo giai đoạn | Mục 1 và 6 vào `work` trong v3.32.0; mục 2 và 3 trong v3.33.0; mục 4 trong v3.34.0. Mục 7 (đưa Thuật ngữ, gói dịch vào menu trái) làm ở v3.35.0. Mục 5 (khoảng trống, chữ lớn, hiệu ứng kéo thả) làm ở v3.36.0 |
| 2026-11-14 10:03 | Người dùng chốt | Gói cải tiến Admin A–F (Tổng quan, tab Việc, Doanh thu, Chất lượng, nhật ký thao tác, trải nghiệm Admin) | Làm theo giai đoạn | Giai đoạn 1 (A, B, tách nhật ký) đã vào `work` trong v3.30.0. Giai đoạn 2 (C phần mới, F giao diện) đã vào `work` trong v3.31.0. D (xem câu lỗi, gửi kiểm tra lại), «chặn toàn bộ phòng», chế độ Chỉ xem chờ người dùng chốt |
| 2026-11-11 03:28 | Người dùng chốt | Sửa layout lệch, hiển thị chưa chính xác ở Admin và phòng dịch. Câu «Claude sửa» | Làm ngay | Đã vào `work` trong v3.10.7 |
| 2026-11-09 09:33 | Làm | Nhật ký khách 3 lớp. Thanh chỉ kéo núm. Đọc trước hoặc sau | Làm ngay | Đã vào `work` trong v2.21.0 |
| 2026-11-09 12:19 | Làm | Thuật ngữ admin có tên Việt, phân trang, ẩn/mở tất cả, khôi phục từ thiếu | Làm ngay | Đã vào `work` trong v2.23.0 |
| 2026-11-09 12:28 | Người dùng chốt | Lời lỗ tách giá vốn. Giữ nguyên 807 câu. Cộng tác viên cả đời, tỷ lệ sửa được, hai cửa. Cổng nạp riêng để sau | Làm ngay | Đã vào `work` trong v3.0.0 |
| 2026-11-09 06:40 | Làm | Giá và tiền chỉ Chủ. Yêu cầu tự chuyển cấp. Số dư hiện khoản giữ | Làm ngay | Đã vào `main` trong v2.20.0 |
| 2026-11-08 20:28 | Làm | Chủ vào lại Admin khi phòng chưa gửi được thư | Làm ngay | Đã vào `main` trong v2.19.2 |
| 2026-11-08 20:03 | Người dùng chốt | Một đường cho ba vai. Làm, Thẩm định, Cố vấn. Nhìn bảng này là đủ | Làm ngay | Đã vào `main` |
| 2026-11-08 19:21 | Làm | Không khóa lượt thử theo máy thật. Không viết bộ giải HE-AAC. Không thêm captcha giả | Không làm | Đã chốt |

Ý mới của Cố vấn hoặc Thẩm định phải thêm một dòng vào bảng này. Không chèn việc mới vào bản đang đóng.

## Còn mở

- 2026-11-17: v5.0.1 trên work. Điều khoản 2026-11-17.1: bản quyền và khiếu nại, Token dịch không phải tiền, dữ liệu ra Groq và Alibaba. Chưa có tên doanh nghiệp. Chưa bấm cửa đồng ý trên điện thoại.
- 2026-11-16: v5.0.0 trên work. Mua Token dịch và thuê phòng bằng mã QR, không giữ số dư để chi. Orpheus trừ Token dịch. Số dư test về 0. Điều khoản 2026-11-16.4. Chưa bấm QR và Orpheus trên điện thoại.
- 2026-11-16: gói giây bước 5–8 đã vào work (v4.1.0). Dịch trực tiếp trừ giây. Thuê phòng giữ giá tay. Đã bỏ ô giá riêng. Alibaba kéo giá Singapore, lỗi thì dùng giá dự phòng.
- 2026-11-16: phần chỗ để riêng 8/8 (v3.47.13) viền huy hiệu, bóng chữ bảo trì và màn hướng dẫn theo token. Mức 1 không đổi hình. Tám phần yêu cầu đã xong. Còn cố ý: màu phụ đề khách chọn, nút tròn, favicon, 5 màu dự phòng tia lửa.
- Git `main` và `work` đã cùng `943c11c` trước bước 2. Dòng «bản khách v2.20.0» và «v3.13.0 chưa lên main» không khớp git. Chưa kiểm bản đang deploy.
- Ba phần Hướng dẫn (user chốt 2026-11-15): đã đẩy đủ trên `work` (v3.39.0, v3.40.0, v3.41.0). Còn chờ người dùng: (a) chữ §2, §6, §7 của điều khoản vẫn nói «bấm đồng ý» và «màn mở phòng»; sửa cho khớp ô tích thì phải nâng `TERMS_VERSION` và mọi người bị hỏi lại; (b) `/huong-dan` vẫn bọc `EntryGate`, muốn đọc không cần đồng ý thì bỏ lớp bọc; (c) mở thật bằng trình duyệt các tuyến nap-tien, mat-khau, dich-truc-tiep, trang đăng nhập có ô tích và trang /dieu-khoan, ở điện thoại lẫn máy tính, kể cả Safari.

- Gói Admin A–F, phần chưa làm (chờ người dùng chốt): D (Chất lượng): bảng `quality_runs` cố ý không lưu tài khoản, tên tệp hay chữ phụ đề, nên «bấm vào lần chạy kém xem câu lỗi» và «gửi yêu cầu kiểm tra lại» cần đổi cách lưu và sửa điều khoản (khách đồng ý lại). Thống kê theo model và cảnh báo chủ động đã có. F: chế độ Chỉ xem cho Hỗ trợ (cần nói rõ chặn thao tác nào, vì Hỗ trợ hiện trả lời yêu cầu của khách). Bảo trì «chặn toàn bộ phòng» đụng điều khoản. Cảnh báo key hết hạn và rate-limit chưa làm được vì app không ghi dữ liệu đó. Đã xong ở v3.31.0: Ctrl+K, thanh bên, mobile, và phần mới của C.
- Lọc tiếng người bằng VAD đã đối chiếu tên tensor, chưa bấm trên điện thoại thật.
- Mục 13.2 không được code: chủ web giữ key để tính tiền theo phút, và dán link tải video.
- Mục 14 không được code cho đến khi người dùng yêu cầu đúng một việc. Không đổi model nhận dạng khi chưa có số đo.
- Không bán key Groq. Không nhận link video.
- Đã kiểm lại 2026-11-16 06:49: `npx tsc --noEmit` sạch. Dòng cũ nói 5 lỗi ở `watch-run.ts`, `watch-save.ts`, `room-alibaba.ts` không còn.

## Không làm

Chỉ mở lại khi người dùng yêu cầu đúng việc đó.

- Không khóa lượt thử theo máy thật. Mã máy do trình duyệt tự sinh.
- Không viết bộ giải HE-AAC. Không đọc hết mọi bản elst. HE-AAC để trình duyệt giải.
- Không thêm captcha giả. Đã có trần theo email, trần chung, và trần theo địa chỉ mạng khi máy chủ thấy địa chỉ.

## Chờ người dùng

- Trên Vercel, `ADMIN_EMAIL` phải là đúng email tài khoản Chủ thì `/admin` mới mở.
- Bật trên GitHub, nếu muốn khóa cứng: nhánh `main` chỉ nhận bản hợp nhất, model không có quyền xóa kho. Không bật thì luật này chỉ là lời nhắc.

## Khi một bản hoàn thành

Vai Làm tự làm các mục dưới đây trước khi báo xong. Không chờ nhắc.

- Đổi cái khách nhìn thấy thì nâng `APP_VERSION` theo `huongdan.txt` mục 10, và thêm một mục `CHANGELOG` theo 3 lớp: một câu tiêu đề, 1 đến 4 dòng, không ghi việc nội bộ. Việc nội bộ vào `ADMIN_LOG`. Giờ Việt Nam lấy từ lệnh `date`. `app-version.test.ts` phải xanh.
- Đổi giá, quyền, hạn mức, dữ liệu, trách nhiệm, khóa hoặc cấm thì sửa điều khoản đúng chỗ rồi nâng `TERMS_VERSION`. Chỉ đổi giao diện thì không sửa điều khoản.
- Chỉ sửa tài liệu thì không nâng số phiên bản.
- Sửa bảng này, dòng «Đang chạy» trong `huongdan.txt`, bảng đầu `PROJECT_STATUS.md`, và một dòng nhật ký. Phiếu bàn giao ghi đã làm, chưa làm, cố ý không làm.
- Có sửa `src/` thì chạy `npx tsc --noEmit`. Đụng logic đã có test thì chạy test đó. Ghi kết quả thật. Không ghi pass khi chưa chạy.
- Đẩy nhánh `work`. Không đẩy `main` cho đến câu «đẩy chính thức». Không đóng bản nén, trừ khi người dùng yêu cầu.
- **Làm xong mỗi bước thì đẩy `work` ngay, rồi mới làm bước kế tiếp.** Một bước là một mục hoặc một bản nhỏ. Trước khi đẩy phải chạy `npm test` và `npx tsc --noEmit`; test còn lỗi thì không đẩy, sửa xong mới đẩy (lệnh đẩy phải đặt sau điều kiện test pass, không nối tiếp vô điều kiện). Mục đã đẩy từ trước thì kiểm lại đã đủ chưa; đủ thì làm tiếp mục còn lại, thiếu thì sửa và đẩy lại trước. Không gom nhiều bước vào một lần đẩy.
- Không ghi token, mật khẩu, key vào file hoặc vào cuộc trò chuyện.

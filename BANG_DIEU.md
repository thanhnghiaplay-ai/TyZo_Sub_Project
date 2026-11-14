# Bảng điều khiển — TyZo Sub

Đọc file này trước khi làm bất cứ việc gì. Đây là chỗ nhìn một lần để biết dự án đang ở đâu. Không đọc nhật ký cũ để lấy lệnh.

Thứ tự khi các câu khác nhau:

1. Câu người dùng nói trong lượt này. Yêu cầu đứng trước quy tắc: khi khác quy tắc thì làm theo yêu cầu, nói rõ đang khác chỗ nào, và ghi vào «Ý đã nêu». Yêu cầu sửa trực tiếp cũng đủ để vai Thẩm định sửa code.
2. File này, rồi `huongdan.txt`.
3. Bảng trạng thái ở đầu `PROJECT_STATUS.md`.
4. Phần còn lại của `PROJECT_STATUS.md` và `HANDOFF.md` chỉ để tra. Không được làm theo đoạn cũ.

`HANDOFF.md` là phiếu bàn giao một lần, không phải bộ luật thứ hai.

## Đang chạy

| Mục | Giá trị |
|---|---|
| Bản khách đang dùng | v2.20.0 trên nhánh `main` |
| Bản đang làm | v3.37.0 trên nhánh `work`: chạy tốt theo từng loại thiết bị. Trước đó v3.36.0: trang chủ thoáng hơn, chữ lớn hơn, kéo thả có hiệu ứng. Trước đó v3.35.0: Thuật ngữ và Gói dịch vào nhóm Nâng cao của menu trái. Trước đó v3.34.0: thấy số dư còn bao nhiêu phút, ước tính trước khi chạy và nạp nhanh tại chỗ khi chọn Trả theo lượt. Trước đó v3.33.0: thanh tiến trình liền, sửa câu tại dòng, menu tải SRT/VTT/TXT. Trước đó v3.32.0: trang chủ một ô thả lớn, dán link tự bắt đầu, Ctrl+K cho trang khách. Trước đó v3.31.2: menu ba gạch trái dùng chung cho Admin và trang khách (nhóm lớn bao mục nhỏ, Đăng xuất ở cuối), mọi tab Admin dùng thẻ cùng khung (admin-card), key Groq và Alibaba xếp đôi, phần soạn thư và icon gập. Trước đó v3.31.1: các tab Admin xếp lưới đều, tab Cấu hình mới gom key Groq/Alibaba, giá, gói dịch, model thuê phòng, cổng nạp (phần dài gập lại). Trước đó v3.31.0: Admin có thanh bên trái, Ctrl+K, hàng nút điện thoại dính khi cuộn, trang Doanh thu thêm biểu đồ đường, ARPU, tỷ lệ dùng thử → mua, giá vốn mỗi phút âm thanh, chi phí ghi tay theo loại. Trước đó v3.30.0: Admin có tab Tổng quan, phiếu lọc và tìm được, tách Nhật ký thao tác khỏi Nhật ký hệ thống. Trước đó v3.29.4: báo lỗi rõ hơn (đăng nhập sai, nút đăng nhập khóa + quay, xuất file khi chưa có phụ đề, nhắc link không phải video trực tiếp, banner mất mạng, model key chưa mở bị khóa). Trước đó v3.29.3: lỗi giải mã âm thanh nói rõ file là gì (MKV, AC3, DTS…) và kèm lệnh ffmpeg. Trước đó v3.29.2: hạn chót đọc hết phản hồi Groq, không treo khi thân dữ liệu đứng giữa chừng. Trước đó v3.29.1: nút sáng/tối luôn hiện, chế độ gọn không làm lệch bố cục. Trước đó v3.29.0: nút sáng/tối và gọn/thoải mái, kiểm tra key trước khi dịch. Trước đó v3.28.0: kéo thả video có ảnh xem trước, tiến trình theo bước, hướng dẫn lần đầu. Trước đó v3.27.0: giá vốn phiếu cũ ước tính, Chủ chỉnh ngưỡng chất lượng, thuật ngữ nền tự bật. Trước đó v3.26.0 email đăng nhập dán được, Admin che tên tệp, ghi chú hai cách trả. Điều khoản `2026-11-13.4`. Trước đó v3.25.0 trả theo lượt nhận dạng Alibaba bằng key phòng |
| Điều khoản | 2026-11-13.4 |
| Giá | 9.000 đ / 24 giờ, 39.000 đ / 7 ngày, 99.000 đ / 30 ngày |
| Dùng thử | Đã đăng nhập, 1 tệp, tối đa 10 phút, không quá 100 MB, không xuất file Vietsub |
| Key | Key Groq là của khách. Cửa trả theo lượt dùng key Chủ đã lưu trên máy chủ, khách không thấy key. Cửa giữ khoản ước tính, trừ số thực khi xong, trả phần thừa |
| Kho | `thanhnghiaplay-ai/TyZo_Sub_Project`. Bản nén không làm gốc. Trước khi sửa, số phiên bản trong máy phải khớp `main` |
| Nhánh | Sửa trên `work`. Nhánh `main` chỉ đổi khi người dùng nói đúng câu «đẩy chính thức» |

Bảng này đã ở trên `main` cùng v2.20.0.

## Ba vai

Không ai vừa đề xuất vừa tự nhận là đã duyệt.

| Vai | Model | Được làm | Không được làm |
|---|---|---|---|
| Làm | Grok | Sửa code, nâng phiên bản, điều khoản, văn phong, đẩy nhánh `work` | Tự thêm phạm vi, tự ghi đã duyệt, đẩy thẳng `main` |
| Thẩm định | Claude | Đọc code và bản vừa làm. Ghi lỗi còn đó hoặc lỗi mới: mức nặng, chỗ nào, vì sao. Ghi vào mục «Còn mở» và «Ý đã nêu» | Sửa sản phẩm, trừ khi người dùng nói «Claude sửa» hoặc yêu cầu sửa trực tiếp |
| Cố vấn | ChatGPT | Đề xuất hướng đi. Ghi khả thi: làm ngay, làm sau, hoặc không làm | Sửa code, đẩy kho, đổi giá, đổi điều khoản |

Người dùng là người chốt. Câu khởi đầu cho model khác chỉ cần: «Đọc `BANG_DIEU.md` và làm đúng vai của mình.»

## Việc đang giữ

Không có việc đã đẩy. v3.13.0 đang trên `work`, chưa lên `main`.

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
| 2026-11-14 | Người dùng chốt | Yêu cầu là ưu tiên, rồi mới đến quy tắc | Làm ngay | Đã có ở thứ tự ưu tiên số 1 của file này; thêm giải thích và dòng ƯU TIÊN đầu `huongdan.txt`. Yêu cầu sửa trực tiếp đủ để Claude sửa code |
| 2026-11-14 | Người dùng chốt | Làm xong mỗi bước thì đẩy `work` rồi mới làm bước khác; mục đã đẩy thì kiểm lại trước khi làm tiếp | Làm ngay | Đã ghi vào «Khi một bản hoàn thành» ở đây và `huongdan.txt` mục 15, 27 |
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

- Gói Admin A–F, phần chưa làm (chờ người dùng chốt): D (Chất lượng): bảng `quality_runs` cố ý không lưu tài khoản, tên tệp hay chữ phụ đề, nên «bấm vào lần chạy kém xem câu lỗi» và «gửi yêu cầu kiểm tra lại» cần đổi cách lưu và sửa điều khoản (khách đồng ý lại). Thống kê theo model và cảnh báo chủ động đã có. F: chế độ Chỉ xem cho Hỗ trợ (cần nói rõ chặn thao tác nào, vì Hỗ trợ hiện trả lời yêu cầu của khách). Bảo trì «chặn toàn bộ phòng» đụng điều khoản. Cảnh báo key hết hạn và rate-limit chưa làm được vì app không ghi dữ liệu đó. Đã xong ở v3.31.0: Ctrl+K, thanh bên, mobile, và phần mới của C.
- Lọc tiếng người bằng VAD đã đối chiếu tên tensor, chưa bấm trên điện thoại thật.
- Mục 13.2 không được code: chủ web giữ key để tính tiền theo phút, và dán link tải video.
- Mục 14 không được code cho đến khi người dùng yêu cầu đúng một việc. Không đổi model nhận dạng khi chưa có số đo.
- Không bán key Groq. Không nhận link video.
- Ngoài phạm vi mục 11, chưa sửa: `npx tsc --noEmit` còn 5 lỗi có sẵn ở `watch-run.ts`, `watch-save.ts` (thiếu `stale` trong `Seg`) và `room-alibaba.ts` (`contentType`). `src/routeTree.gen.ts` đã được sinh lại để khớp các route `tai-video`, `relay-alibaba`, `room-alibaba`.

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

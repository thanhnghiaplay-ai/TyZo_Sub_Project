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
| Bản khách đang dùng | Nhánh `main` = v5.36.0 (đẩy chính thức 22/11/2026). `main` = `work`. |
| Bản mới nhất | v5.36.0 trên `work` và `main` (Dịch trực tiếp: phụ đề nổi, chữ lớn, từ cần giữ đúng, lưu phiên trước; điều khoản 2026-11-22.2). v5.35.1: thông báo lỗi gọn, lỗi key rõ hơn. v5.35.0: ElevenLabs nhận dạng (Scribe v3, v2, xóa bản nhận dạng sau mỗi lần chạy) và giọng đọc (Flash v2.5, có tiếng Việt), điều khoản 2026-11-22.1. Bản khách đang dùng xem dòng trên. Lịch sử: `CHANGELOG` trong `src/lib/app-version.ts` |
| Điều khoản | 2026-11-22.2 |
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

Android bước thử: nằm trên nhánh `ccr-a8428a75-e8fyfm`, chưa hợp `work`, chờ Chủ cài thử Bilibili/YouTube/TikTok và gửi ảnh bảng kết quả. Bị chặn thì dừng.

Không có việc đẩy dở. v5.34.0–v5.35.0 (ElevenLabs) đã hợp vào `work` và đẩy chính thức 22/11/2026 (Chủ nói «hợp nhánh work rồi đẩy chính thức»). Chưa thử với key ElevenLabs thật.

`HANDOFF.md` mục 2 không còn việc mở khác (Chủ xác nhận 20/11/2026).

## Thư — còn lại

Làm lần lượt khi người dùng yêu cầu. Mục nào xong thì xóa khỏi danh sách này, không gạch và không giữ lại.

1. Dự phòng, không bắt buộc (Chủ nói 21/11/2026: đang gửi bằng email cá nhân qua SMTP, Resend và nhà khác chỉ để dự phòng). Gắn tên miền trên Resend khi nào muốn dùng. Lưu ý: app chỉ gửi bằng MỘT đường, không tự chuyển sang dự phòng khi đường chính lỗi. Đường đã lưu ở Admin → Thư thắng; không lưu thì lấy biến môi trường theo thứ tự Resend, SendGrid, Brevo, Mailgun, Postmark, SMTP, nên đặt `RESEND_API_KEY` trên Vercel sẽ giành chỗ SMTP.
2. Thử xác minh, chưa bật chặn. Bật gửi thư xác minh, nhận thư, bấm liên kết, đăng nhập lại.
3. Thử quên mật khẩu. Bật công tắc, nhận thư, đặt mật khẩu mới, đăng nhập bằng mật khẩu đó.
4. Bật chặn chỉ sau khi email Chủ đã xác minh. Bật sớm thì tài khoản chưa xác minh không vào được.

Thư chào mừng và thư đăng nhập lạ không nằm trong danh sách này. Mục 5 cũ (thư khi đổi mật khẩu trong trang tài khoản) đã làm ở v5.26.0.

## Ý đã nêu

| Thời điểm | Vai | Ý | Khả thi | Trạng thái |
|---|---|---|---|---|
| 2026-11-22 | Người dùng nêu, Claude đề xuất | Ứng dụng Android: cài vào là dùng dịch tự động cho video đang phát ở ứng dụng khác (Bilibili, YouTube, TikTok), dùng chung tài khoản, Token dịch và cầu nối dịch trực tiếp của web | Làm theo giai đoạn | Bước 1 (thử) đã viết mã 22/11/2026, Claude làm theo yêu cầu trực tiếp, trên nhánh `ccr-a8428a75-e8fyfm` (khác kế hoạch: môi trường chỉ cho đẩy nhánh này, không phải `android-thu`; không hợp vào `work`). Thư mục `android/`, Actions «Android thử» đóng gói tệp cài `tyzo-thu-thu-am` (mục Artifacts). Ứng dụng: chọn Bilibili/YouTube/TikTok/Khác, Bắt đầu/Dừng, thanh mức âm, kết luận ✅/❌, bảng kết quả các lần để chụp gửi lại; không có quyền INTERNET. Chờ Chủ cài thử trên máy thật. Mỗi lần đóng gói một khóa ký khác, cài bản mới phải gỡ bản cũ. Kế hoạch: (1) BƯỚC THỬ: ứng dụng chỉ có nút thu âm ứng dụng khác (Android 10+, AudioPlaybackCapture) và thanh mức âm, không gọi máy chủ; Chủ cài thử xem Bilibili/YouTube/TikTok có chặn thu không; bị chặn thì dừng. (2) Bản dùng được: đăng nhập, Bắt đầu/Dừng, phụ đề nổi (quyền hiển thị trên ứng dụng khác), trừ Token qua cầu nối sẵn có, phát bằng tệp cài từ web. (3) Hoàn thiện, Google Play nếu muốn. Cách làm không ảnh hưởng web: thư mục `android/` (Kotlin) trên nhánh riêng `android-thu`, thêm `android/` vào `.dockerignore`, tệp cài đóng gói bằng GitHub Actions (chỉ chạy khi `android/` đổi), không nâng APP_VERSION, không sửa điều khoản ở bước thử. Không làm được: iPhone (iOS không cho thu âm ứng dụng khác); Claude không thử được trên máy thật, Chủ cài thử và gửi ảnh. Câu khởi đầu cho cuộc mới: «làm bước thử Android» |
| 2026-11-22 | Người dùng chốt, Claude làm | Dịch trực tiếp: phụ đề nổi trên video (thay cho yt-dlp, không tải video), «hoàn thiện hơn» | Làm ngay | Xong v5.36.0, đẩy chính thức 22/11/2026: phụ đề nổi (Document PiP, cửa sổ riêng khi không có), chữ lớn toàn màn hình có nút Bắt đầu/Dừng, tùy chỉnh chữ, từ cần giữ đúng, lưu phiên trước trên máy. Điều khoản 2026-11-22.2. Cần deploy lại cầu nối Fly.io để dùng «từ cần giữ đúng». Đề xuất sau: tiện ích Chrome hiện chữ ngay trên khung video. Không làm: yt-dlp, tải link Bilibili/YouTube (rủi ro bản quyền, ngược quy tắc «không nhận link video») |
| 2026-11-22 | Người dùng nêu, rồi bỏ | Lưu key thì đọc mọi model gọi được và phân loại chính xác (Claude trả lời: Deepgram, Soniox, ElevenLabs giọng đọc phân loại theo nhà được; Groq, Alibaba chỉ đoán theo tên; AssemblyAI, Speechmatics không có lệnh liệt kê; «có trong danh sách» chưa chắc gọi được) | Không làm | Chủ nói «thôi, không cần nữa» |
| 2026-11-22 | Người dùng yêu cầu, Claude làm | ElevenLabs: «làm cho đồng bộ giống các nhà kia», «làm luôn phần giọng đọc», «làm luôn phần dịch» | Đồng bộ và giọng đọc: làm ngay. Dịch: không làm được bằng API của ElevenLabs | Xong v5.35.0 trên `ccr-6b6ee13d-637k1h`: xóa bản nhận dạng sau mỗi lần chạy; giọng Flash v2.5 (tiếng Việt và 13 tiếng khác, không có Thái) ở hai cửa, chọn giọng theo danh sách của key. Dịch: ElevenLabs không có API dịch chữ (chỉ có Dubbing lồng tiếng, 0,33–2,20 đô/phút), chờ Chủ chốt có làm đường Dubbing không. Chạy ngầm kiểu gửi rồi hỏi cần webhook cài ở trang ElevenLabs, chưa làm |
| 2026-11-22 | Người dùng yêu cầu («làm ElevenLabs»), Claude làm | Thêm ElevenLabs làm nhà nhận dạng theo `PROVIDERS.md` bước 1–8. Khác quy tắc ở hai chỗ: vai Thẩm định sửa code (yêu cầu trực tiếp), và đẩy nhánh `ccr-6b6ee13d-637k1h` thay vì `work` (môi trường chỉ cho đẩy nhánh này) | Làm ngay | Xong v5.34.0 trên `ccr-6b6ee13d-637k1h`: Scribe v3, Scribe v2, đủ hai cửa, giá cố định 0,20 đô/giờ, điều khoản 2026-11-22.1. CHƯA thử key ElevenLabs thật. Chưa làm: đọc thuyết minh bằng giọng ElevenLabs, lệnh xóa bản nhận dạng ở ElevenLabs, đường webhook cho file quá 270 giây |
| 2026-11-21 | Người dùng chốt | Nhìn vào là biết lời hay lỗ, đối chiếu được hóa đơn từng nhà cung cấp | Làm ngay | Xong v5.32.0, đẩy chính thức 21/11/2026 (sổ từng nhà bắt đầu ghi từ đây): sổ provider_spend, ô Lời hay lỗ đầu trang Doanh thu. Còn đề xuất cũ: tách doanh thu Token/Thuê phòng, đổi tên ô «Chi phí» |
| 2026-11-21 | Người dùng chốt | Không tự thử trên web thật nữa (mỗi lần thử quá lâu); chỉ thử khi Chủ yêu cầu | Làm ngay | Đã ghi vào `huongdan.txt` mục kiểm thử. Tài khoản thử `claude.thunghiem.tyzo@gmail.com` chờ Chủ xóa; còn một phiếu giữ 1.476 Token tự nhả sau 6 giờ |
| 2026-11-21 | Thẩm định (thử trên bản chính thức) | Người chỉ mua Token dịch bị chặn trả theo lượt và xuất file (quy tắc cũ «chưa từng thuê phòng = dùng thử») | Làm ngay | Chủ nói «làm». Sửa trong v5.31.1: còn Token dịch là chạy và xuất được; chưa chọn gói thì mở bước chọn gói |
| 2026-11-21 | Người dùng nêu | Mục tài khoản có lịch sử đầy đủ: gói, tệp đã dịch, bao lâu, bao nhiêu Token; lịch sử giữ và hoàn Token bị mất | Làm ngay | Xong trong v5.31.0: tab Lượt dịch (đọc phiếu: giữ/trừ/trả lại), lượt thuê phòng ghi trên máy, tab Mua và gói (gói Token còn/hạn). Lịch sử giữ/hoàn «mất» vì từ v5.0.0 nằm trong phiếu, không trong sổ. Chủ xác nhận 21/11/2026 trên bản chính thức: lịch sử lượt dịch hiện đúng |
| 2026-11-21 | Thẩm định (Chủ hỏi) | Trau chuốt nghe cứng. Đề xuất: sửa lệnh mặc định (cho viết lại tự nhiên, ví dụ tiếng Việt, nhiệt độ cao hơn chút, ngữ cảnh rộng hơn), ô «yêu cầu thêm» cho khách mỗi lần trau chuốt, Admin sửa được lệnh theo thể loại (phần khung JSON và ký hiệu thuật ngữ cố định), so trước/sau trên clip mẫu trước khi đổi mặc định | Làm theo giai đoạn | Chủ chốt làm theo thứ tự. Mục 1–2 (lệnh mặc định, ô yêu cầu thêm) xong trong v5.28.0; chưa so với model thật. Mục 3 (Admin sửa lệnh theo thể loại) xong trong v5.29.0, chưa có nút thử 20 câu mẫu. Model trau chuốt vẫn chỉ Groq. Ghi chú cũ: chưa có chỗ sửa lệnh ở Admin (lệnh nằm trong code `genre-prompts.ts`, `polish.ts`); Admin chỉ chọn model trau chuốt ở Cấu hình → Gói |
| 2026-11-21 | Người dùng nêu | Đổi chữ «Chủ» thành «Admin» cho dễ nhìn | Làm ngay sau khi chốt cách gọi | Chủ chọn (a) «Admin». Giao diện xong trong v5.27.1 (57 chỗ). Điều khoản đổi xong trong v5.33.0 (2026-11-21.3). Ghi chú cũ: khoảng 85 chỗ trong giao diện, 7 chỗ trong điều khoản (đổi thì nâng TERMS_VERSION, nên gom với lần đổi điều khoản sau). Mã quyền `chu` trong dữ liệu giữ nguyên, chỉ đổi chữ hiển thị |
| 2026-11-21 | Thẩm định (Chủ hỏi) | Chia luồng dịch làm 2 phần: trước nhận dạng (video, tiếng, model nhận dạng, phiếu chỉ giữ phần nhận dạng) và sau nhận dạng (ngữ cảnh, model dịch, phiếu riêng chỉ giữ phần dịch, ước theo số chữ thật). Bước 5/5 lúc chờ thành «Dịch tiếp» tự đóng tab; Hủy hỏi lại. Dịch lại bằng model khác chỉ giữ phần dịch; Làm lại báo rõ trừ lại nhận dạng. Giữ kết quả nhận dạng qua tải lại trang | Làm theo giai đoạn | Chủ chốt 21/11/2026. Bản nhỏ xong v5.27.0. Chia hai phiếu xong v5.30.0. Còn: ước phần dịch theo số chữ thật (cần số đo), giữ kết quả nhận dạng qua tải lại trang, chạy thử với Token thật |
| 2026-11-21 | Người dùng chốt | Khi đề xuất hay sửa phải vào vai người dùng, xét sửa chỗ này đụng tới chỗ nào khác, để ai cũng dùng mượt và ổn định | Làm ngay | Đã ghi thành mục «CÁCH NGHĨ KHI ĐỀ XUẤT VÀ KHI SỬA» ở `huongdan.txt` (A–E), áp cho mọi vai; lên `work`/`main` cùng v5.21.0 |
| 2026-11-21 | Người dùng chốt | Sắp lại trang khách. Chưa biết khách đông ở cách trả nào (chưa công bố). Thuê phòng chưa có key thì dẫn sang hướng dẫn lấy key hoặc trả theo lượt | Làm theo giai đoạn | Đợt 1 xong trong v5.21.0 (đẩy chính thức 21/11/2026). Đợt 2 xong trong v5.22.0 (đẩy chính thức 21/11/2026). Đợt 3 xong trong v5.23.0 (nút chính trang chủ theo trạng thái: Thêm key, Gia hạn, Mua Token dịch, Chọn cách trả, kèm dòng vì sao; thanh dưới Trang chủ, Công cụ, Ví, Menu có chữ, Dịch trực tiếp sang ô đầu trang chủ và Menu). Đợt 4 (Chủ chốt 21/11/2026: hỏi «dùng để làm gì», đếm cả từ dữ liệu đã có lẫn số đếm mới, chấp nhận sửa điều khoản): bước 1 câu hỏi lần đầu xong trong v5.24.0; bước 2 đếm ẩn danh xong trong v5.25.0 (bảng usage_tally không có cột tài khoản, khối «Khách dùng thế nào» ở Tổng quan cho Chủ, điều khoản 2026-11-21.2). Bốn đợt đã đẩy chính thức 21/11/2026 (v5.25.0) |
| 2026-11-21 | Người dùng chốt | Hạn chế tối đa pháp lý bản quyền video, như công cụ SaaS AI theo nhu cầu. Chọn: bỏ «phim mới chiếu», gộp 3 loại người lớn thành «Phim có nhãn 18+»; giữ lưu tên tệp như cũ; xác nhận quyền mỗi tệp một lần; đổi toàn bộ cách gọi | Làm ngay | Đã vào `work` và `main` trong v5.20.0 (đẩy chính thức 21/11/2026). Điều khoản 2026-11-21.1. Nên nhờ luật sư xem điều khoản |
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

- 2026-11-22: v5.36.0 Dịch trực tiếp. Cầu nối Fly.io chưa deploy lại nên «Từ cần giữ đúng» chưa có tác dụng (cầu nối cũ bỏ qua, không lỗi). Chưa thử phiên thật có phụ đề nổi, chưa biết Qwen LiveTranslate có nhận translation.corpus.phrases đúng như code không.
- 2026-11-22: điều khoản nói phòng gửi lệnh xóa bản nhận dạng sau mỗi lần chạy, nhưng code chỉ xóa ở AssemblyAI, Speechmatics, Soniox, ElevenLabs; Alibaba và Deepgram không có lệnh xóa. Chờ Chủ chọn: sửa chữ điều khoản (nâng TERMS_VERSION) hay tìm lệnh xóa của hai nhà.
- 2026-11-22: v5.34.0–v5.35.0 ElevenLabs trên `work` và `main` (đẩy chính thức 22/11/2026). Chưa thử với key thật (cả giọng đọc: danh sách /v2/voices, đọc mp3, trừ Token theo chữ): tên model (scribe_v3, scribe_v2), hình dạng phản hồi, kiểm key qua `/models` (key bị giới hạn quyền có thể báo sai), file dài có kịp 270 giây một yêu cầu không. Điểm chất lượng là ước lượng. Chưa xem bằng mắt màn Thuyết minh có ô ElevenLabs.
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

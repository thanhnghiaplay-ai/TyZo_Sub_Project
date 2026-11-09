# Bảng điều khiển — TyZo Sub

Đọc file này trước khi làm bất cứ việc gì. Đây là chỗ nhìn một lần để biết dự án đang ở đâu. Không đọc nhật ký cũ để lấy lệnh.

Thứ tự khi các câu khác nhau:

1. Câu người dùng nói trong lượt này.
2. File này, rồi `huongdan.txt`.
3. Bảng trạng thái ở đầu `PROJECT_STATUS.md`.
4. Phần còn lại của `PROJECT_STATUS.md` và `HANDOFF.md` chỉ để tra. Không được làm theo đoạn cũ.

`HANDOFF.md` là phiếu bàn giao một lần, không phải bộ luật thứ hai.

## Đang chạy

| Mục | Giá trị |
|---|---|
| Bản khách đang dùng | v2.20.0 trên nhánh `main` |
| Bản đang làm | v2.23.0 trên nhánh `work`: thuật ngữ hiện đủ, báo lỗi tải |
| Điều khoản | 2026-11-09.1 |
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
| Thẩm định | Claude | Đọc code và bản vừa làm. Ghi lỗi còn đó hoặc lỗi mới: mức nặng, chỗ nào, vì sao. Ghi vào mục «Còn mở» và «Ý đã nêu» | Sửa sản phẩm, trừ khi người dùng nói đúng câu «Claude sửa» |
| Cố vấn | ChatGPT | Đề xuất hướng đi. Ghi khả thi: làm ngay, làm sau, hoặc không làm | Sửa code, đẩy kho, đổi giá, đổi điều khoản |

Người dùng là người chốt. Câu khởi đầu cho model khác chỉ cần: «Đọc `BANG_DIEU.md` và làm đúng vai của mình.»

## Việc đang giữ

Không có việc đã đẩy. v2.23.0 đang trên `work`, chưa lên `main`.

## Ý đã nêu

| Thời điểm | Vai | Ý | Khả thi | Trạng thái |
|---|---|---|---|---|
| 2026-11-09 09:33 | Làm | Nhật ký khách 3 lớp. Thanh chỉ kéo núm. Đọc trước hoặc sau | Làm ngay | Đã vào `work` trong v2.21.0 |
| 2026-11-09 12:19 | Làm | Thuật ngữ admin có tên Việt, phân trang, ẩn/mở tất cả, khôi phục từ thiếu | Làm ngay | Đã vào `work` trong v2.23.0 |
| 2026-11-09 12:19 | Thẩm định | Lời lỗ tách giá vốn Groq. Câu hiển thị 807 dòng chờ duyệt. Cộng tác viên để sau | Làm sau | Chưa làm. Chờ chốt câu hỏi 2, 3, 4 |
| 2026-11-09 06:40 | Làm | Giá và tiền chỉ Chủ. Yêu cầu tự chuyển cấp. Số dư hiện khoản giữ | Làm ngay | Đã vào `main` trong v2.20.0 |
| 2026-11-08 20:28 | Làm | Chủ vào lại Admin khi phòng chưa gửi được thư | Làm ngay | Đã vào `main` trong v2.19.2 |
| 2026-11-08 20:03 | Người dùng chốt | Một đường cho ba vai. Làm, Thẩm định, Cố vấn. Nhìn bảng này là đủ | Làm ngay | Đã vào `main` |
| 2026-11-08 19:21 | Làm | Không khóa lượt thử theo máy thật. Không viết bộ giải HE-AAC. Không thêm captcha giả | Không làm | Đã chốt |

Ý mới của Cố vấn hoặc Thẩm định phải thêm một dòng vào bảng này. Không chèn việc mới vào bản đang đóng.

## Còn mở

- Lọc tiếng người bằng VAD đã đối chiếu tên tensor, chưa bấm trên điện thoại thật.
- Mục 13.2 không được code: chủ web giữ key để tính tiền theo phút, và dán link tải video.
- Mục 14 không được code cho đến khi người dùng yêu cầu đúng một việc. Không đổi model nhận dạng khi chưa có số đo.
- Không bán key Groq. Không nhận link video.

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
- Không ghi token, mật khẩu, key vào file hoặc vào cuộc trò chuyện.

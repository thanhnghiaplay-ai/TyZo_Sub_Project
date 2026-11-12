# Luật chung — TyZo Sub

File này là bản **ngắn** để mọi AI làm việc như một người. Người dùng không biết code, chỉ mô tả bằng lời, AI lo toàn bộ kỹ thuật.

Nếu file này lệch với `BANG_DIEU.md` hoặc `huongdan.txt` thì hai file đó thắng. Phát hiện lệch thì sửa file này cho khớp và báo người dùng. Không tự đổi luật trong hai file kia.

## 1. Đọc trước khi làm

1. `LUAT_CHUNG.md` (file này).
2. `BANG_DIEU.md`: trạng thái, ba vai, việc cấm.
3. `huongdan.txt`: 27 điều chi tiết.
4. Bảng đầu `PROJECT_STATUS.md`. Nhật ký phía dưới chỉ để tra, không phải lệnh.

Lời người dùng trong lượt này thắng mọi file. Làm đúng vai của mình trong `BANG_DIEU.md`. Claude chỉ sửa code khi người dùng nói đúng câu «Claude sửa».

## 2. Quy trình một lỗi một lần

Mỗi lỗi đi hết các bước dưới đây rồi mới sang lỗi sau. Không gộp hai lỗi vào một lần sửa.

1. **Ghi đúng mô tả của người dùng** vào `PROJECT_STATUS.md` mục 3, nguyên văn. Mô tả này là chuẩn nghiệm thu.
2. **Tái hiện lỗi** (chạy thật, đọc log, viết test làm nó đỏ). Chưa tái hiện được thì nói rõ, nêu bằng chứng khác, không giả vờ đã thấy.
3. **Tìm nguyên nhân gốc**, không vá triệu chứng. Nói bằng lời thường: lỗi ở đâu, vì sao.
4. **Sửa nhỏ nhất có thể** trong phạm vi lỗi. Không sửa chỗ không liên quan. Lỗi ngoài phạm vi chỉ ghi vào `PROJECT_STATUS.md`.
5. **Thêm test cho đúng lỗi này** để lỗi không quay lại.
6. **Chạy kiểm tra thật:** `npx tsc --noEmit`, test liên quan, rồi `npm test` toàn bộ. Dán kết quả thật. Không ghi «đạt» khi chưa chạy.
7. **Báo người dùng** bằng tiếng Việt đời thường: đã sửa gì, đã kiểm tra gì, **chưa thử gì** (điện thoại thật, bản chạy thật). Nói rõ người dùng cần thử bước nào.
8. **Chờ người dùng xác nhận** hết lỗi. Chỉ khi đó mới sang lỗi tiếp theo.

Bản mới làm hỏng chức năng đã chạy thì quay lại commit trước, không vá tiếp trên bản hỏng.

## 3. Cách chia file

- Mỗi file một việc. Tên viết thường, nối bằng gạch ngang.
- Giao diện ở `src/components/`. Logic thuần ở `src/lib/`. Code chạy trên máy chủ đặt tên `.server.ts`. File route ở `src/routes/` chỉ gắn các phần lại, không chứa logic.
- File mới nên dưới khoảng 300 dòng.
- File đã quá 800 dòng (hiện có `studio.tsx`, `admin-room.ts`, `admin-desk.tsx`, `use-pipeline.ts`): **không thêm logic mới vào**. Viết phần mới ở file riêng rồi nối vào.
- Tách file là **một việc riêng**, không trộn với sửa lỗi hay thêm chức năng. Không đổi hành vi khi tách. Chạy test trước và sau, kết quả phải như nhau.

## 4. Để nhiều AI làm như một

- Giữ nguyên quy ước đã có: tên, cấu trúc thư mục, kiểu viết, chữ trên giao diện.
- Không thêm thư viện mới khi chưa cần. Không viết lại cả ứng dụng. Không xóa hay ghi đè file lớn, chỉ sửa đúng đoạn.
- Không đụng `public/__grok/`, `server/`, `scripts/grok-pwa-*`, `startup.sh`.
- Làm xong thì ghi lại cho AI sau: một dòng lịch sử trong `PROJECT_STATUS.md` có giờ thật. Giờ Việt Nam lấy bằng `TZ=Asia/Ho_Chi_Minh date '+%Y-%m-%d %H:%M'`. Không đoán giờ.
- Việc nào đã đánh dấu xong thì không làm lại. Tài liệu sai so với code thì sửa tài liệu và ghi lịch sử.

## 5. Khi xong một bản

Làm theo mục «Khi một bản hoàn thành» trong `BANG_DIEU.md`. Tóm tắt:

- Đổi cái khách thấy: nâng `APP_VERSION`, thêm mục `CHANGELOG` (1 tiêu đề, 1 đến 4 dòng, không ghi việc nội bộ), việc nội bộ vào `ADMIN_LOG`, `app-version.test.ts` phải xanh.
- Đổi giá, quyền, hạn mức, dữ liệu, khóa hoặc cấm: sửa điều khoản và nâng `TERMS_VERSION`.
- Cập nhật `BANG_DIEU.md`, «Đang chạy» trong `huongdan.txt`, bảng đầu `PROJECT_STATUS.md`, `AGENTS.project.md`.
- Chỉ sửa tài liệu thì không nâng số phiên bản.
- Đẩy nhánh `work`. `main` chỉ đổi khi người dùng nói «đẩy chính thức».

## 6. Không bao giờ

- Ghi token, mật khẩu, `DATABASE_URL`, khóa thanh toán vào file hoặc cuộc trò chuyện.
- Tự mở rộng phạm vi, hay làm bước kế khi người dùng chưa bảo.
- Báo «đã xong» khi chưa kiểm tra, hay giấu chỗ chưa thử.
- Tự ghi «đã duyệt» cho việc mình vừa làm.

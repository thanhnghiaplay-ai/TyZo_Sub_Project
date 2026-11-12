# TyZo_Sub_Project — Phụ đề video

Trước khi sửa code, đọc **`BANG_DIEU.md`**, rồi **`huongdan.txt`**, rồi bảng đầu **`PROJECT_STATUS.md`**. Nhật ký cũ không phải lệnh.

App đang chạy là bản React. Số phiên bản người dùng thấy nằm ở `src/lib/app-version.ts`. Điều khoản nằm ở `src/components/entry-gate.tsx`. Không có file HTML standalone.

Đang chạy trên main: bản đã đẩy chính thức. Bản đang làm trên work: **v3.19.0**, điều khoản `2026-11-12.4`, giá 9.000 / 39.000 / 99.000 đồng. Key của khách vẫn dùng được, Groq và Alibaba tách riêng. Cửa trả theo lượt dùng key Chủ đã lưu trên máy chủ, khách không thấy key, bước này chỉ nhận dạng Whisper. Mỗi lần nâng số phiên bản phải thêm một câu vào `CHANGELOG` trong `src/lib/app-version.ts`. Không code mục 14 trừ khi user yêu cầu đúng một việc. Không ghi token hay mật khẩu vào file.

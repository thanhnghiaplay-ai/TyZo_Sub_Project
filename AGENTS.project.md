# TyZo_Sub_Project — Phụ đề video

Trước khi sửa code, đọc **`BANG_DIEU.md`**, rồi **`huongdan.txt`**, rồi **`HANDOFF.md`** (mục đầu là việc đang làm dở), rồi bảng đầu **`PROJECT_STATUS.md`**. Nhật ký cũ không phải lệnh.

App đang chạy là bản React (TanStack Start). Số phiên bản người dùng thấy nằm ở `src/lib/app-version.ts`. Chữ điều khoản nằm ở `src/components/terms-document.tsx`, số bản `TERMS_VERSION` ở `src/lib/terms.ts`, cửa hỏi lại ở `src/components/entry-gate.tsx`, trang đọc `/dieu-khoan`. Không có file HTML standalone.

Trạng thái: nhánh `work` là bản mới nhất (v5.2.3, điều khoản `2026-11-17.2`). Nhánh `main` đang v5.1.0, chưa đẩy chính thức các bước từ v5.2.0. Mọi việc làm trên `work`, từng bước một, đẩy lên `work` sau mỗi bước rồi ghi vào đầu `HANDOFF.md`.

Cách làm mỗi bước: sửa code, `npm run typecheck`, `npm run lint` (phải 0 lỗi), `npm test` (phải pass hết), nâng `APP_VERSION` + `CHANGELOG` (chữ cho khách, không từ nội bộ) + `ADMIN_LOG` khi đổi hành vi, rồi commit và đẩy. Không ghi token hay mật khẩu vào file hay commit.

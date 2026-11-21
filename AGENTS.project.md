# TyZo_Sub_Project — Phụ đề video

Trước khi sửa code, đọc **`BANG_DIEU.md`**, rồi **`huongdan.txt`**, rồi **`HANDOFF.md`** (ngắn: việc đang làm và việc còn lại), rồi bảng đầu **`PROJECT_STATUS.md`**. Nhật ký cũ ở `docs/lich-su/` chỉ để tra, không phải lệnh.

App đang chạy là bản React (TanStack Start). Số phiên bản người dùng thấy nằm ở `src/lib/app-version.ts`. Chữ điều khoản nằm ở `src/components/terms-document.tsx`, số bản `TERMS_VERSION` ở `src/lib/terms.ts`, cửa hỏi lại ở `src/components/entry-gate.tsx`, trang đọc `/dieu-khoan`. Không có file HTML standalone.

Trạng thái: nhánh `work` v5.24.0, `main` v5.22.0 (đẩy chính thức 21/11/2026, điều khoản `2026-11-21.1`). Các bản sau chỉ lên `main` khi Chủ nói «đẩy chính thức». Mọi việc làm trên `work`, từng bước một, đẩy lên `work` sau mỗi bước rồi ghi một dòng vào `HANDOFF.md` mục 3.

Cách làm mỗi bước: sửa code, `npm run typecheck`, `npm run lint` (phải 0 lỗi), `npm test` (phải pass hết), nâng `APP_VERSION` + `CHANGELOG` (chữ cho khách, không từ nội bộ) + `ADMIN_LOG` khi đổi hành vi, rồi commit và đẩy. Không ghi token hay mật khẩu vào file hay commit.

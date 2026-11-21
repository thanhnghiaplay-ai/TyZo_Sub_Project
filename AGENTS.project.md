# TyZo_Sub_Project — Phụ đề video

Trước khi sửa code, đọc **`BANG_DIEU.md`**, rồi **`huongdan.txt`**, rồi **`HANDOFF.md`** (ngắn: việc đang làm và việc còn lại), rồi bảng đầu **`PROJECT_STATUS.md`**. Nhật ký cũ ở `docs/lich-su/` chỉ để tra, không phải lệnh.

App đang chạy là bản React (TanStack Start). Số phiên bản người dùng thấy nằm ở `src/lib/app-version.ts`. Chữ điều khoản nằm ở `src/components/terms-document.tsx`, số bản `TERMS_VERSION` ở `src/lib/terms.ts`, cửa hỏi lại ở `src/components/entry-gate.tsx`, trang đọc `/dieu-khoan`. Không có file HTML standalone.

Trạng thái: nhánh `work` v5.32.1; bản `main` khách đang dùng xem `BANG_DIEU.md` (điều khoản `2026-11-21.2`).

Cách làm mỗi bước: sửa code, `npm run typecheck`, `npm run lint` (phải 0 lỗi), `npm test` (phải pass hết), nâng `APP_VERSION` + `CHANGELOG` (chữ cho khách, không từ nội bộ) + `ADMIN_LOG` khi đổi hành vi, rồi commit và đẩy. Không ghi token hay mật khẩu vào file hay commit.

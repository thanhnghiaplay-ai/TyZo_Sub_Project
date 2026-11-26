# TyZo — hướng dẫn cho Claude Code

Giữ nguyên các quy tắc cũ của dự án:
@AGENTS.md

Đọc trước khi làm: `BANG_DIEU.md` (trạng thái, việc mở, quyết định của Chủ), `PROVIDERS.md` (thêm hoặc bỏ nhà cung cấp), `src/lib/billing/README.md` (đường đi của tiền, nếu đã có trên nhánh).

## Công cụ phát triển

Xem `docs/CONG-CU.md`: 10 công cụ, quy trình phối hợp, cách tiết kiệm Token. Tóm tắt:
- Phiên mới: `bash scripts/tools/cong-cu.sh cai`.
- Trước khi sửa: hỏi graphify phạm vi ảnh hưởng (`graphify explain "<tên>"`); sơ đồ cũ thì `cong-cu.sh so-do`.
- Sau khi sửa: tsc, test liên quan; theo phạm vi chạy `cong-cu.sh bi-mat | bao-mat | phu-thuoc`.
- Đổi giao diện: Playwright MCP trên bản thử, máy tính + điện thoại.
- Database: Postgres MCP chỉ đọc. Sửa dữ liệu bằng migration, Chủ duyệt.

## Luật an toàn

- Không đẩy, gộp nhánh, deploy hay sửa database thật khi Chủ chưa yêu cầu rõ.
- Không ghi key, mật khẩu, chuỗi kết nối vào kho hay khung chat.
- Mỗi lần đẩy lên GitHub tính một lượt dựng Vercel (giới hạn 100 mỗi ngày): gom thay đổi rồi đẩy một lần.
- Trả lời Chủ bằng tiếng Việt, ngắn gọn. Hướng dẫn VPS ghi rõ menu, số mục, giá trị cần gõ.

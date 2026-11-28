# HANDOVER
- Tiếp tục trên nhánh fix/tyzo-stability (không dùng main). Đọc MASTER, TASKS, CHECKPOINT trước.
- Không cần làm lại: clone/npm ci, tsc (đã OK), đọc CLAUDE.md.
- Giả thuyết chưa xác minh: (1) 5.49.8 đã sửa đủ lỗi 429 phía frontend; (2) nguồn tạo suất `uncertain` trên production (heartbeat >150 s hoặc kết quả nhà cung cấp chưa rõ); (3) chênh 8.234 token.
- Test chạy tiếp: lint; `npm test` đầy đủ (không DATABASE_URL); sau đó test PG nếu có Postgres cô lập.
- Rủi ro: `npm run build` gọi db:migrate, chỉ build với DATABASE_URL trống; mỗi push = 1 lượt Vercel.
- Bước tiếp: xác minh code 5.49.8 (hàng đợi suất frontend), rồi TZ-002.

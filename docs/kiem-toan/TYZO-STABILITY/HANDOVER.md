# HANDOVER
- Tiếp tục trên nhánh fix/tyzo-stability (không dùng main). Đọc MASTER, TASKS, CHECKPOINT trước.
- Không cần làm lại: clone/npm ci, tsc (đã OK), đọc CLAUDE.md.
- Giả thuyết chưa xác minh: (1) 5.49.8 đã sửa đủ lỗi 429 phía frontend; (2) nguồn tạo suất `uncertain` trên production (heartbeat >150 s hoặc kết quả nhà cung cấp chưa rõ); (3) chênh 8.234 token.
- Test chạy tiếp: test PG nếu có Postgres cô lập; test mục tiêu sau mỗi sửa. Baseline đã có trong TESTS.md, không chạy lại toàn bộ.
- Rủi ro: `npm run build` gọi db:migrate, chỉ build với DATABASE_URL trống; mỗi push = 1 lượt Vercel.
- Không làm lại TZ-003 lõi và B-04 (đã sửa, có test). Không làm lại TZ-004 (đã PASS_LOCAL). Không làm lại TZ-005 (đã PASS_LOCAL). Không làm lại TZ-006 phần tĩnh/B-07. Bước tiếp: TZ-009 rồi TZ-008, hoàn tất TZ-002 (PG thật nếu có), rồi TZ-004. Rủi ro: thay đổi sweep nhả suất mà không có ref chỉ đúng nếu mọi nơi gửi GPU Modal đều đi qua tagWorkBeforeSend (hiện chỉ runModalPartWith); TZ-013 phải kiểm lại.

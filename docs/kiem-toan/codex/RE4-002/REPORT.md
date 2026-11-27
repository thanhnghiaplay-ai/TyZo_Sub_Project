# RE4-002 · PASS cục bộ

`src/lib/billing/work-lease.ts` kiểm hạn sau khi chờ truy vấn; `stop()` đợi cùng promise vô hạn. Thời gian chạy câu lệnh trên PostgreSQL không bao gồm đợi kết nối hoặc đợi phản hồi qua mạng. Cầu nối live chưa dùng timeout checkout của pool chung.

Lease hiện có hạn độc lập dùng đồng hồ đơn điệu, không chồng nhịp, báo mất lease một lần và bỏ qua phản hồi muộn. Khi đóng, chờ nhịp hiện tại tối đa một giây rồi phát tín hiệu hủy. Adapter PostgreSQL dùng cùng lớp pool cho web và live, hủy socket riêng của giao dịch khi đang chạy, chặn SQL sau checkout đã hủy và giữ statement_timeout ở máy chủ. Bộ lọc ID, trạng thái và tuổi heartbeat trong câu UPDATE vẫn chặn lease bị thay hoặc hết hạn.

Trước: 2/2 hồi quy thất bại khi thử promise bị giữ mở trên mã cũ. Sau: 43/43 bài PASS trên PostgreSQL 17.12 cô lập, có khóa dòng, kết nối gián đoạn, pool đầy, hủy, phản hồi muộn và hồi quy kế toán. Restart cụm thật PASS (pg_ctl stop immediate rồi start; pool dùng lại, lease cũ không nhịp tiếp). TypeScript PASS, ESLint 0 lỗi/23 cảnh báo.

Phạm vi: lỗi mạng không phản hồi được mô phỏng ở promise; PostgreSQL thử chạy loopback. Khi socket đã bỏ, phía PostgreSQL vẫn dựa vào statement_timeout cho truy vấn chưa nhận thấy mất kết nối. Soak và mạng staging thuộc cổng riêng.

Rollback: drain các yêu cầu, đối soát các lease unknown, revert commit này trên nhánh riêng. Không có migration.

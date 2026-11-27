# RE4-003 · PASS cục bộ

`migrations/0055_admission_fair_queue.sql` đếm mọi waiter cũ cùng nhà/model vào số người chặn, trong khi số suất trống đã bị giới hạn theo lane của yêu cầu hiện tại. Batch đã đầy vẫn có thể giữ suất live mà batch không dùng được.

Migration mới `0056_admission_lane_fairness.sql` giữ chữ ký hàm, dữ liệu hàng đợi, khóa đồng bộ và các cap. Đếm waiter còn hoạt động, đủ cap lane và cap người, không có lease unknown chặn. Tách suất chung, suất theo lane và phần dành cho live; một waiter chỉ giữ loại suất có thể sử dụng. Duy trì thứ tự khách chờ lâu trong phạm vi cùng nhà/model. Giá trị liveReserve mặc định vẫn 0. Nếu admin đã bật, live đang chạy không tiêu thêm hạn mức batch.

Trước: hai hồi quy thất bại trên 0055 (batch đầy, và liveReserve được cấu hình). Sau: 46/46 bài PASS trên PostgreSQL 17.12 thật cô lập, gồm nhiều kết nối, xác minh cap, tuổi hàng đợi, số chỗ có thể giữ, và batch nhận lượt sau khi nhả. Cổng migration qua đủ cài mới, lặp, nâng từ 0055, lỗi giữa migration, rollback và chạy lại, vẫn còn hàng đợi cũ. TypeScript PASS, ESLint 0 lỗi/23 cảnh báo.

Giới hạn: chưa đo SLA của chính sách công bằng giữa các model khác nhau cùng nhà, và chưa đo độ trễ end-to-end của live qua nhà cung cấp. Xem benchmark/soak tại checkpoint tích hợp.

Rollback: sau drain, đối soát suất đang chạy/unknown. Nếu 0056 đã áp dụng, tạo migration tiến tới phục hồi thân hàm từ 0055, giữ bảng và dữ liệu hiện có; không sửa/xóa migration đã áp dụng.

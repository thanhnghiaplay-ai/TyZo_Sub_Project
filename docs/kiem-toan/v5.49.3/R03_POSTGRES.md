# R03 — Tiến trình thoát khi PostgreSQL ngắt kết nối

Ưu tiên P1; áp dụng cùng factory cho DB ứng dụng và pool xác thực, giữ nguyên cấu hình nghiệp vụ auth.

Nguyên nhân: pg Pool không có listener error; lỗi của kết nối idle và kết nối đang checkout chờ callback có thể trở thành sự kiện không được xử lý và làm Node thoát.

Sửa: factory pool có listener cho cả pool và client khi connect, log mã lỗi giới hạn thay cho thông tin kết nối, checkout timeout mặc định 10 giây. Query/COMMIT vẫn reject; không nuốt lỗi giao dịch và không tự chạy lại giao dịch tài chính.

Trước: fault-db/before-native-exports.json — actual src/lib/db.ts, PostgreSQL 17.12 riêng trên cổng 55440, đã ready rồi bị thoát exit 1 sau restart idle. Hai lần thử before trước đó lỗi adapter kiểm thử (không phải bằng chứng sản phẩm), được giữ nguyên để kiểm toán.

Sau: fault-db/after-managed-pool.json — tiến trình sống qua restart, SELECT thành công; restart giữa giao dịch làm giao dịch fail và dữ liệu bền vững vẫn đúng một dòng, tổng id=1. `resume-pool-regression` chạy 2 test thực: terminate backend idle/checkout rồi reconnect, và timeout khi pool kín. Kiểm thử mới được đưa vào npm test. Không dùng DB khách; cluster fault tách khỏi cluster test/soak.

Rollback: revert commit R03 và restart ứng dụng theo drain; không đổi schema, không cần restore dữ liệu. Việc revert khôi phục nguy cơ tiến trình thoát khi DB mất kết nối. Giới hạn timeout có thể làm yêu cầu fail sớm khi DB nghẽn; chủ đích là không treo vô hạn.

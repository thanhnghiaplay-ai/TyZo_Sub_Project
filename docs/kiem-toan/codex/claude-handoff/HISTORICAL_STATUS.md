# Đối chiếu hồ sơ lịch sử

Giữ nguyên 80 dòng gốc tại `docs/kiem-toan/v5.49.4/DOI_CHIEU_80.json`, sáu RE2 trong `RE2_KET_QUA.json` và tám RE3 trong `RE3_KET_QUA.json`. Kết quả gốc ghi phạm vi và commit cũ. Lần Codex chưa tái nghiệm thu riêng đủ 80 mục.

- R5-008 và R5-009. Chromium thật kiểm thử dữ liệu tổng hợp: chỉ đúng tài khoản đọc được, đọc sau commit, giao dịch bị hủy giữ bản đã lưu. `playwright.log`.
- NEW-008. Script CSS sửa được trường hợp có một stylesheet hợp lệ, từ chối trường hợp không xác định được stylesheet và giữ nguồn. `css-fixture.log`.
- R8-002. Cổng quyền đọc đã qua dưới UID thường. `full-suite-interrupted-extract.log` và nhật ký nhóm đầu. Vòng toàn bộ vẫn cần chạy lại.
- AZ-002/003/004/008 và R3-006. Android JVM 10/10 với mã Session/Api thật. R3-006 và kiểm thử thao tác máy thật vẫn chờ thiết bị.
- RE2-005, RE3-007, REF-013, AZ-001, R8-001. Xem báo cáo khôi phục và test PostgreSQL cô lập. VPS/Neon staging và khôi phục khi nhiều writer ngoài Compose cần diễn tập riêng theo hướng dẫn nghiệp vụ.
- Những mục lịch sử khác tiếp tục mang bằng chứng gốc và giới hạn như trong bảng, đối chiếu từng tiêu chí trước khi nâng trạng thái.

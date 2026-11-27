# RE4-004 · PARTIAL

`deploy/vps/tyzo.sh` bỏ qua lỗi `dc stop` trước khi kiểm bảng kê. Trường hợp dữ liệu khớp vẫn báo cho phép chuyển khi web chưa dừng; hồi quy trước sửa thất bại đúng tại điều kiện này.

Tách chép bản sao và chuyển nguồn. Cả hai xác nhận trạng thái container, kiểm mã thoát và hoàn nguyên trạng thái dịch vụ có xác minh. Cutover lấy khóa điều phối, từ chối phiên ghi ngoài Compose hoặc giao dịch đã prepare, khóa kết nối mới ngay trong PostgreSQL, lập bảng kê nguồn trong phiên quản trị duy nhất rồi xác nhận khóa vẫn có hiệu lực trước khi tiến hành. Bảng kê dùng giao dịch đọc snapshot nhất quán; restore giữ single transaction và fail-fast. Khi Vercel đã được gọi và chưa xác định được kết quả, giữ nguồn cũ khóa để tránh hai nguồn cùng ghi.

Sau: cú pháp Bash PASS; 21/21 bài restore/cutover PASS trên PostgreSQL 17.12 thật cô lập, Docker giả. Có ca lỗi stop, stop trả 0 nhưng container còn chạy, writer ngoài Compose, kết nối ghi sau snapshot, restore/mất mạng, rollback quyền kết nối và rollback dịch vụ. Chưa chạy Vercel/Neon/VPS thật.

Rollback khi đã kích hoạt fence: trước hết xác minh trạng thái triển khai/nguồn nhận ghi và đối soát dữ liệu. Nếu Neon đã nhận ghi, đồng bộ theo quy trình phục hồi trước khi bật nguồn cũ. Khi xác nhận nguồn cũ là nguồn đúng, dùng phiên quản trị trên database postgres để mở lại ALLOW_CONNECTIONS của tyzo, kiểm datallowconn và chỉ bật lại các dịch vụ đã dừng. Revert riêng checkpoint chỉ đổi script, không tự mở khóa CSDL đã được áp dụng. Giữ bản sao, dữ liệu và log.

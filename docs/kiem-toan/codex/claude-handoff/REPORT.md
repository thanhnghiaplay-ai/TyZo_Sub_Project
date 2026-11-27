# TyZo 5.49.5 · Bàn giao Claude Code

Baseline GitHub `0edb82a8d2115e86d025d9f51f36f033bb55bbd4`, nhánh phát triển `codex/tyzo-v5.49.4-audit`. Manifest bàn giao gốc khớp đủ 2.590 tệp. Điểm dừng theo yêu cầu của Chủ: chốt lỗi nhỏ ở luồng khôi phục rồi bàn giao.

## CODEX-RESTORE-TOC · PASS cục bộ

Trong `deploy/vps/tyzo.sh`, `nap_dump` đọc mục lục bằng `pg_restore -l | grep -qE …` dưới `pipefail`. Khi mục lục còn dữ liệu sau dòng schema, grep thoát sớm làm writer nhận SIGPIPE. Điều kiện nhận nhầm rằng dump thiếu mục schema public, nên restore đụng schema public đã có trong CSDL tạm. Mã cũ lỗi trên PostgreSQL cô lập khi fixture kéo dài stdout của mục lục. Bản sửa đọc hết stream bằng grep thường, bỏ phần stdout, rồi dùng mã thoát thật của pipeline. Hồi quy trước sửa thất bại đúng lỗi schema, sau sửa 22/22 bài restore/cutover PASS trên PostgreSQL 17.12 cô lập, Node 22.23.5 và Docker giả. Kiểm cú pháp Bash PASS. Lưu cả kết quả trước và sau ở thư mục này.

Rollback: revert riêng checkpoint này nếu cần, sau khi hoàn tất quy trình khôi phục đang chạy. Bản sửa không sửa migration. Các thao tác restore chỉ được chạy với cụm thử do Codex tạo; dữ liệu dùng trong test là tổng hợp.

## Kết quả và phạm vi còn lại

- RE4-002, RE4-003, RE4-005 đã đạt cục bộ. RE4-001 và RE4-004 còn PARTIAL. RE4-006 đang chờ tạo Graphify từ snapshot mã đã chốt. Các báo cáo và rollback từng mục nằm tại `docs/kiem-toan/codex/RE4-*/REPORT.md` và `integration-recovery/REPORT.md`.
- Bản Node 22 dựng với PGlite đã khởi động. Chromium kiểm bốn trang desktop/mobile, API từ chối thiết bị chưa xác thực đúng 401. IndexedDB qua ca rollback và hai tài khoản fixture. Android JVM đạt 10/10; thiết bị thật chưa xác minh.
- Gitleaks không thấy secret trong 733 commit và cây tệp đã quét ở snapshot `aa73aca`. dependency-cruiser ghi 729 module, 0 lỗi, 10 cảnh báo. Kết quả quét dựa trên cấu hình hiện hành, Semgrep đã chạy 244 rule trên 537 tệp, có 92 cảnh báo cần đối chiếu từng mục. Graphify còn phải cập nhật.
- Full suite vẫn cần chạy lại tuần tự. Lượt trước phát hiện lỗi TOC và hai fixture restore bị ảnh hưởng khi một lần kiểm tra riêng dùng cùng các CSDL tên cố định. Các test đó được chạy lại trong cổng restore riêng ở checkpoint này. R8-002 chạy dưới UID thường đã đạt.
- Lượt soak 1 dừng khi thấy lỗi đóng gói PGlite. Lượt 2 chạy từ `aa73aca5f02944627392e0b3d7673dc83a2344e5`, có PostgreSQL loopback, AI upstream giả và k6 300 người dùng ảo. Bằng chứng trong repo mới là snapshot giữa chừng. Script restore và hồ sơ bàn giao cập nhật sau khi lượt 2 bắt đầu. Chỉ công nhận 3.600 giây khi đọc được artifact cuối và xác minh ổn định của phiên. Số đo admission và WebSocket fixture có phạm vi riêng, chưa có đo audio → phụ đề hiển thị qua nhà cung cấp thật.
- Chủ cho phép dùng staging và hạn mức có sẵn nhưng chưa xác định được URL, Secret, hạn mức cụ thể hoặc thiết bị. Môi trường Cloud không có secret hay danh tính tương ứng, tìm issue GitHub không ra hồ sơ staging và API metadata môi trường trả Forbidden. Chưa gộp main, deploy production, dùng DB production hoặc phát sinh chi phí.

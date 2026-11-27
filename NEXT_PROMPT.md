# Tiếp tục kiểm toán TyZo

Soak lượt đầu bị dừng có chủ đích khi phát hiện lỗi bản dựng. Chỉ tính lượt sau nếu liên tục đủ thời lượng và khớp snapshot đã kiểm.

Checkpoint hiện tại RE4-005 (PASS). Tiếp theo RE2/RE3/80.

Lấy HEAD của nhánh `codex/tyzo-v5.49.4-audit` và xác minh với GitHub. Đọc STATE.json, BACKLOG.json, HANDOFF.md, docs/kiem-toan/codex/ và hồ sơ gốc trong docs/kiem-toan/v5.49.4/. Baseline đầy đủ nằm trong STATE.json. Ưu tiên theo mảng next.

Mỗi checkpoint ghi nguyên nhân, nguồn, bằng chứng trước/sau, test thực chạy, rollback và trạng thái. Commit, push riêng rồi đối chiếu SHA trên remote trước khi mở rộng phạm vi. Dùng PostgreSQL cô lập và dữ liệu tổng hợp. Không merge main, deploy, phát sinh chi phí, đổi giá hoặc quy tắc Token. Đo độ trễ streaming từ audio đến UI, tách admission khỏi chỉ số này.

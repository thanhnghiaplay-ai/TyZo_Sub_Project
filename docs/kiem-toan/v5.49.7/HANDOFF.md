# Bàn giao RE6-002 · High

Nhánh `audit/v5.49.7-codex-re6`. Phát triển từ `017cad371595f641d681da7f79eeeb62d617b40b`. Checkpoint hiện tại là commit chứa tệp này, cần đối chiếu trên GitHub trước khi làm tiếp.

RE6-002 đã qua nghiệm thu cục bộ với API giả và PG18.7. Bản sửa dùng trạng thái chính xác từ Neon API, ghi intent trước thao tác, giữ khóa khi kết quả chưa rõ và bảo toàn bản cũ. [Hồ sơ RE6-002](RE6-002/REPORT.md)

Theo chỉ đạo mới nhất, dừng ở RE6-002 để phiên sau làm RE6-003. Khuyến nghị **High** để kiểm API Vercel có cấu trúc, đối chiếu deployment, DB và phiên bản, giữ nhật ký theo các bước env/deploy/promote, rồi thử timeout và phục hồi. Không dùng Vercel, Neon hay VPS thật trong test. RE6-001 giữ giới hạn ở trạng thái tắt, chờ duyệt chính sách. [Hồ sơ RE6-001](RE6-001/REPORT.md)

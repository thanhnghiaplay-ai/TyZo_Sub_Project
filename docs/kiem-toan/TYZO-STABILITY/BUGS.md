# BUGS
Nguồn: BAO_CAO.md v5.49.7 (chưa xác minh lại trên mã hiện tại).
- B-01 429 frontend hủy cả lượt (9 song song vs trần 3 backend). Ứng viên sửa: 5.49.8. Trạng thái: chưa xác minh.
- B-02 POST đã 303 rồi GET 401/404/429 bị coi như từ chối POST, có thể gửi POST lần hai. Ứng viên sửa: 5.49.8. Chưa xác minh.
- B-03 Đóng phiếu giữa ghi đoạn và giữ ngân sách làm token bị giữ đến khi dọn phiếu quá hạn. Ứng viên sửa: 5.49.8. Chưa xác minh.
- B-04 Suất admission cũ chặn phiếu mới theo (user, modal, tyzo-modal). Cần xác minh.

# BUGS
Nguồn: BAO_CAO.md v5.49.7 (chưa xác minh lại trên mã hiện tại).
- B-01 429 frontend hủy cả lượt (9 song song vs trần 3 backend). Mã hiện tại: `submitModalChunk` chỉ lặp khi server báo busy (đã chứng minh chưa gửi upstream), tối đa 30 lần, chờ ≥2 s/Retry-After, 409/lỗi mạng thoát ra. Có test trong tyzo-modal-race.test.ts. Chưa kiểm tra đầy đủ nối từ tyzo.ts và trường hợp nhiều đoạn (TZ-003).
- B-02 POST đã 303 rồi GET 401/404/429 bị coi như từ chối POST, có thể gửi POST lần hai. Ứng viên sửa: 5.49.8. Chưa xác minh.
- B-03 Đóng phiếu giữa ghi đoạn và giữ ngân sách làm token bị giữ đến khi dọn phiếu quá hạn. Ứng viên sửa: 5.49.8. Chưa xác minh.
- B-04 Suất admission cũ chặn phiếu mới theo (user, modal, tyzo-modal). Cần xác minh.

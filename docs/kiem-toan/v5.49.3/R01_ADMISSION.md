# R01 — Suất xử lý mất heartbeat

Ưu tiên P1; sửa bổ sung sau commit WIP 8860a38. Chưa nghiệm thu staging.

Nguyên nhân: chuyển lease hết nhịp sang unknown nhưng câu đếm chỉ tính running. Callback/upstream vẫn có thể chạy, trong khi công việc mới được nhận vượt per-user/provider/model. Việc nhả slot cũng không nhận trạng thái unknown.

Sửa: tính cả running và unknown vào admission; completion đã biết được nhả đúng slot. Chủ có thể xác nhận slot stale/unknown đã kết thúc bằng ghi chú 12–500 ký tự; advisory lock, chuyển trạng thái và audit nằm chung giao dịch. Không đụng Token, phiếu hoặc chi phí provider. Giao diện chỉ hiện tối đa 20 hồ sơ cần kiểm tra.

Trước: `resume-admission-uncertain-before` tái hiện trên PostgreSQL thật: perUser=1 nhưng callback thứ hai được chạy khi callback đầu chưa kết thúc, sau khi heartbeat bị làm cũ. Sau: `resume-admission-uncertain-after` chặn callback thứ hai và mở lại sau completion có bằng chứng. `resume-finance-focused-fixed` kiểm thử stale lease, late release, quyền Chủ, input, rollback khi audit lỗi, idempotency và không đổi ledger. `resume-browser-admin` kiểm API từ tài khoản thường và thao tác desktop/mobile.

Ảnh hưởng: mọi lane batch/modal/live dùng cùng admission; unknown tiếp tục chiếm quota, có thể giảm năng lực cho tới khi đối soát. Xác nhận thủ công đòi hỏi bằng chứng công việc đã kết thúc; không phải thao tác xóa nợ hoặc hoàn tiền.

Rollback: revert commit sửa R01 trên nhánh riêng sau khi dừng nhận mới/drain và giữ bản sao bảng work_admissions/room_audit. Không xóa hoặc sửa ledger. Revert sẽ khôi phục nguy cơ nhận quá mức khi mất nhịp; ưu tiên tắt nhận mới thay vì rollback nóng. Không cần migration mới.

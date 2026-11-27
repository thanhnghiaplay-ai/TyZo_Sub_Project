# R02 — Phân biệt từ chối và kết quả gửi chưa rõ

Ưu tiên P1; trạng thái tài chính không đổi chính sách sáu giờ hiện hữu.

Nguyên nhân: mọi lỗi gửi Alibaba đều được đánh unknown. HTTP từ chối rõ ràng không có task ID vẫn giữ ngân sách/quota; ngược lại, HTTP lỗi nhưng trả task ID lại bỏ mất bằng chứng để theo dõi đúng công việc.

Sửa: HTTP 400/401/403/404/413/415/422/429 không có task ID được đánh failed và nhả phần giữ qua luồng giao dịch sẵn có. Timeout/408/5xx không ID giữ unknown, không gửi lặp tự động. Lỗi có ID hợp lệ giữ ID gắn đúng user/ticket và tiếp tục query/settle idempotent. Lỗi ghi trạng thái được AggregateError giữ cả lỗi gốc và lỗi đối soát.

Trước: `resume-async-rejection-before` thất bại vì expected failed nhưng actual unknown; `resume-async-task-evidence-before` expected task ID nhưng actual null. Sau: `resume-async-rejection-fixed`, `resume-finance-focused-fixed` qua các trạng thái từ chối, 408/500 chưa rõ, lỗi có ID, submit lặp, query và quyết toán đúng một lần. Không gọi API trả phí: transport giả, PostgreSQL cục bộ thật.

Ảnh hưởng: submit/query Alibaba, reaper/close/admission và ngân sách riêng của call; không thay giá, thời lượng hoặc đơn vị Token. Cutover job Alibaba cũ vẫn BLOCKED nếu chưa drain hoặc có ánh xạ quyền sở hữu đáng tin cậy.

Rollback: revert commit R02; không xóa run_async_asr_jobs/run_gate_calls. Giữ các ID đã ghi để đối soát, drain trước khi đổi phiên bản. Rollback tái tạo lỗi giữ ngân sách của yêu cầu bị từ chối; không dùng để tự gửi lại công việc unknown.

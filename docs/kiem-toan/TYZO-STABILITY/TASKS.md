# TASKS
| ID | Mức | Nội dung | Trạng thái |
|---|---|---|---|
| TZ-001 | P0 | Baseline: phiên bản, quy định, kiểm tra v5.49.8/9, script build/test | PASS_LOCAL (baseline test xong; chưa chạy build) |
| TZ-002 | P0 | Admission/409: AdmissionUncertain, tyzo_admit, lease, fencing, đối soát | IN_PROGRESS: B-04 PASS_LOCAL (PGlite); còn: race nhiều replica trên PG thật, rà các lane batch/live | 
| TZ-003 | P0 | Worker/429: 9 đoạn FE vs 3 suất BE, backpressure, Retry-After | PASS_LOCAL cho lõi (ALREADY_FIXED trong mã main); còn mở: Retry-After phía server, nhiều tài khoản đồng thời |
| TZ-004 | P0 | Modal HTTP: POST/303/GET, timeout, mã lỗi, không phát lại POST | PASS_LOCAL (mã đã đúng, bổ sung test); còn 3 ghi nhận P2 trong BUGS.md |
| TZ-005 | P0 | Token/tài chính: hold/charge/settlement/release/refund, đóng phiếu, 8.234 token | PASS_LOCAL (PGlite, bất biến tiền); còn: 8.234 token cần dữ liệu thật (BLOCKED), PG thật, idempotency hoàn tiền/ví |
| TZ-006 | P1 | Nút Tiếp tục, saved-runs, checkpoint | IN_PROGRESS: B-07 PASS_LOCAL (hàm thuần + kiểm nguồn); rà tĩnh owner/tệp/model OK; chưa có test trình duyệt (reload, mất mạng, đổi tài khoản) = BLOCKED |
| TZ-007 | P1 | Android/media, MP4 135 MB | NOT_REPRODUCED (rà tĩnh): đường đọc theo đoạn (openStream) có dự phòng giải mã toàn tệp (decodeTo16k), trần 1 GB/120 phút; thử trên thiết bị Android thật = BLOCKED |
| TZ-008 | P1 | Giao diện/tiến độ, 320–430 px | IN_PROGRESS: B-09 PASS_LOCAL (nút «Đang chuẩn bị…», khóa bấm lúc chuẩn bị); chống bấm đúp lõi (startJobOnce) ALREADY_FIXED; còn: bố cục 320–430 px = BLOCKED (sandbox thiếu Chromium cho check:layout), hiển thị tiến độ đoạn x/6 đã rà tĩnh: computeStages đúng (cắt xong=5%, nhận dạng 0/6 khớp sự cố), không lỗi |
| TZ-009 | P1 | Cập nhật phiên bản, stale-build-guard | PASS_LOCAL một phần: B-08 (nút Tải lại ở thông báo bản mới hỏi xác nhận khi đang chạy); R8-004 (preloadError) đã có từ trước; chưa có test trình duyệt (BLOCKED) |
| TZ-010 | P0/P1 | Bảo mật và GPU | IN_PROGRESS: quét mẫu bí mật trên diff nhánh so baseline: không thấy (regex, chưa có gitleaks); header Modal chỉ gửi tới host gốc (test TZ-004); semgrep (bao-mat) 94 phát hiện WARNING, không phát hiện mức bảo mật mới (xem TESTS.md); dependency-cruiser 0 lỗi; gitleaks BLOCKED (mạng chặn proxy.golang.org); rà tĩnh quyền endpoint GPU xong (B-12, không lỗi); còn: kiểm lại quyền các endpoint admin/GPU khác nếu cần |
| TZ-011 | P1 | Chức năng dùng chung | TODO |
| TZ-012 | P0 | Kiểm thử tích hợp | IN_PROGRESS: hồi quy src 1680 test, 0 fail (PASS_LOCAL); còn: nhóm scripts, test PG (BLOCKED), build, check:auth, trình duyệt (BLOCKED) |
| TZ-013 | P0 | Kiểm toán độc lập (phiên mới, đọc diff so baseline) | TODO |
| TZ-014 | — | Nghiệm thu, bàn giao, rollback | TODO |

Điều kiện nghiệm thu: theo mục X của MASTER.md; nhiệm vụ chỉ đóng khi mọi nhiệm vụ con quan trọng đã có bằng chứng.

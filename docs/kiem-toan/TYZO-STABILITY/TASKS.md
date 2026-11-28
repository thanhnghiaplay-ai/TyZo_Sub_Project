# TASKS
| ID | Mức | Nội dung | Trạng thái |
|---|---|---|---|
| TZ-001 | P0 | Baseline: phiên bản, quy định, kiểm tra v5.49.8/9, script build/test | PASS_LOCAL (baseline test xong; chưa chạy build) |
| TZ-002 | P0 | Admission/409: AdmissionUncertain, tyzo_admit, lease, fencing, đối soát | TODO |
| TZ-003 | P0 | Worker/429: 9 đoạn FE vs 3 suất BE, backpressure, Retry-After | IN_PROGRESS: `submitModalChunk` (src/lib/sub/tyzo-modal.ts) đã có hàng đợi busy giới hạn 30 lần, chờ ≥2 s; cần xác minh nối vào tyzo.ts và test |
| TZ-004 | P0 | Modal HTTP: POST/303/GET, timeout, mã lỗi, không phát lại POST | TODO |
| TZ-005 | P0 | Token/tài chính: hold/charge/settle/refund, đóng phiếu, 8.234 token | TODO |
| TZ-006 | P1 | Nút Tiếp tục, saved-runs, checkpoint | TODO |
| TZ-007 | P1 | Android/media, MP4 135 MB | TODO |
| TZ-008 | P1 | Giao diện/tiến độ, 320–430 px | TODO |
| TZ-009 | P1 | Cập nhật phiên bản, stale-build-guard | TODO |
| TZ-010 | P0/P1 | Bảo mật và GPU | TODO |
| TZ-011 | P1 | Chức năng dùng chung | TODO |
| TZ-012 | P0 | Kiểm thử tích hợp | TODO |
| TZ-013 | P0 | Kiểm toán độc lập (phiên mới, đọc diff so baseline) | TODO |
| TZ-014 | — | Nghiệm thu, bàn giao, rollback | TODO |

Điều kiện nghiệm thu: theo mục X của MASTER.md; nhiệm vụ chỉ đóng khi mọi nhiệm vụ con quan trọng đã có bằng chứng.

# Bàn giao sau RE8-010/011 · Medium

Nhánh `ccr-654dbe0e-978ok7`, phát triển từ `c0bcf6f` (RE6-002, có trên `work` và `audit/v5.49.7-codex-re6`). Bản RE6-003 chưa push của Codex không có trên remote, nên RE6-003 đã được làm lại từ đầu. Checkpoint hiện tại là commit chứa tệp này, cần đối chiếu SHA trên GitHub.

| Mục | Trạng thái | Hồ sơ |
|---|---|---|
| RE6-001 | PASS_LOCAL_POLICY_PENDING (giới hạn vẫn TẮT) | [RE6-001](RE6-001/REPORT.md) |
| RE6-002 | PASS_LOCAL | [RE6-002](RE6-002/REPORT.md) |
| RE6-003 | PASS_LOCAL | [RE6-003](RE6-003/REPORT.md) |
| RE6-004 | PASS_LOCAL | [RE6-004](RE6-004/REPORT.md) |
| RE6-005 | PARTIAL | [RE6-005](RE6-005/REPORT.md) |
| RE6-006 | PASS_LOCAL | [RE6-006](RE6-006/REPORT.md) |
| RE6-007 | PASS_LOCAL (không tối ưu) | [RE6-007](RE6-007/REPORT.md) |
| RE7-001 | PASS_LOCAL (hạn chót tổng, giới hạn phản hồi Modal) | [RE7](RE7/REPORT.md) |
| RE7-002 | PASS_LOCAL (tiền model 0 ≠ thiếu) | [RE7](RE7/REPORT.md) |
| RE7-003 | PASS_LOCAL (chỉ tính phụ đề có chữ) | [RE7](RE7/REPORT.md) |
| RE7-004 | PASS_LOCAL (giữ tên CJK, prompt 20 cặp) · chất lượng prompt BLOCKED | [RE7](RE7/REPORT.md) |
| R8-002 | PASS bằng user thường | [RE7](RE7/test-summary.txt) |
| RE6-008 | PASS_LOCAL (danh sách trường, usage nhất quán, giá bậc qwen-plus, test route hành vi); đo thật 5 model BLOCKED | [RE6-008](RE6-008/REPORT.md) |
| RE6-009 | PASS_LOCAL (bù chứng từ Modal, mô hình vòng đời GPU, Android JVM 28/28); thiết bị thật và hóa đơn BLOCKED | [RE6-009](RE6-009/REPORT.md) · [Kế hoạch nghiệm thu](RE6-009/ACCEPTANCE_PLAN.md) |
| RE8-008 | PASS_LOCAL, chưa deploy: trần 2 máy model chữ, `gpu_limits.py` | [RE8-008](RE8-008/REPORT.md) |
| RE8-001 | Đã phân tích bằng mô phỏng; đề xuất dự phòng 1 + chờ tắt 30 s; việc ngắn lỗ cần Chủ quyết giá | [RE8-001](RE8-001/REPORT.md) |
| RE8-007 | BUILD_PASS: APK 0.14 dựng trên CI, JVM 19/19; thiết bị thật BLOCKED | [RE8-007](RE8-007/REPORT.md) |
| RE8-009 | PASS_LOCAL: bù chứng từ lượt Modal cuối bị crash | [RE8-REST](RE8-REST/REPORT.md) |
| RE8-010 | PASS_LOCAL, chưa deploy: `requires_proxy_auth` theo cờ `xac_thuc_proxy` (đang tắt), header ở mọi phía gọi | [RE8-010](RE8-010/REPORT.md) · [Hướng dẫn](RE8-010/HUONG_DAN.md) |
| Cấu hình GPU thử nghiệm | Hồ sơ `ho_so_gpu=thu_nghiem` sẵn (máy chữ 2, nhận dạng 9, dự phòng 1, tắt sau 30 s); đang `hien_tai` | [HUONG_DAN.md](RE8-010/HUONG_DAN.md) |
| RE8-011 | Phương án giá GPU (mô phỏng), chưa đổi giá | [RE8-011](RE8-011/REPORT.md) |
| APK thử 0.14 | CI dựng, ký, có SHA256 và checklist tự kiểm; chưa phát hành | [Checklist](RE8-007/CHECKLIST_DIEN_THOAI.md) |
| RE8-002, 004 | PARTIAL; RE8-006 đã phân tích; RE8-003, 005, 010 BLOCKED | [RE8-REST](RE8-REST/REPORT.md) |
| RE6-010 | Chưa làm, cần **Low** | — |

Hồi quy toàn phần: [REGRESSION.md](REGRESSION.md). Hồ sơ cho kiểm toán độc lập: [CHATGPT_AUDIT.md](CHATGPT_AUDIT.md). Gói kiểm toán: `audit-bundle/` (patch theo commit, manifest SHA-256).

Việc chờ Chủ:
- Duyệt chính sách RE6-001.
- RE7-004 đã theo hướng A + D + bảng thuật ngữ. Còn cần: duyệt phiên Alibaba thật để đo prompt/corpus; cập nhật cầu nối VPS/Fly để có hiệu lực.
- Duyệt staging Vercel thật (RE6-003), Modal thật (RE6-004) và live thật (RE6-005).
- Duyệt chi phí đo thật cho 5 model chưa đo và token suy luận Groq (RE6-008).
- Duyệt từng gói trong [kế hoạch nghiệm thu](RE6-009/ACCEPTANCE_PLAN.md), mục «tách gói» (tổng 6,87 USD; gói tối thiểu P0 + D-tự kiểm + G7 + G1 + G8 = 0,60 USD).
- Chọn phương án giá GPU (RE8-011), chưa đổi giá.
- Quyết: deploy trần GPU (RE8-008), phương án dự phòng 1 + chờ tắt 30 s (RE8-001), giá việc ngắn, `requires_proxy_auth` (RE8-010), hạn mức chi workspace Modal.
- Chỉ đạo khi nào làm RE6-010 (Low).

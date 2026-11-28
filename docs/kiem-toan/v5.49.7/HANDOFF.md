# Bàn giao sau RE6-009 · Medium

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
| RE8-001…008 | Mở, chờ số đo thật hoặc quyết định của Chủ | `BACKLOG.json` |
| RE6-010 | Chưa làm, cần **Low** | — |

Hồi quy toàn phần: [REGRESSION.md](REGRESSION.md). Hồ sơ cho kiểm toán độc lập: [CHATGPT_AUDIT.md](CHATGPT_AUDIT.md). Gói kiểm toán: `audit-bundle/` (patch theo commit, manifest SHA-256).

Việc chờ Chủ:
- Duyệt chính sách RE6-001.
- RE7-004 đã theo hướng A + D + bảng thuật ngữ. Còn cần: duyệt phiên Alibaba thật để đo prompt/corpus; cập nhật cầu nối VPS/Fly để có hiệu lực.
- Duyệt staging Vercel thật (RE6-003), Modal thật (RE6-004) và live thật (RE6-005).
- Duyệt chi phí đo thật cho 5 model chưa đo và token suy luận Groq (RE6-008).
- Duyệt từng gói trong [kế hoạch nghiệm thu](RE6-009/ACCEPTANCE_PLAN.md) (GPU ≤ 5 USD, Android ≤ 1,5 USD, API ≤ 2 USD).
- Chỉ đạo khi nào làm RE6-010 (Low).

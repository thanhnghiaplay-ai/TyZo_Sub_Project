# Bàn giao sau RE7 · Medium

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
| RE6-008 | Chưa làm, cần **High** | — |
| RE6-009 | Chưa làm (Medium, sau RE6-008) | — |
| RE6-010 | Chưa làm, cần **Low** | — |

Hồi quy toàn phần: [REGRESSION.md](REGRESSION.md). Hồ sơ cho kiểm toán độc lập: [CHATGPT_AUDIT.md](CHATGPT_AUDIT.md). Gói kiểm toán: `audit-bundle/` (patch theo commit, manifest SHA-256).

Việc chờ Chủ:
- Duyệt chính sách RE6-001.
- RE7-004 đã theo hướng A + D + bảng thuật ngữ. Còn cần: duyệt phiên Alibaba thật để đo prompt/corpus; cập nhật cầu nối VPS/Fly để có hiệu lực.
- Duyệt staging Vercel thật (RE6-003), Modal thật (RE6-004) và live thật (RE6-005).
- Chuyển sang mức High để làm RE6-008.

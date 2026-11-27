# TyZo 5.49.5 · Checkpoint Claude Code (tiếp quản từ Codex)

Gốc `b829fd9` (nhánh `codex/tyzo-v5.49.4-audit`, đã kiểm bằng `git ls-remote`; mốc `0edb82a8` là tổ tiên). Claude chỉ ghi nhánh `ccr-76aead9f-jp8d0r` và không ghi vào nhánh Codex, nên tại một thời điểm mỗi nhánh chỉ có một agent ghi. Mã chốt `c899afd`. Không merge main, không deploy, không đụng DB production, không phát sinh chi phí, không đổi giá/quy tắc Token, không sửa migration.

Môi trường thử: Node 22.23.5, PostgreSQL 16.15 loopback cổng 55439 (máy không có 17.12), người dùng thường `tyzo`, Chromium 158, k6 0.55.0.

## Kết quả

| Việc | Kết quả | Bằng chứng |
|---|---|---|
| `npm test` đầy đủ, UID thường, PG thật, chạy tuần tự | b829fd9: 1.758 đạt, 7 bỏ qua, 0 lỗi. c899afd: 1.762 đạt, 7 bỏ qua, 0 lỗi | `npm-test-b829fd9.log`, `gates/npm-test-c899afd.log` |
| Cổng trên c899afd | tsc 0 lỗi; eslint 0 lỗi, 23 cảnh báo có sẵn; build Vercel và node-server đạt; Chromium máy tính + điện thoại 4 trang, CSS có, không tràn ngang, không lỗi console, API thiếu thiết bị trả 401 | `gates/` |
| Soak hỗn hợp, một mạch | PASS 3.614 s, 199 vòng; web 313.340 yêu cầu, 0% lỗi, p95 13,4 ms | `soak/REPORT.md` |
| RE4-001 | Mã PASS cục bộ, vẫn PARTIAL vì còn thiếu usage thật | `RE4-001/REPORT.md` |
| RE4-006 | PASS: graph dựng từ c899afd, có provenance | `RE4-006/` |
| Semgrep | 92 phát hiện, đã phân loại hết (78 dương tính giả, 13 chấp nhận, 1 mã thừa), 0 mục mở | `semgrep-triage-b829fd9.json` |
| dependency-cruiser | 0 lỗi, 9 cảnh báo; mọi vòng phụ thuộc đều có `import()` động | `dependency-cruiser-b829fd9.json` |
| gitleaks | 734 commit + cây tệp, 0 rò rỉ | `gitleaks-summary.json` |
| 80 mục | 69 PASS, 3 PASS_LOCAL, 5 PARTIAL, 1 BLOCKED, 2 BY_DESIGN | `re-accept/DOI_CHIEU_80_b829fd9.json` |
| RE2-001…006, RE3-001…007 | Test mang ID đều đạt (RE3-004 đo qua soak) | log npm test, `soak/` |

Lần tái nghiệm thu này nâng các mục:
- R8-002 lên PASS (chạy dưới UID thường);
- NEW-008 lên PASS_LOCAL (3 ca, có bản dựng node-server thật);
- R5-009 lên PASS_LOCAL (Chromium: trả về sau khi commit, giao dịch bị hủy thì giữ bản cũ);
- R7-004 lên PASS_LOCAL (test hành vi mới, đã kiểm test hỏng khi bỏ phần sửa).

Còn PARTIAL:
- MAIN-040: chưa có test hành vi cho server function;
- AZ-002/003/004/008: cần máy Android thật.

R3-006 vẫn BLOCKED vì cần Android SDK và máy thật.

## Thay đổi mã

1. `c5e9db0` RE4-001: phần vào được giữ theo `2×byte + 512`, không quá cửa sổ ngữ cảnh đã biết. Phiếu nhỏ và qwen-turbo chạy lại được. Usage vượt cận được đánh dấu đối soát. qwen-turbo gửi kèm `enable_thinking=false`.
2. `c899afd` test R7-004, thêm vào `npm test`.

## Còn mở

- RE4-001: so `usage.prompt_tokens` thật với cận, mỗi model 1 lệnh, khi có ngân sách thử đã duyệt.
- RE4-004: diễn tập staging Vercel/Neon/VPS ngoài fixture.
- Admission: chưa chứng minh 0 đói trong 3 s khi tải hỗn hợp (cửa sổ 10 s khi máy rảnh thì 0 đói). Cần đo trên staging.
- Độ trễ từ âm thanh đến chữ hiển thị qua nhà cung cấp thật: chưa đo.
- Android máy thật; staging (URL, Secret, hạn mức). Chủ chưa biết vị trí cấu hình.

Rollback: mỗi commit tách riêng, revert theo thứ tự ngược. Không có migration.

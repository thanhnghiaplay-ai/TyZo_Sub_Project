# Tiếp TyZo 5.49.5 từ checkpoint Claude Code

Repository `thanhnghiaplay-ai/TyZo_Sub_Project`. Fetch nhánh `ccr-76aead9f-jp8d0r`, kiểm SHA bằng `git ls-remote`. Mã chốt `c899afd`, gốc Codex `b829fd9`, mốc `0edb82a8`. Đọc `STATE.json`, `BACKLOG.json`, `HANDOFF.md`, `docs/kiem-toan/claude/REPORT.md`. Bảo toàn commit đã có; mỗi nhánh chỉ một agent ghi.

Đã xong, không lặp lại: npm test đầy đủ dưới UID thường; soak hỗn hợp một mạch 3.614 s; Semgrep/dependency-cruiser/gitleaks; Graphify từ c899afd (RE4-006); tái đối chiếu 80 mục; RE4-001 phần mã (cận 2×byte+512).

1. RE4-001: khi Chủ duyệt ngân sách thử, mỗi model trả theo lượt (Groq gpt-oss, llama, qwen3; Alibaba qwen-turbo/plus/max) gửi 1 lệnh dịch thật; so `usage.prompt_tokens` với `promptTokenBound` và số Token đã trừ. Không đổi giá.
2. RE4-004: diễn tập cutover/restore trên staging Vercel/Neon/VPS ngoài fixture, khi có URL, Secret và hạn mức.
3. Admission: đo lại chống đói 3 s dưới tải hỗn hợp trên staging (cục bộ có đói trong cửa sổ 3 s, cửa sổ 10 s khi rảnh 0 đói). Đo độ trễ âm thanh → chữ hiển thị với nhà thật.
4. Android máy thật: AZ-002/003/004/008, R3-006. MAIN-040: test hành vi cho ghi chi phí Modal.
5. Đổi mã thì dựng lại Graphify từ commit mã mới và cập nhật `docs/kiem-toan/claude/RE4-006/provenance.json`. Test PG dùng CSDL riêng, không chung CSDL với soak.
6. Mỗi checkpoint cập nhật bốn tệp bàn giao, lưu log đã che, push nhánh phát triển, so SHA remote. Không merge main, deploy production, dùng DB production, phát sinh chi phí, đổi giá/quy tắc Token hoặc sửa migration đã áp dụng.

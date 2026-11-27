# Tiếp v5.49.6 sau phiên Claude

Nhánh `audit/v5.49.6-claude-re5` (mã chốt `444cae1`). Đọc `docs/kiem-toan/v5.49.6/HANDOFF.md` (bảng tổng kết) và `STATE.json`.
Việc còn lại cần Chủ duyệt:
- gộp hoặc đẩy main (khi đó Vercel tự chạy migration 0057);
- staging cho RE4-004, RE5-004 C/D;
- ngân sách thử cho RE4-001 (usage thật), GPU, và đo âm thanh → chữ;
- MAIN-040-B (migration thêm cột usd).

Không push main khi chưa duyệt.

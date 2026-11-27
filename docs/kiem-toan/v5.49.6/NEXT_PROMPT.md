# Tiếp v5.49.6 ở mức HIGH

Repo `thanhnghiaplay-ai/TyZo_Sub_Project`, nhánh `audit/v5.49.6-claude-re5`. Kiểm `git ls-remote` khớp với `STATE.json` và `git log`. Đọc `docs/kiem-toan/v5.49.6/STATE.json`, `HANDOFF.md`, `BACKLOG.json`. Không đọc lại toàn kho.

1. Sửa RE5-001-A: cận đầu vào tính trên đúng thân gửi nhà, áp dụng cho cả `model-call.ts` và `room-groq.ts`. Nên đưa việc chuẩn hóa vào một chỗ duy nhất để route không lệch được nữa.
2. Sửa RE5-001-B: allowlist model dịch cho cửa trả theo lượt, từ chối `groq/compound*` và model lạ. Kiểm ảnh hưởng tới model đang dùng trong catalog và key phòng. Cân nhắc tắt `room-groq` nếu không còn ai gọi.
3. Bỏ `todo` trong `src/lib/billing/re5-001.test.ts`; chạy `npm test` (UID tyzo, PG 55439), tsc, lint.
4. Checkpoint 4 tệp trong `docs/kiem-toan/v5.49.6/`, push nhánh, so SHA. Sau đó RE5-004 (HIGH) hoặc xin MEDIUM cho RE5-002, MAIN-040, RE5-003, RE5-005.

Không push main, không deploy, không gọi API trả phí, không đổi giá.

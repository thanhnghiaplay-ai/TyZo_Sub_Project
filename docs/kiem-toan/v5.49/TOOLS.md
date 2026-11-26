# Kết quả công cụ (kiểm toán v5.49, 27/11/2026)

Gốc so sánh: `48b6a19` (worktree riêng). Sau sửa: nhánh `ccr-9f1afcc8-iv7067`, commit mã `29e6c06`.

| Công cụ | Lệnh | Mã thoát | Kết quả |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | Sạch |
| ESLint | `npx eslint src --quiet` | 0 | Sạch (gốc cũng 0) |
| Test | `npm test` | 0 | 192 đạt + 7 bỏ qua (scripts, như gốc 191+7, thêm 1 test chặn sót tệp); 1353/1353 đạt (gốc 48b6a19 sau npm ci: 1315/1315); 1/1 test mock module |
| Test tranh chấp Postgres 16 thật | `TYZO_TEST_PG_URL=… node --experimental-strip-types --test <tệp>` | 0 | tyzo-modal-race 5/5, affiliate-payout 7/7, token-balance-race 1/1 |
| Dựng Vercel | `env -u DATABASE_URL npm run build` | 0 | Bỏ migration vì không có DATABASE_URL (đúng thiết kế) |
| Dựng VPS | `NITRO_PRESET=node-server vite build` + `fix-css-ref.mjs` | 0 / 0 | Chạy `.output/server/index.mjs` trên Postgres thử: migration 0001–0039 áp dụng, trang chủ 200 |
| Quay về | Test của `48b6a19` trên schema có 0038/0039 | 0 | 101/101 đạt (`bang-chung/rollback-compat.log`) |
| Playwright (dev + bản dựng) | kịch bản đăng ký Chủ thử, mở Admin, Reset số liệu thử | 0 | Máy tính và điện thoại: có nội dung, không tràn ngang, không lỗi console của app (chỉ lỗi tải tài nguyên ngoài bị chặn mạng). Reset: mã do máy chủ cấp, xác nhận đạt |
| Semgrep 1.185.0, luật `a5ad171` | `cong-cu.sh bao-mat` | 1 (có phát hiện, nay báo đúng) | 85 chỗ (gốc 82). 3 chỗ mới đều sai: `no-stringify-keys` ở affiliate-payout.ts (chuỗi JSON lưu tài khoản ngân hàng, không làm khóa; chuyển từ affiliate-room.ts), `no-replaceall` ở test Node 22 |
| Gitleaks 8.30.0 | `cong-cu.sh bi-mat` | 0 | Lịch sử 70 commit: không lộ. Thư mục hiện tại: không lộ (sau khi bỏ `.output/` là bản dựng cục bộ, đã thêm vào `.gitignore`) |
| dependency-cruiser 18.7.2 | `cong-cu.sh phu-thuoc` | 0 | 0 lỗi, 9 cảnh báo vòng import (như cũ) |
| Graphify 0.9.119 | `graphify update . --force` | 0 | 6149 nút, 17498 cạnh, dựng từ commit `29e6c06`; lưu ở commit `324eec3` |

Không chạy: CSDL thật (Neon/VPS), GPU Modal thật, Alibaba thật, Android (không có SDK), GitHub Actions.

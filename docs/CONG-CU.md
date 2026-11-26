# Bộ công cụ phát triển TyZo (cho Claude Code)

Thiết lập 26/11/2026. Mọi công cụ ở đây chỉ **đọc và báo cáo**. Không công cụ nào được tự đẩy code, gộp nhánh, deploy hay sửa database thật.

## 1. Bảng tóm tắt

| # | Công cụ | Nguồn chính thức | Bản | Trạng thái | Ghi chú |
|---|---|---|---|---|---|
| 1 | Playwright MCP | npm `@playwright/mcp` (Microsoft) | 0.0.85 | PASS | Chạy Chromium có sẵn `/opt/pw-browsers/chromium`, cần `--no-sandbox` (chạy bằng root) |
| 2 | Filesystem MCP | npm `@modelcontextprotocol/server-filesystem` | — | SKIPPED | Trùng công cụ có sẵn của Claude Code (Read, Grep, Glob, Edit), vốn đã giới hạn trong thư mục dự án |
| 3 | Postgres MCP Pro | github.com/crystaldba/postgres-mcp | commit `7136a30` | PARTIAL | Thử đạt trên CSDL thử (đọc được, CHẶN `DELETE`). Chưa nối Neon thật: cần vai chỉ-đọc (mục 4) |
| 4 | GitHub MCP | có sẵn trong Claude Code trên web | — | PASS | Chỉ trong kho TyZo. Không tự đẩy hay gộp |
| 5 | Context7 MCP | mcp.context7.com (Upstash) | máy chủ từ xa | PASS | Chạy trong môi trường `TyZo_Sub_Project` (đã mở `context7.com`). API key miễn phí lưu ở bí mật mạng của môi trường, máy chủ tự gắn; không có trong kho |
| 6 | Sequential Thinking MCP | npm `@modelcontextprotocol/server-sequential-thinking` | 2.1.1 | PASS, để TẮT | Claude đã có suy luận nhiều bước; bật tay khi thật cần |
| 7 | Graphify | PyPI `graphifyy` | 0.9.119 | PASS | Đã dựng lại sơ đồ theo cấu trúc mới |
| 8 | Semgrep | PyPI `semgrep` + github.com/semgrep/semgrep-rules | 1.185.0 | PASS | Luật lấy từ kho chính thức qua git (trang semgrep.dev bị chặn mạng) |
| 9 | Gitleaks | github.com/gitleaks/gitleaks (dựng từ mã nguồn) | v8.30.0 | PASS | Không có bí mật thật trong mã và lịch sử Git |
| 10 | dependency-cruiser | npm `dependency-cruiser` | 18.7.2 | PASS | 0 lỗi, 9 cảnh báo (mục 3) |

Chọn bản cũ hơn khoảng 2 tuần so với ngày cài (an toàn chuỗi cung ứng). Riêng Postgres MCP Pro: mọi bản phát hành cũ phụ thuộc `pglast` 7.2 / 7.11, nay không còn trên PyPI; dùng đúng commit sửa lỗi của chính tác giả (25/11/2026, chỉ đổi phiên bản `pglast`).

## 2. Cách dùng hằng ngày

```bash
bash scripts/tools/cong-cu.sh cai        # phiên mới: cài/kiểm semgrep, gitleaks, postgres-mcp, graphify
bash scripts/tools/cong-cu.sh bi-mat     # gitleaks (che giá trị)
bash scripts/tools/cong-cu.sh bao-mat    # semgrep, chỉ mức WARNING/ERROR
bash scripts/tools/cong-cu.sh phu-thuoc  # dependency-cruiser theo .dependency-cruiser.cjs
bash scripts/tools/cong-cu.sh so-do      # graphify update (không gọi AI)
bash scripts/tools/cong-cu.sh tat-ca
```
Báo cáo ghi ở `/tmp/tyzo-cong-cu/` (đổi bằng biến `TYZO_TOOLS_OUT`), không ghi vào kho.

MCP khai ở `.mcp.json`. Lần đầu mở phiên mới, Claude Code hỏi duyệt từng máy chủ MCP: duyệt `playwright`, `postgres`, `context7`; **từ chối `sequential-thinking`** (chỉ bật khi cần, đỡ tốn Token).

**Đề xuất quyền (Chủ tự quyết, Claude KHÔNG tự đặt quyền cho chính mình):** nếu muốn bớt hỏi duyệt và chặn thao tác nguy hiểm, Chủ tạo tệp `.claude/settings.json` với nội dung:
```json
{
  "enabledMcpjsonServers": ["playwright", "postgres", "context7"],
  "disabledMcpjsonServers": ["sequential-thinking"],
  "permissions": {
    "allow": ["Bash(bash scripts/tools/cong-cu.sh:*)", "Bash(graphify explain:*)", "Bash(graphify path:*)", "Bash(graphify query:*)"],
    "deny": ["Bash(git push --force:*)", "Bash(git push -f:*)", "Bash(vercel:*)", "Bash(npx vercel:*)", "Read(./.env)", "Read(./.env.*)"]
  }
}
```
`deny` chặn đẩy đè lịch sử, deploy bằng lệnh Vercel và đọc tệp `.env`. `allow` chỉ gồm lệnh đọc/báo cáo.

## 3. Kết quả quét đầu tiên (26/11/2026, nhánh `main` 39b1e1e)

**Gitleaks** (lịch sử 45 MB + tệp hiện tại): 14 chỗ khớp, đều không phải bí mật thật. Đã đưa vào danh sách bỏ qua có ghi lý do (`.gitleaks.toml`, `.gitleaksignore`):
- `graphify-out/cache/stat-index.json`: chuỗi băm tệp.
- `src/lib/live/live-wire.test.ts`: chuỗi giả trong test.
- `.vercel/…/node-edge-tts.mjs`: mã công khai của thư viện.
- `src/lib/auth/preview.ts`: mã OAuth dùng chung cho bản xem trước của nền tảng (cố ý, quyền thấp; bản thật dùng `GROK_AUTH_CLIENT_SECRET`).

Không thấy token GitHub, mật khẩu root, chuỗi Neon, token Modal trong mã hay lịch sử. Các key Chủ từng dán vào khung chat vẫn nên đổi (khung chat không phải kho mã).

**Semgrep** (502 tệp, 407 chỗ, 82 chỗ mức WARNING/ERROR). Đã kiểm tay các chỗ mức cao:
- `js-open-redirect` ở `src/lib/auth/client.ts`: SAI (địa chỉ do app tạo, đã kiểm cùng nguồn; `data.url` do máy chủ đăng nhập trả).
- `detect-redos` ở `groq-board.ts` (ID_RE) và `text.ts` (KEPT_INTERJECTION): rủi ro thấp (dấu phân cách bắt buộc mỗi lượt lặp; chỉ chạy trên một từ / trang giá Groq).
- `generic-api-key` ở `preview.ts`: như trên.
- `detect-insecure-websocket` ở `scripts/live-try.ts`: công cụ thử trên máy, cho phép `ws://` cục bộ, không vào bản chạy thật.
- Còn lại chủ yếu là kiểu viết (`jsx-not-internationalized` 252 chỗ, chuỗi HTML trong thư email…), không phải lỗ hổng.

**dependency-cruiser** (659 tệp, 2.442 liên kết): 0 lỗi; 9 cảnh báo:
- 8 vòng import, nằm ở cụm thanh toán (`pay-store` → `pay-flow` → `affiliate-flow` → `giay-room` → `pay-store`), cụm đăng nhập/thư (`auth/middleware` → `verify.server` → `auth/server` → `mail-runtime` → `admin-room`/`middleware`), thuật ngữ (`glossary-import` ↔ `sub/glossary` ↔ `glossary-room`), `vad` ↔ `vad-runtime`, `auth/mailer` ↔ `smtp.server`.
- `src/lib/error-component.tsx` import `src/components/ui/icon.tsx` (lõi phụ thuộc giao diện).
- Chưa sửa (nhiệm vụ này không sửa mã nghiệp vụ). Nên gỡ dần, bắt đầu từ cụm thanh toán.

## 4. Postgres MCP Pro với Neon (chưa làm, cần Chủ)

Mặc định chỉ đọc (`--access-mode=restricted`: chặn INSERT/UPDATE/DELETE/DDL). An toàn hơn nữa: tạo vai chỉ-đọc riêng trên Neon:
```sql
create role tyzo_ro login password '<mật khẩu mạnh>';
grant connect on database neondb to tyzo_ro;
grant usage on schema public to tyzo_ro;
grant select on all tables in schema public to tyzo_ro;
alter default privileges in schema public grant select on tables to tyzo_ro;
grant pg_read_all_stats to tyzo_ro;
```
Rồi đặt biến `TYZO_DB_RO_URL` trên máy chạy Claude Code (KHÔNG ghi vào kho, KHÔNG dán vào khung chat). Lưu ý: môi trường đám mây có thể chặn cổng 5432 của Neon; khi đó chạy từ VPS hoặc máy tính. Không đặt biến thì máy chủ trỏ về CSDL thử cục bộ (`127.0.0.1:55432`).

## 5. Quy trình phối hợp khi nhận việc

1. Xác định nhánh và commit (git hoặc GitHub MCP).
2. Sơ đồ graphify còn khớp commit không (`graphify-out/GRAPH_REPORT.md`); cũ thì `cong-cu.sh so-do`.
3. Hỏi sơ đồ phạm vi ảnh hưởng: `graphify explain "<hàm>"`, `graphify path "A" "B"`. Không đưa cả `graph.json` vào ngữ cảnh.
4. Đọc mã thật bằng Read/Grep (không tin sơ đồ thay cho mã).
5. Thư viện: Context7 khi mạng cho phép; không thì đọc `node_modules/<gói>` đúng bản đang cài.
6. Việc rối (đua dữ liệu, tiền, nhiều tầng): mới bật Sequential Thinking.
7. Liên quan database: Postgres MCP chỉ đọc; sửa dữ liệu thì viết migration, Chủ duyệt.
8. Sửa mã khi được giao.
9. `npx tsc --noEmit`, eslint các tệp đổi, test liên quan; trước khi bàn giao: `npm test` + dựng thử.
10. Theo phạm vi: `cong-cu.sh bi-mat` (mọi lần đổi cấu hình/biến), `bao-mat` (đổi đăng nhập, tiền, API), `phu-thuoc` (dời/tách tệp).
11. Đổi giao diện hay luồng khách: Playwright (máy tính + điện thoại 390×844, xem lỗi console và mạng, chụp ảnh làm bằng chứng). Chỉ trên bản thử, không thanh toán thật.
12. Xong việc lớn: `cong-cu.sh so-do`.
13. Báo cáo kèm bằng chứng.

Không cần gọi cả 10 công cụ cho mọi việc.

## 6. Tiết kiệm Token

- MCP chỉ duyệt 3 máy chủ; Sequential Thinking để tắt.
- Graphify: hỏi đúng điểm, không đọc cả sơ đồ.
- Database: luôn `limit`, không kéo dữ liệu khách vào ngữ cảnh.
- Sửa nhỏ: chỉ test liên quan; trước khi phát hành mới chạy toàn bộ.

## 7. Cập nhật và gỡ

- Nâng bản: sửa số phiên bản ở đầu `scripts/tools/cong-cu.sh` và trong `.mcp.json`, chọn bản cũ hơn ~2 tuần, chạy lại `tat-ca`.
- Gỡ MCP: xóa mục trong `.mcp.json`. Gỡ công cụ dòng lệnh: `uv tool uninstall semgrep postgres-mcp`, `rm /usr/local/bin/gitleaks`, `pip uninstall graphifyy`.
- Gỡ cả bộ: xóa `scripts/tools/`, `.mcp.json`, `.claude/settings.json` (nếu Chủ đã tạo), `.dependency-cruiser.cjs`, `.gitleaks.toml`, `.gitleaksignore`, tệp này.

## 8. Chi phí và tài nguyên

- Không phát sinh phí: mọi công cụ miễn phí, chạy trên máy.
- Context7 bản miễn phí có giới hạn số lần hỏi (khi được mở mạng).
- Semgrep quét toàn bộ khoảng 1–2 phút; gitleaks lịch sử khoảng 1 phút; dependency-cruiser dưới 1 phút; graphify khoảng 1 phút.
- Mỗi máy chủ MCP bật thêm danh sách công cụ vào phiên (tốn một ít Token); vì vậy chỉ bật 3.

## 9. Giới hạn còn lại

- Context7 chỉ chạy trong môi trường `TyZo_Sub_Project` (môi trường Default không mở `context7.com`, không có key). Key hết hạn hay hết lượt: Chủ tạo key mới ở context7.com/dashboard, Claude mở lại ô nhập bảo mật.
- Postgres MCP với Neon: cần vai chỉ-đọc và chỗ chạy mở được cổng 5432.
- Môi trường `TyZo_Sub_Project` (tạo 26/11/2026, chỉ của Chủ) có setup script tự cài semgrep, postgres-mcp, gitleaks, graphify mỗi khi mở phiên (thêm khoảng 3–5 phút). Mở phiên mới nhớ chọn môi trường này. Setup script chưa được kiểm ở một phiên mới hoàn toàn: phiên đầu tiên nên chạy `bash scripts/tools/cong-cu.sh cai` để xác nhận (đã có thì lệnh bỏ qua).
- Hook tự động: KHÔNG đặt (theo yêu cầu: không tự đẩy, gộp, deploy, sửa database).

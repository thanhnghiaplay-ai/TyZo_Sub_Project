# TyZo v5.49.7 · Hồ sơ bàn giao kiểm toán độc lập (RE6-003 → RE6-007)

Người nhận: ChatGPT, kiểm toán độc lập. Người thực hiện: Claude Code (Opus 5.5, mức Medium). Ngày: 28/11/2026.

Kiểm toán **mã nguồn và bằng chứng trên GitHub**, không dựa vào lời tóm tắt trong hồ sơ này. Mỗi kết luận dưới đây có đường dẫn tới tệp hoặc lệnh dùng để kiểm lại.

## 1. Định danh mã

| Mục | Giá trị |
|---|---|
| Kho | `thanhnghiaplay-ai/TyZo_Sub_Project` |
| Nhánh kiểm toán | `ccr-654dbe0e-978ok7` |
| Gốc so sánh (RE6-002, đã có trên `work` và `audit/v5.49.7-codex-re6`) | `c0bcf6fc3b7c1a3766679b0707c580b8ec4a8abe` |
| Checkpoint RE6-001 (tổ tiên của gốc) | `017cad371595f641d681da7f79eeeb62d617b40b` |
| Commit mã cuối (trước hồ sơ này) | `88c7e4705a4bb5aeebf5f2862c20c3da963478e9` |
| `main` | `ea38bcd` (không bị đụng, không merge) |

Các commit trong phạm vi, theo thứ tự:

| Commit | Nội dung |
|---|---|
| `30ed3ba` | fix(RE6-003): xác minh Vercel qua trạng thái API có cấu trúc |
| `8b733b5` | fix(RE6-004): giữ trước chi phí xấu nhất cho mỗi lệnh đo Modal |
| `0a1c405` | fix(RE6-005): đo độ trễ live bằng đồng hồ monotonic, dọn bộ đếm khi đóng |
| `b2cadf0` | test(RE6-007): kiểm và đo `tyzo_admit` trên PostgreSQL 18.7 |
| `6841fa5` | docs: hồi quy, bàn giao, checkpoint |
| `88c7e47` | docs: gói kiểm toán (patch, diff, manifest SHA-256, ZIP) |

Xem nhanh toàn bộ thay đổi mã: `git diff c0bcf6f 88c7e47 -- . ':!docs'`. Có 12 tệp, +1096/−244 dòng.

**Sự cố khôi phục tiến độ:** bản RE6-003 chưa push của Codex **không tồn tại trên remote** (không commit nào trên bất kỳ nhánh nào nhắc tới RE6-003). Vì vậy RE6-003 được viết lại từ đầu trên gốc `c0bcf6f`. Không nhánh nào bị ghi đè hay force-push.

## 2. Kết luận theo mục

| Mục | Trạng thái | Bằng chứng | Tệp mã chính |
|---|---|---|---|
| RE6-001 | PASS_LOCAL_POLICY_PENDING (giới hạn vẫn **TẮT**) | `RE6-001/REPORT.md` | (không đụng trong phiên này) |
| RE6-002 | PASS_LOCAL | `RE6-002/REPORT.md` | (không đụng) |
| **RE6-003** | **PASS_LOCAL** | `RE6-003/` | `deploy/vps/tyzo.sh` (`chay_vercel_sh`, `buoc_vercel`, `id_vercel`, `dua_len_vercel`) |
| **RE6-004** | **PASS_LOCAL** | `RE6-004/` | `deploy/vps/do-modal/do-modal.py` |
| **RE6-005** | **PARTIAL** | `RE6-005/` | `deploy/vps/do-live/live-measure.ts`, `do-live.ts`, `chay.sh` |
| RE6-006 | PASS_LOCAL | `RE6-006/REPORT.md` | (không đụng) |
| **RE6-007** | **PASS_LOCAL, không tối ưu** | `RE6-007/` (có `benchmark.json`) | chỉ thêm test, migration 0057 giữ nguyên |
| RE6-008 | OPEN_VERIFY, chưa làm | — | cần mức High |
| RE6-009 | OPEN_VERIFY, chưa làm | — | Medium, làm sau RE6-008 |
| RE6-010 | OPEN_VERIFY, chưa làm | — | cần mức Low |

Mỗi thư mục `RE6-00x/` gồm `before.txt` (lỗi trước sửa), `REPORT.md` (thay đổi, phục hồi, giới hạn) và `test-summary.txt` (đầu ra test đã chạy).

## 3. Điểm cần kiểm chặt (đề xuất của người thực hiện)

### RE6-003 · Vercel

Mã nằm trong `deploy/vps/tyzo.sh`, khối `chay_vercel_sh`. Script Node được nhúng bằng heredoc `JS`.

1. Tên trường REST API có thể sai so với Vercel thật, vì chưa thử trên Vercel thật. Các trường đang dùng:
   - `/v13/deployments/{url}`: `id`, `url`, `projectId`, `target`, `meta`, `readyState`, `aliasAssigned`, `aliasError`, `alias[]`
   - `/v10/projects/{id}/env?decrypt=true`: `envs[].key`, `target[]`, `type`, `value`, `decrypted`, `gitBranch`
   - `/v1/projects/{id}/env/{envId}`
   - `/v4/aliases/{alias}`: `deploymentId`
   - `/v6/deployments?projectId&target=production`: `uid`, `readyState`, `meta`

   Đối chiếu với tài liệu Vercel hiện hành.
2. Mọi sai lệch phải **fail closed**, nghĩa là không in `BUOC kiem-xong`. `buoc_vercel` chỉ trả `xong` khi có mốc đó. Hãy kiểm có nhánh nào thoát 0 mà chưa kiểm hay không.
3. Biến loại `sensitive` không đọc lại được nên luôn chặn deploy. Đây là quyết định có chủ ý, cần xác nhận là chấp nhận được.
4. Token vẫn nằm trên dòng lệnh `vercel --token` bên trong container. Đây là hành vi có từ trước, không phải mới. Trong API, token chỉ nằm ở header. Giá trị env không được in ra, không ghi nhật ký, không nằm trên dòng lệnh. Test `noLeak` kiểm điều này cho mọi ca.
5. Biến `PROBE_BASE` và `VERCEL_API` chỉ để test. Kiểm rằng `dua_len_vercel` không truyền chúng vào container, để production luôn dùng `https://`.
6. Phục hồi: nhật ký chuyển nguồn ghi `loi-<bước> <project> <deployment-id> <sha>`. Kiểm rằng menu phục hồi RE6-002 vẫn giữ nguồn VPS khóa với các bước mới `loi-kiem-chua-dat` và `loi-deploy-chua-ro`.

### RE6-004 · Modal

1. Giữ chỗ = `CALL_DEADLINE_S/3600 × GPU_USD_PER_HOUR + MODEL_CAP_USD`. Nếu Modal tính theo cách khác (nhiều GPU, phí khởi động), trần vẫn chỉ là ước tính. `summary.budget_kind` đã ghi rõ «không tuyệt đối».
2. Kiểm khả năng race giữa `_take` và `_settle`, và đường `finally` luôn trả phần giữ chỗ.
3. Chỉ đi theo chuyển hướng cùng máy và cùng scheme. Token chỉ có trong thân POST đầu.

### RE6-005 · Live (PARTIAL)

1. Phân vị dùng nearest-rank (`ceil(p·n)−1`). Kiểm cách tính với n nhỏ.
2. Mặc định model đổi từ 3.8 sang **3.5**, theo app từ v5.49.6.
3. **Chưa giải quyết:** tên riêng viết bằng chữ Hán, kana hoặc Hangul bị bộ lọc xóa khỏi bản dịch Việt/Anh. Test `GIỚI HẠN ĐÃ BIẾT` ghi lại hành vi này. Người thực hiện không tự đổi vì khách nhìn thấy kết quả và cần Chủ quyết.
4. Mốc đo là lúc máy đo **nhận** sự kiện, chưa phải lúc giao diện vẽ chữ. Đo trên Web/Android thật là BLOCKED.

### RE6-007 · Admission

1. Benchmark chạy trên Docker loopback, 4 CPU, không phải phần cứng Neon/VPS. Chỉ nên dùng số liệu để so tương đối.
2. Kết luận «không tối ưu» dựa trên giả định quy mô: tổng trần mặc định khoảng 104 suất và `MAX_PENDING_ADMISSIONS=32` mỗi tiến trình. Hãy kiểm giả định này.
3. Số đo trường hợp xấu nhất (khách chờ chung lane, không ai giữ chỗ): p50 1,57 / 4,42 / 17,72 ms với 0 / 1k / 5k khách chờ. Burst 300 hết 0,96 / 1,10 / 1,78 s.

## 4. Cách chạy lại test

```bash
npm ci --ignore-scripts
# Không cần CSDL
node --test scripts/re6-003-vercel.test.mjs scripts/re5-004-vercel.test.mjs   # 24/24
node --test scripts/re6-004-do-modal.test.mjs                                  # bọc 8 test Python
node --test scripts/re6-005-live-measure.test.mjs src/lib/live/leftover-script.test.ts  # 7 + 6
npx tsc --noEmit -p .

# PostgreSQL 18.7 thử (KHÔNG dùng production)
docker run -d --name pg18 -e POSTGRES_PASSWORD=test -p 127.0.0.1:55432:5432 postgres:18.7-bookworm -c max_connections=500
docker exec pg18 psql -U postgres -c "create database bench"
DATABASE_URL="postgres://postgres:test@127.0.0.1:55432/bench?sslmode=disable" node scripts/migrate.mjs
TYZO_TEST_PG_URL="postgres://postgres:test@127.0.0.1:55432/bench?sslmode=disable" \
  RE6_BENCH_OUT=/tmp/bench.json node --test scripts/re6-007-admission-pg.test.mjs   # 7/7
```

Hồi quy toàn phần (xem `REGRESSION.md`):

| Bộ | Kết quả |
|---|---|
| TypeScript | đạt |
| `src` | 1483/1483 |
| module-mocks với PG 18.7 | 101/101 |
| `scripts` | 231 đạt · 46 bỏ qua · 1 lỗi |

Lỗi duy nhất là R8-002 (`scripts/migration-read-permission.test.mjs`). Máy thử chạy bằng uid 0 nên `chmod 000` không chặn được việc đọc. `scripts/migrate.mjs` và `migrations/` không đổi trong phạm vi này. Hãy chạy lại bằng user thường để xác nhận.

**Chưa chạy:**
- `npm run build`: phiên không sửa mã ứng dụng trong `src/`.
- Bộ khôi phục RE6-002 (`re3-restore-pg`): cần `pg_dump` 18 trên máy chạy test. Phần `tyzo.sh` mà bộ này dùng không bị sửa.

## 5. Gói tệp

Thư mục `docs/kiem-toan/v5.49.7/audit-bundle/`:

- `patches/0001…0005-*.patch`: dùng được với `git am` trên `c0bcf6f`.
- `re6-003-007.diff`: diff gộp từ gốc.
- `MANIFEST.txt`: danh sách commit và SHA-256 mọi tệp hồ sơ.
- `tyzo-v5.49.7-re6-audit.zip`: toàn bộ thư mục `v5.49.7/` tại thời điểm đóng gói (chưa gồm tệp này).

Ngoài ra có `BACKLOG.json`, `STATE.json`, `HANDOFF.md`, `NEXT_PROMPT.md` và `REGRESSION.md`.

## 6. Giới hạn quyền đã tuân thủ

- Không merge `main`, không deploy production, không thao tác database production.
- Không gọi Vercel, Neon, Modal hay Alibaba thật. Không dùng thông tin xác thực thật. Không thuê GPU.
- Không đổi giá hay quyền lợi khách. Không bật giới hạn ngân sách RE6-001.
- Không sửa migration đã áp dụng. Không thêm tính năng ngoài RE6.

## 7. Câu hỏi đề nghị kiểm toán viên trả lời

1. Mỗi trạng thái PASS_LOCAL có được bằng chứng hỗ trợ đầy đủ theo tiêu chí `acceptance` trong `BACKLOG.json` hay không?
2. Có đường nào trong `chay_vercel_sh` báo `xong` mà chưa kiểm đủ không? Có đường nào in hoặc ghi bí mật không?
3. Trong `do-modal.py`, có kịch bản đồng thời nào làm tổng chi vượt `TRAN_USD` không?
4. RE6-005 nên giữ PARTIAL hay hạ xuống BLOCKED cho phần tên riêng?
5. Kết luận «không tối ưu» của RE6-007 có hợp lý với số đo hay không?
6. Hãy xếp hạng các phát hiện mới theo P0/P1/P2, kèm tệp, dòng và kịch bản lỗi cụ thể.

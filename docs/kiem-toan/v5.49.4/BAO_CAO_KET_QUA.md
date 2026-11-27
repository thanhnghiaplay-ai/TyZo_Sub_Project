# TyZo v5.49.4 — Báo cáo kết quả cho kiểm toán độc lập

**Không phải chứng nhận production.** Mọi số liệu đo trên máy thử cục bộ (PostgreSQL 16 riêng, upstream giả). Không merge main, không deploy, không thuê GPU, không dùng CSDL khách, không đổi giá/quyền lợi/quy tắc Token.

- Repo `thanhnghiaplay-ai/TyZo_Sub_Project`, nhánh **`ccr-20605d15-2nil6k`**, gốc **`6d906ba`** (khớp 1468/1468 hash `06_SOURCE_MANIFEST.json`).
- Mã sản phẩm khóa tại **`c5c39c7`** (sau đó chỉ tài liệu/graph/bằng chứng). Mỗi checkpoint đã push và xác minh bằng `git ls-remote`.
- Bằng chứng: `bang-chung/<nhãn>.log` (mỗi log ghi HEAD, độ bẩn cây, fingerprint `src+scripts+migrations+server+package*`, lệnh, mã thoát, thời gian; nhãn không ghi đè; log thất bại được giữ). Ảnh: `anh/`. Quét: `quet/`. Soak: `soak/`.

## 1. Tám phát hiện RE3

| ID | Ưu tiên | Kết quả | Commit | TRƯỚC (đã tái hiện) | SAU |
|---|---|---|---|---|---|
| RE3-001 | P0 | **PASS cục bộ** | 0caa1c9 | Lỗi sau journal: trừ 2210 Token thay vì 3220 (thiếu 1010) | 6/6 lỗi chèn + 6/6 đơn vị + 121/121 liên quan + bench WS 1…300: 0 sai sổ |
| RE3-002 | P0 | **PASS cục bộ** | dc8cf4e | Opus thấp 13,6 s/60 s; 20 s/600 s; WAV giả 0,00024 s/30 s; libopus 18/37 s; app Chromium im lặng 20,4/90 s | 15/15; khớp ffprobe ±20 ms; app 30,02/30 và 90,02/90; không xác minh → 422 trước giữ/gửi |
| RE3-003 | P1 | **PASS cục bộ** | a65d0e7 | 6 nhịp chồng nhau; stop không chờ; mất lease không báo (0/5) | 5/5 + PG thật khóa dòng: peak 1, CSDL hủy sau timeout, deadline đúng |
| RE3-004 | P1 | **PASS cục bộ** | 5341d35 | 200 khách p95 300/p99 331 ms; đợt 300 p99 389 ms | p95 68/p99 102 ms; đợt 300 p99 177 ms; lượt nhận 1739→4085; 0 lỗi/deadlock |
| RE3-005 | P1 | **PASS cục bộ** | 5341d35 | alibaba 41 > cap 40 (batch+live) | đếm nhà/model mọi lane; 40/40; liveReserve (mặc định 0) |
| RE3-006 | P1 | **PASS cục bộ** | 5341d35 | Không đường mở theo bằng chứng; Admin 20 hồ sơ, không cảnh báo | tự mở khi có bằng chứng định đoạt + nhật ký; 3 bản chạy đua mở đúng 1 lần; Admin phân trang + cảnh báo (ảnh) |
| RE3-007 | P1 | **PASS cục bộ** | 42a6cf2 | Thiếu dòng/ghi phát sinh vẫn "✔ Đã nạp lên Neon"; Neon→VPS luôn hỏng "schema public" | 14/14: bảng kê, khóa ghi, so ba chiều, cổng chuyển có xác nhận |
| RE3-008 | P2 | **PASS** | c5e6dc6 | Graph từ 90cb5a53 | Dựng từ c5c39c7, 0 token, có hash |

Chi tiết từng mục (nguyên nhân, sửa, giới hạn, rollback): `RE3-001_LIVE_SETTLE.md`, `RE3-002_AUDIO_PROBE.md`, `RE3-003_LEASE_BEAT.md`, `RE3-004-005-006_ADMISSION.md`, `RE3-007_RESTORE.md`, `RE3-008_GRAPHIFY.md`; máy đọc: `RE3_KET_QUA.json`.

"PASS cục bộ" = đạt tiêu chí nghiệm thu trên fixture + PostgreSQL thật riêng; **chưa** staging/nhà cung cấp thật/VPS thật.

## 2. Sáu mục RE2 (`RE2_KET_QUA.json`)
RE2-001, 002, 003, 005, 006: **PASS cục bộ** (test PG thật theo đúng tiêu chí; 003/005 được củng cố bởi RE3-003/007).
**RE2-004: PARTIAL** — không còn polling CSDL; 200 khách p95 30–68 ms, 0 vượt cap; nhưng **2/200 khách không được lượt nào trong 8 s** khi quá tải ~5× (`re2-004-fairness-bench.log`). Cần hàng đợi bền công bằng theo người dùng + ETA → thay đổi trải nghiệm khách, cần Chủ quyết.

## 3. Tám mươi mục lịch sử (`DOI_CHIEU_80.json`)
Giữ nguyên mọi trường lịch sử; thêm `reaccept_v5_49_4` (HEAD, bằng chứng, ghi chú).
- **68 PASS**: test mang đúng ID đạt trên HEAD (hoặc tệp test có ID trong `npm test`, toàn bộ đạt), diễn tập restore (REF-013, AZ-001, R8-001), quét công cụ (NEW-001/002/004/007), kiểm tĩnh (R8-005). Các mục NEEDS_OWNER/DEFERRED cũ (MAIN-038, R3-001, R3-003, R4-003, R5-005/006, R8-003, AZ-006, DEEP-003…) đã có test mang ID đạt.
- **8 PARTIAL**: MAIN-040 (chỉ đọc mã), NEW-008 (không có test), R5-009 (cần trình duyệt), AZ-002/003/004/008 (JVM 10/10 đạt `android-jvm-session-api.log`, chưa máy Android thật).
- **2 BLOCKED**: R3-006 (updater cần SDK + máy thật), R8-002 (test chmod không chặn được root; phiên chạy bằng root — `env-r8-002-as-root.log`; mã không đổi).
- **2 BY_DESIGN**: R7-002, R7-005.

## 4. Cổng
| Cổng | Kết quả | Log |
|---|---|---|
| typecheck | 0 lỗi | gate-cp5-typecheck |
| lint | 0 lỗi, 23 cảnh báo có sẵn | gate-cp5-lint |
| npm test (3 nhóm, PG thật) | **1732 đạt, 7 bỏ qua, 1 lỗi** (R8-002 do root) | gate-cp6-test, -group1, -group2 |
| check:auth | dev và build thống nhất | gate-auth-invariant |
| build Vercel mặc định | 0 | gate-cp5-build |
| build Node (node-server) + smoke máy tính/điện thoại | 0; 4/4 trang 200, 0 lỗi ứng dụng | gate-final-build-node, gate-final-smoke-node-build-2 |
| Migration 0053/0054 | cài mới, lặp lại, nâng cấp giữ dữ liệu cũ, lỗi giữa tệp rollback | migration-drill-0053-0054-2 |
| Android JVM (Session.kt, Api.kt thật) | 10/10 | android-jvm-session-api |

Lưu ý trung thực: cổng toàn bộ lần 1 bắt được lỗi của chính đợt này (0054 có dòng `begin` bị `migrate.mjs` từ chối) → sửa ở eaadb21. Lỗi R8-002 làm `&&` trong `npm test` dừng sớm nên hai nhóm `src` được chạy riêng và ghi log riêng.

## 5. Quét
- Gitleaks (lịch sử + hiện tại): 2 chuỗi giả trong test có sẵn → ghi đúng 2 vân tay vào `.gitleaksignore` (có lý do), sau đó **no leaks**. Thư mục bằng chứng được quét trước khi commit.
- Semgrep (luật ghim): 92 phát hiện (R09: 120) → 78 dương tính giả, 13 chấp nhận (`replaceAll`), 1 mã thừa vô hại (`run-desk.ts:140`); 1 lỗi phân tích một phần (`landing-page.tsx:145`). Từng dòng trong `quet/semgrep-triage.json`.
- dependency-cruiser: 0 lỗi, 9 vòng (có sẵn; không có tệp mới tham gia).

## 6. Chịu tải 100–200 khách (cục bộ)
- Cửa nhận việc: xem bảng RE3-004. Quyết toán live WS thật + PG thật 1…300: 0 sai sổ, số quan sát = số lượt ghi chi phí.
- **Soak 3600 s**: xem mục 9 (điền sau khi chạy xong; không cộng dồn lần ngắt).
- **Giới hạn sức chứa là cấu hình** (mặc định `perModel` 24, `perProvider` 40, `live` 48): với 100–200 khách cùng lúc phần vượt nhận 429 + Retry-After. Nâng giới hạn phụ thuộc hạn mức Groq/Alibaba → Chủ quyết.
- Chưa đo: Neon từ Vercel (RTT thật), nhiều tiến trình Node/VPS, mạng thật, GPU, độ trễ phụ đề đầu-cuối.

## 7. Lỗi mới phát hiện ngoài 8 mục
1. Neon → VPS luôn hỏng ("schema public already exists") — đã sửa (RE3-007).
2. Log bằng chứng bị `*.log` trong `.gitignore` loại khỏi git — đã thêm ngoại lệ chỉ cho thư mục bằng chứng.
3. Dự toán token chữ cho chat vẫn `byteLength/3` (có thể giữ thiếu với văn bản lạ) — chưa sửa, ngoài phạm vi; quyết toán vẫn chặn ở phần giữ.
4. `scripts/browser-smoke.mjs` không chạy được khi Playwright của dự án lệch bản Chromium cài sẵn — dùng smoke riêng có `executablePath`.

## 8. Cần Chủ quyết / cung cấp
- Giới hạn sức chứa (perModel/perProvider/live) và `liveReserve` cho 100–200 khách theo hạn mức nhà cung cấp.
- Hàng đợi công bằng cho batch (RE2-004): có làm không, hiển thị ETA thế nào.
- Phiếu live giữ lại khi quyết toán chưa rõ: hiện tự nhả sau 6 giờ (cơ chế cũ) — giữ hay đổi.
- Máy Android thật, backup khách ẩn danh, staging Neon/VPS, ngân sách GPU (chưa có quyền).
- Khi phát hành: nâng APP_VERSION/ADMIN_LOG theo quy trình dự án (đợt này không tự nâng số phiên bản).

## 9. Soak
**soak-3600-1: PASS** — 3600 s liên tục (11:24:47→12:24:47 UTC), 212 vòng, mã khóa `c5c39c7`, không ngắt, không cộng dồn. Mỗi vòng: cầu nối live WS thật + PG thật quyết toán (1…300) và cửa nhận việc 25/50/100/200 + đợt 300 (3 s/nhóm). Thư mục `soak/soak-3600-1/` (từng vòng JSON).
- Sổ: ledgerViolations 0, duplicateCharges 0, số quan sát chi phí = kỳ vọng ở 212/212 vòng; tổng 1.052.128 Token trừ.
- Cửa nhận việc: 0 vượt cap, 0 lỗi/deadlock. 200 khách p95 trung vị 14 ms (tối đa 132), p99 trung vị 98 ms (tối đa 184); đợt 300 p99 trung vị 127 ms (tối đa 225).
- PostgreSQL RSS 151→154 MB (đỉnh 191 MB), không tăng dần. Thời gian vòng ổn định 16,6–17,7 s.
- Đói suất (RE2-004) trên mã này: tổng 2113 khách-lần không được lượt trong cửa sổ 3 s ở nhóm 200 (≈10/lần) → xác nhận cần hàng đợi công bằng (đang làm, xem TIEN_DO.md).
- Giới hạn: upstream giả, một máy, PG cục bộ; không có Web SSR trong vòng lặp; không GPU/nhà thật.

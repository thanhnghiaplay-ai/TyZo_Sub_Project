# REPORT — TYZO-STABILITY (TZ-014: nghiệm thu, bàn giao, rollback)

Nhánh: `fix/tyzo-stability`. Baseline: `main` f73e02d (APP_VERSION 5.49.9). Nhánh KHÔNG đổi APP_VERSION, KHÔNG thêm migration, KHÔNG đổi giá/công thức token, KHÔNG deploy, KHÔNG chạm dữ liệu production.
Mức bằng chứng cao nhất đạt được: **PASS_LOCAL** (PGlite + test đơn vị). Chưa có PASS_CI, chưa có PASS_PRODUCTION.

## 1. Sự cố gốc và kết luận

Sự cố v5.49.7 (MP4 135 MB, 6 đoạn, dừng 5%, nhận dạng 0/6, thông báo «Có công việc đang gửi hoặc cần đối soát…»).

Nguyên nhân gốc xác nhận (B-04): suất nhận việc Modal ở trạng thái `unknown` KHÔNG có `ref` (tiến trình chết hoặc mất lease trước bước gắn mã lệnh) không bao giờ được đối soát, vì sweep chỉ xét `ref is not null`. Suất này chặn mọi lượt mới của tài khoản (409) dù chưa gửi gì lên GPU.

Giả thuyết 429 phía frontend (B-01) và POST/303 Modal (B-02, B-05), đóng phiếu giữa ghi đoạn (B-03, B-06): mã main 5.49.8+ đã đúng, có test; ghi ALREADY_FIXED/NOT_REPRODUCED, không sửa trùng.

## 2. Thay đổi mã (so với baseline, 17 file không phải tài liệu)

| Mã | Tệp | Nội dung |
|---|---|---|
| B-04 | work-admission.ts, tyzo-modal-charge.ts | `tagWorkBeforeSend` (chỉ gắn ref khi suất còn `running`, false thì dừng TRƯỚC khi gửi GPU); sweep nhả suất Modal `unknown` không ref sau một chu kỳ lease; `acquireWorkInfo` đối soát một lần khi gặp `uncertain` |
| B-14 | run-gate.ts, async-asr.ts, work-admission.ts | Cùng nguyên tắc cho lane batch (2 chỗ trong run-gate, async-asr gắn ref trong giao dịch). Lane `live` giữ nguyên |
| B-07 | saved-runs.ts, use-pipeline.ts | Khôi phục bản lưu khi đổi ngôn ngữ đích thì phải dịch lại (không giữ bản dịch sai ngôn ngữ) |
| B-08 | stale-build.ts, update-banner.tsx | «Tải lại» ở thông báo bản mới hỏi xác nhận khi đang có việc chạy (dùng hộp thoại của app) |
| B-09 | use-pipeline.ts, studio.tsx | Nút «Đang chuẩn bị…» và khóa bấm trong lúc chuẩn bị |
| B-13 | package.json | Đăng ký `start-gate.test.ts` và `batch-admission.test.ts` trong `npm test` |
| B-15 | scripts/studio-layout-matrix.mjs | Chỉ sửa script kiểm tra (không đổi CSS/giao diện) |
| — | các tệp `*.test.ts` | Test mới/bổ sung: tyzo-modal-race, batch-admission, re8-010, saved-runs, stale-build, start-gate |

## 3. Bằng chứng kiểm thử (chi tiết: TESTS.md)

- `tsc --noEmit`: 0 lỗi tại HEAD (chạy lại ở phiên nghiệm thu).
- Hồi quy toàn bộ src tại 10484ba: 1680 test, 0 fail, 92 skip (cần Postgres thật). Từ đó chỉ thêm B-14 (+5 test, pass) và sửa script kiểm tra.
- Hồi quy billing + pipeline + re8-010 sau B-14: 286 test, 0 fail, 60 skip (PG thật).
- Nhóm scripts: 291 test, 244 pass, 1 fail (R8-002, chạy root, có sẵn), 46 skip.
- Kiểm đột biến: đột biến `releasePart` và sweep chỉ lane modal (B-14) bị test bắt;  check:layout phá CSS thì 13/32 lỗi.
- `vite build` (không chạy db:migrate): thành công. check:layout: 0 lỗi.
- semgrep 94 WARNING (không có mẫu bảo mật mới), dependency-cruiser 0 lỗi, quét secret bằng regex trên diff: không có. gitleaks BLOCKED (mạng).
- TZ-013: rà độc lập diff mã nguồn trong phiên mới, không thấy lỗi mới; mọi đường chặn trước khi gửi đều nhả phần giữ token.

## 4. Đối chiếu tiêu chí nghiệm thu cuối (MASTER.md)

| Tiêu chí | Trạng thái |
|---|---|
| 6/6 đoạn nhận dạng | PASS_LOCAL (logic admission/ghi đoạn có test); chưa chạy trên Modal/GPU thật |
| Không trùng GPU / phụ đề / token | PASS_LOCAL (bất biến tiền trên PGlite); idempotency hoàn tiền/ví trên PG thật: BLOCKED |
| Không treo khi thiếu suất | PASS_LOCAL (B-04, B-14); race nhiều replica trên PG thật: BLOCKED |
| Tiếp tục đúng đoạn thiếu | PASS_LOCAL một phần (B-07, hàm thuần); test trình duyệt reload/mất mạng: BLOCKED |
| Giao diện đúng | PASS_LOCAL (check:layout 0 lỗi); chưa có ảnh chụp thiết bị thật |
| Không hồi quy | PASS_LOCAL (số liệu mục 3) |
| Chênh +8.234 token (228.530→236.764) | BLOCKED, chưa kết luận: cần dữ liệu phiếu/sổ cái thật. Giả thuyết H-1 trong BUGS.md chưa kiểm chứng |

## 5. Còn mở / cần Chủ quyết định

1. Chạy test PG thật (29+ test đang skip) trên Postgres cô lập, và race nhiều replica.
2. Đối chiếu 8.234 token bằng dữ liệu thật (chỉ đọc, do Chủ cung cấp hoặc cho phép).
3. Thử trên Android thật với MP4 135 MB và test trình duyệt (reload, mất mạng, đổi tài khoản).
4. Ghi nhận P2-a/b/c (BUGS.md): siết host header Modal, nhịp chờ vòng 303, lỗi mạng trước khi gửi bị coi là chưa rõ. Chưa sửa vì cần xác minh hành vi Modal thật hoặc quyết định của Chủ.
5. gitleaks cần máy có truy cập proxy.golang.org.
6. `npm run build` đầy đủ gọi `db:migrate`: chỉ chạy với DATABASE_URL trống.

## 6. Cách đưa lên và rollback

Đưa lên (khi Chủ cho phép): mở PR `fix/tyzo-stability` → `main`, đợi Vercel preview (preview không migrate trừ khi `TYZO_PREVIEW_DB=rieng`), kiểm tay một lượt dịch ngắn trên preview, rồi mới gộp. Mỗi push = 1 lượt dựng Vercel (giới hạn 100/ngày).

Rollback: nhánh không có migration và không đổi dữ liệu, nên rollback chỉ là hoàn tác mã. Hoàn tác theo nhóm bằng `git revert` (không force push):
- Admission/GPU: e989097 (B-04), 2a4e59c (B-14). Hoàn tác riêng B-14 vẫn giữ B-04. Lưu ý: bỏ B-04 thì suất `unknown` không ref lại chặn tài khoản; khi đó phải đối soát tay (đặt suất `resolved` sau khi xác nhận không có lệnh GPU).
- Giao diện: e354f81 (B-09), ba63761 (B-08), 6b628fd (B-07), mỗi cái độc lập.
- 779c8ae (package.json) hoàn tác cùng với test tương ứng, nếu không `scripts/test-list.test.mjs` sẽ fail.
- Hoặc không gộp nhánh: `main` f73e02d không bị ảnh hưởng.

Sweep mới chỉ nhả suất khi CHẮC chắn chưa gửi (ref null, lane modal/batch, quá lease); suất có `ref` mà chưa có bằng chứng vẫn giữ khóa (không đổi so với trước).

# Báo cáo tiếp tục sửa v5.49.1 → ứng viên v5.49.2

Ngày kiểm: 2026-11-26 UTC (ngày môi trường; các nhật ký cũ mang ngày27/11 được bảo toàn). **Kết luận: PARTIAL. Chưa phát hành, chưa gộp main, chưa deploy.**

## Gốc và phạm vi

Người dùng chỉ định `ccr-9f1afcc8-iv7067`; tiếp tục từ `d5a2fed119456b1b33cbb7934763ec1b365ce355`, không merge main. Worktree `/workspace/TyZo-ccr-9f1afcc8-iv7067`. Đã giữ checkout main cũ và thay đổi tooling của nó. Chỉ thị gốc được lưu cùng thư mục. Người dùng đã rút yêu cầu dừng do giới hạn và yêu cầu tiếp tục.

Giữ giá, tỷ lệ Token, ba nhà cung cấp, lịch sử tài chính và đoạn sửa thủ công. Không sửa `auth/client.ts`, `scripts/sign-out-plan.mjs`, không nâng dependency/package-lock. Phiên bản5.49.2 là ứng viên trong nhánh, không phải thông báo đã chạy trên production.

## Phát hiện, nguyên nhân và kết quả

| ID / ảnh hưởng | Hiện trạng trước / nguyên nhân | Xử lý và kết quả thực tế | Giới hạn |
|---|---|---|---|
| R3-008 / IP rate-limit | Header tùy ý/không đồng nhất giữa ingress | helper allowlist và validate, VPS chọn header theo EDGE; 4test PASS | Chưa kiểm Caddy/Cloudflare/Vercel thật; origin phải bị chặn và ingress phải ghi đè header |
| R3-009 / tiền | Thiếu duration không có mức tính dự phòng phù hợp | tính ước từ audio, gắn can-doi-soat; fixture60giây từ6→34đ, unit PASS | Không đổi giá; usage có thật vẫn ưu tiên thật, không dùng ước lượng nén làm sàn trên usage thật. Chưa UI/đối soát provider thật |
| R5-008 / riêng tư | IDB dùng chung tài khoản | namespace/owner + hủy job cũ khi đổi chủ; nativeIDB A/B/anonymous/reload PASS | Bản legacy không rõ chủ giữ nguyên, không tự giao cho người mới; chưa E2E đổi tài khoản lúc chạy AI |
| R6-006 / lưu trữ | PUT fail không chứng minh object chưa tồn tại | cleanup key kể cả abort/mất reply, đợi tối đa2s; test PASS | Delete/lifecycle R2 thật chưa kiểm |
| R7-001 / nội dung | Chấm polish chỉ cấu trúc, có thể đổi số/phủ định/tên | so signature bảo thủ, fallback gốc; test trướcfail/sauPASS | Không chứng minh ngữ nghĩa mọi ngôn ngữ, tên không viết hoa/số bằng chữ; cần corpus thật |
| R7-003 / độ tin cậy | Glossary lỗi bị nuốt hoặc lặp | promise chia sẻ, 2lần thử, nhắc1lần; unit PASS | Provider/glossary transport fixture |
| R7-006 / hàng đợi | Stop không settle promise phát tiếng | WeakMap cancel và abort generation; unit/native Audio PASS | Chưa toàn bộ Web Speech/safari/Android |
| R8-004 / mất việc | Reload lỗi chunk giữa lúc còn tác vụ | holdPageActivity cho pipeline/Live/polish/quote; không claim reload khi active; unit PASS | Chưa E2E gây lỗi chunk giữa pipeline thật |
| R8-005 / supply chain | Job build Android có quyền phát hành | read cho apk, write riêng release main+signed, SHA pin; static PASS | Chưa thực thi Actions/SDK |
| AZ-009 / rò thông báo | coded500 được coi là lỗi công khai | thông báo5xx chung, log kind/status; trướcfail/sauPASS | Lỗi không status còn heuristic; chưa audit mọi callsite |
| R6-004 / RAM/nội dung | Range chưa kiểm đúng vị trí/kích thước trước đọc hết | streaming byte cap + Content-Range/total; test PASS | Chưa mọi MP4 thực tế/CDN thay đổi file |
| R3-004 / quyền thiết bị | Auth after-hook retry vẫn có thể thất bại | migration0046 trigger cùng transaction với password; fault SQL PASS; link pending hết hạn | Không production; deadlock tải thật chưa benchmark |

Bằng chứng trước/sau nằm trong `bang-chung/codex/*before*`, `*after*`. `legacy_repro.mjs` lấy hàm tại commit gốc để kiểm trước mà không sửa lại worktree. Một số before ban đầu chỉ lỗi môi trường nên dùng legacy-before thay thế. Không có before động cho mọi mục tái nghiệm thu; không tự tạo chứng cứ quá khứ.

## Cổng kiểm thử

| Cổng | Thực tế | Trạng thái |
|---|---|---|
| npm test (PostgreSQL fixture) |197+1388+21=1606 PASS, 7skip thiếu .grok/skills hoặc app-env trong repo sạch | PASS với skip đã nêu |
| npm run typecheck | exit0 | PASS |
| eslint src --quiet | exit0; không có nghĩa không warning | PASS |
| npm run build không DATABASE_URL | exit0, migration skipped | PASS |
| NITRO_PRESET=node-server + PG local | exit0,46migration, chạy lại không áp trùng | PASS |
| Local PG multi-connection money races |26test,4suite | PASS |
| 23 FIXED_CODE |test cụ thể ở TAI_NGHIEM_THU_23.md |22PASS fixture,1PARTIAL transport |
| Native browser module |IDB owner/abort/reload, edited segment, Audio cancel | PASS |
| Built app desktop/mobile | render, không overflow390px; không pageerror; ảnh dưới /workspace/screenshots | PASS local |
| Admin |Reset về sạch disabled khi không TYZO_TEST_RESET; cảnh báo lệnh rút không khớp | PASS local |
| POST /api/risk-sweep |cùng chữ ký/nonce:200 rồi401 | PASS local |
| Migration CLI |fresh/upgrade0045→0046 giữ fixture, idempotent, lỗi SQL rollback DDL + bookkeeping | PASS local |
| VPS restore function (docker shim, PG17.7) |dumpFKfail/cut bị từ chối giữ7dòng, dump tốt nạp3dòng | PASS local |
| Android device/SDK |không SDK, không điện thoại/emulator kết nối | BLOCKED |

Các test mới từng fail: R6008 fixture quá ngắn không kích check; sửa câu đủ12chữ, không bỏ assertion. Webhook fixture ban đầu UPDATE vào settings rỗng nên401; sửa INSERT fixture. Typecheck bắt thiếu context/lineLocks sai kiểu đã sửa. Migration có BEGIN dòng riêng bị luật repo chặn; chuyển BEGIN vào dollar-body cùng dòng theo quy tắc hiện có; thay DELETE link bằng UPDATE expires_at nên không phải tắt destructive gate. Restore shim đầu sai PATH và fixtureFK NOTVALID không tái hiện lỗi; đã sửa harness và tạo dump FK thực sự không hợp lệ trên cluster thử. Log kết quả cuối có assert rõ, không coi lần chạy lỗi là PASS.

## Quét và graph

- Gitleaks dir redacted:2phát hiện, đều fixture (`backend-audit.test.ts`: synthetic-fixture; `risk-rules.test.ts`: khóa-thử). Không thêm allowlist rộng. Exit1 được giữ; phân loại falsepositive trong SECURITY_REVIEW.json. Không coi raw scan sạch.
- Semgrep244rule/519file:86findings,2error phân tích/timeout; chưa rà tay toàn bộ86. Quét riêng23file sản phẩm thay đổi (kể cả untracked):1finding,0error; quét bổ sung3file cuối (recognize/version/admin-log):0finding,0error. Cảnh báo RegExp narration.ts dùng word chỉ từ literal allowlist male/man/boy/nam/tom/lee/alex, không đến từ người dùng; xác minh callsite. Không dùng kết quả để tuyên bố toàn repo an toàn.
- dependency-cruiser:703module/2707dependency,0error/10warning (vòng import và ranh giới tầng sẵn có), không auto-fix.
- Graphify0.9.119 code-only không gọi LLM:graph mới5754node/16784edge; báo3file có parseerror,89file không sinh symbol. Graph/provenance nằm trong gói kiểm toán. Không coi là data-flow toàn diện. Không dùng graph main cũ để kết luận nhánh này.
- Không gọi npm audit gửi dependency ra ngoài; không API/GPU trả phí, không key thật. Chromium block font/extension ngoài localhost nên không chứng nhận hai tài nguyên ngoài này. Console network error do chủ động block khác với pageerror; báo cáo chỉ chứng nhận không có uncaught pageerror.

## Còn mở và điều kiện tiếp tục

1. Android AZ002/003/004/008,R3006: cần SDK/emulator hoặc máy thử và fixture riêng.
2. R3008: kiểm ingress staging, header overwrite và ngăn truy cập origin; không thể suy ra từ unit.
3. R7001: corpus adversarial số/phủ định/tên và đánh giá người duyệt; heuristic có falsepositive nên giữ gốc.
4. R8004: E2E fault chunk khi pipeline/Live đang chạy; R3007 negative transport E2E từng endpoint.
5. 86Semgrep findings và10dependencywarning cần triage riêng; không mở rộng tự động thành đợt refactor mới.
6. Chưa tái kiểm toàn bộ80mục theo từng runtime/callsite; KET_QUA.json giữ kết quả lịch sử và thêm codex_continuation, không nâng đồng loạt VERIFIED. COVERAGE_TEP.json chỉ rõ từng tệp chưa kiểm riêng.
7. RE001–006 và các quyết định đã sửa ở các commit trước được kế thừa theo bàn giao cũ. Races/restore được chạy lại một phần không thay cho mọi ca crash/provider thật.
8. Không được deploy/migration production từ báo cáo này; cần review các mục trên và backup/staging khi Chủ yêu cầu phát hành.

## Commit và khác biệt so với chỉ thị

Đã lưu13commit nhóm sửa cục bộ trước commit hồ sơ; bảngSHA ở COMMITS_CODEX.md. Các hunk R5/R6/R8 cùng use-pipeline.ts được giữ trong một commit tích hợp để không chia sai dependency; test registration/package và phiên bản ở commit hồ sơ cuối. Vì vậy không phải mỗiID đều có một commit riêng. Không push/merge/deploy.

## Rollback và bàn giao

- Chưa merge/push/deploy nên rollback code bằng revert commit đã chọn sau khi lưu diff và thay đổi người dùng, không reset/clean checkout.
- Migration0046 chỉ thêm function/trigger; không tự drop khi rollback, vì sẽ mất bảo vệ thu hồi thiết bị. Forwardfix trên staging/production chỉ khi được yêu cầu. Không dùng downmigration xóa ledger.
- Không xóa database production. Fixture PG có thể dừng bằng pg_ctl trên đúng thư mục /workspace/tyzo-pg-test/data; hồ sơ không chứa data cluster.
- Bộ độc lập gồm chỉ thị gốc, base SHA, toàn bộ patch, file mới, kết quả80mục, matrix23, coverage từng tệp, log cuối, graph/provenance/checksum. Dữ liệu fixture/secret runtime/cookie không đóng gói.

# Bàn giao tiếp — ứng viên v5.49.2

**PARTIAL; chưa phát hành, chưa push, không gộp main.**

- Gốc do Chủ chỉ định: nhánh `ccr-9f1afcc8-iv7067`, commit `d5a2fed119456b1b33cbb7934763ec1b365ce355`.
- Worktree: `/workspace/TyZo-ccr-9f1afcc8-iv7067`. Không dùng checkout `/workspace/TyZo_Sub_Project` làm gốc; checkout đó giữ công việc tooling cũ.
- Chủ đã yêu cầu tiếp tục sau khi làm mới giới hạn. Bàn giao tạm dừng trước đây đã được thay bằng trạng thái này.
- Đọc `BAO_CAO.md`, `TAI_NGHIEM_THU_23.md`, `SECURITY_REVIEW.json`, `KET_QUA.json` và `COVERAGE_TEP.json` cùng thư mục trước khi làm tiếp. Chỉ thị gốc đã lưu tại `TyZo_v5.49.1_Claude_Handoff_Triet_De.md`; bàn giao phiên trước Codex ở `BAN_GIAO_TRUOC_PHIEN_CODEX.md`.

## Đã thực hiện

R3008 IP helper; R3009 usage dự phòng; R5008 bản lưu theo chủ; R6006 cleanup PUT; R7001 chặn polish đổi số/phủ định/tên; R7003 glossary retry hữu hạn; R7006 settle Audio khi stop; R8004 ngăn reload active; R8005 quyền workflow riêng. Tái nghiệm thu23mục bằng test cụ thể; thêm sửa coded500 lộ message, MP4range bounded, metadata abort, language-check cũ và trigger0046 thu hồi thiết bị cùng transaction mật khẩu.

Không được coi các mục PARTIAL là đã nghiệm thu production. Version5.49.2 chỉ là ứng viên. Giá/điều khoản/providers/Token không đổi; đoạn phụ đề sửa tay giữ trong test nativeIDB.

## Còn mở theo thứ tự

1. Android AZ002/003/004/008,R3006: cần SDK/emulator hoặc máy thử. Hiện BLOCKED.
2. IP: ingress staging thật phải ghi đè header tin cậy và cấm truy cập origin; chưa có bằng chứng runtime.
3. Polish: corpus đa ngôn ngữ adversarial; chưa chứng minh ngữ nghĩa mọi tên/số bằng chữ/phủ định.
4. E2E gây lỗi chunk khi pipeline/Live còn chạy; negative transport E2E từng polish endpoint. Module/registration test không thay thế hai việc này.
5. Triage86Semgrep findings/2analysiserror và10dependencywarning, xem phân loại trong báo cáo; chưa audit từng callsite toàn80mục. Không tự mở rộng refactor nghiệp vụ.
6. Review độc lập gói hồ sơ, rồi chỉ triển khai khi Chủ yêu cầu rõ. Migration0046 chưa chạy production. VPS/header/Neon thật/nhà cung cấp trả phí chưa kiểm.

## Cổng và bằng chứng

`bang-chung/codex/` giữ log/JSON cuối, fixture harness và scanner redacted. Xem `final-unit.json`, `final-typecheck.json`, `final-lint.json`, hai `final-build-*.json`, `app-browser-checks.json`, `migration-drill.json`, `restore-drill.json`. Full suite dùng PG thật local, không credentials production. Các test skipped là thiếu .grok trong kho sạch. Báo cáo giữ nguyên exit1 scanner có findings; không bịa PASS.

## Môi trường có thể tái dùng nếu cùng máy

- `node_modules` là symlink sang dependencies checkout cũ, cùng lockfile. Máy mới dùng npm ci theo lock, không nâng gói.
- PostgreSQL17.7 local user-owned `/workspace/tyzo-pg-test`, data riêng, bind127.0.0.1:55439. `tyzo_test` NOSUPERUSER/NOCREATEDB/NOCREATEROLE, DBtyzo_test. Mỗi helper test tự tạo/drop schema riêng.
- `TYZO_LOCAL_PG_TEST=1 python3 /workspace/tyzo-continuation-evidence/run.py <nhãn-mới> npm test` để lọc env và bật localPG.
- Schema app browser riêng `app_browser_5492`, chỉ dữ liệu giả; không sao chép cookies hay fixture key vào Git. Nativebrowser script chặn request ngoài localhost. Server Node fixture ở127.0.0.1:8081 nếu còn chạy.
- Khởi PG khi cần: `/workspace/tyzo-pg-test/bin/pg_ctl -D /workspace/tyzo-pg-test/data -l /workspace/tyzo-continuation-evidence/postgres-server.log -o '-h 127.0.0.1 -p 55439 -k /workspace/tyzo-pg-test' start`. Không initdb đè dữ liệu.
- Máy mới không bảo đảm có runtime này. Dùng scripts/harness đã bàn giao làm căn cứ; đọc trước URL/env/port, không chạy harness cũ hardcode vào hệ thống thật.

## Git và rollback

Xem `COMMITS_CODEX.md` để biết commit nhóm sửa trong phiên này. Không reset/clean hay gộp main. Revert commit cần chọn sau khi lưu thay đổi người dùng. Migration0046 chỉ thêm trigger/function; rollback code không tự drop trigger, không xóa ledger hoặc database thật. Gói kiểm toán ZIP chứa patch từ baseline, các file đổi, graph/provenance và bằng chứng; không thay thế việc push lên repository. Chưa được phép push/deploy trong nhiệm vụ này.

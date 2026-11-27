# RE3-007 (P1) — Chuyển/khôi phục dữ liệu phải đối soát trước khi báo thành công

## Nguyên nhân gốc
`chep_len_neon` (baseline tyzo.sh 763–790) và `nap_dump`/`chep_tu_neon` chỉ kiểm mã thoát và số bảng/ràng buộc/chỉ mục. Không so số dòng, nội dung, sequence, migration; không khóa ghi nguồn khi chép VPS → Neon; không phát hiện ghi phát sinh trên Neon khi chép Neon → VPS; mục 14 (đưa lên Vercel) chuyển nguồn mà không đối soát.

**Lỗi có sẵn phát hiện thêm**: Neon → VPS (`pg_dump -n public` có `CREATE SCHEMA public`) luôn hỏng khi nạp vào CSDL tạm mới ("schema public already exists", `--exit-on-error`). An toàn (không mất dữ liệu) nhưng đường chuyển này không dùng được.

## TRƯỚC (`re3-007-before-restore.log`: bộ test mới chạy với tyzo.sh baseline; PG16 thật, docker giả)
- Thiếu một dòng `room_ledger` sau nạp lên Neon → vẫn **"✔ Đã nạp lên Neon (51 bảng)"**.
- Ghi phát sinh trên VPS trong lúc chép → vẫn **"✔ Đã nạp lên Neon (51 bảng)"**.
- Neon → VPS: **`schema "public" already exists`** ở mọi lần chạy.
(Một số test trước-sửa hỏng vì hàm bảng kê chưa tồn tại; các dòng trên là kết luận chính.)

## Sửa (deploy/vps/tyzo.sh)
- `sql_bang_ke` / `bang_ke_vps` / `bang_ke_xa`: bảng kê mỗi bảng `số dòng + md5(các md5 dòng đã sắp)`, sequence, ràng buộc (+ chưa kiểm), migration; múi giờ/định dạng cố định. Chỉ in số và mã băm.
- `khop_bang_ke`: khớp tuyệt đối mới đạt; in tên mục lệch.
- `nap_dump <tệp> [bảng kê nguồn] [hàm đọc lại nguồn]`: so CSDL tạm với nguồn và nguồn đọc lại TRƯỚC khi đổi tên; so lại sau đổi tên, lệch thì trả CSDL cũ. Bỏ schema public trống của CSDL tạm chỉ khi tệp có mục `SCHEMA - public`.
- `chep_tu_neon`: bảng kê Neon trước khi đọc, đọc lại sau khi nạp → phát hiện ghi phát sinh; nhắc bật bảo trì Vercel.
- `chep_len_neon`: dừng web + cầu nối VPS (khóa ghi) trong lúc chép, bật lại sau; ba bảng kê (nguồn, đích, nguồn đọc lại) phải khớp.
- `khoa_va_doi_soat_chuyen` (mục 14): khi dữ liệu đang ở VPS, Chủ gõ `dong-y` → dừng web VPS, đối soát VPS ↔ Neon; lệch thì không chuyển và bật lại web; khớp thì giữ web VPS dừng (tránh ghi tách đôi). Đưa lên Vercel hỏng → bật lại web VPS (quay về nguồn cũ).

## SAU (`re3-007-after-restore-3.log`): 14/14
Bảng kê ổn định/nhạy một giá trị; VPS→Neon thành công + web bật lại; VPS→Neon với dump hỏng / thiếu dòng / ghi phát sinh → không báo thành công, nguồn giữ nguyên, web bật lại; Neon→VPS thành công, bản cũ giữ ở `tyzo_cu_*` khớp bảng kê cũ; Neon→VPS với thiếu dòng / ghi phát sinh / đổi tên hỏng / dump hỏng → dữ liệu VPS đang chạy không đổi; cổng mục 14 (lệch → không chuyển, bật web; khớp → giữ web dừng; không gõ dong-y → không chuyển); 3 test RE2-005 cũ (cập nhật bộ giả có bảng kê) đạt.

## Giới hạn
- Docker giả + PG16 cục bộ thay cho Docker thật/postgres:17/Neon thật; chưa chạy trên VPS 1 GB (không được dùng để thử). Băm toàn bảng tốn CPU/RAM tỉ lệ số dòng (mỗi dòng 32 byte trong chuỗi gộp) — với CSDL lớn cần đo thời gian trên staging.
- Chưa có CDC catch-up: thiết kế là khóa ghi + so sánh; có ghi mới thì từ chối, không đuổi theo.
- Khôi phục từ tệp sao lưu (`khoi_phuc`) không có bảng kê nguồn để so (tệp không kèm); vẫn dùng kiểm cấu trúc như cũ.
- Trạng thái: **PASS fixture PG thật; PARTIAL (Docker/Neon/VPS thật)**.

## Rollback
Revert checkpoint 5 (chỉ tyzo.sh + test). Không có migration. Trên VPS: `tyzo` → 2 lấy bản mới/cũ như thường lệ.

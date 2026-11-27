# RE4-006 · PASS (provenance)

Graph được dựng từ mã chốt `4c6e6ad` (xem `provenance.json`), cây `provenance.json → sourceTree`. Cách làm: `git archive 4c6e6ad`, giải nén vào thư mục sạch rồi chạy `graphify update . --force`. Bản graphify 0.9.119 chỉ đọc AST, không gọi AI (0 token). Số nút, cạnh, cụm ghi trong `provenance.json`. SHA-256 của `graph.json`, `GRAPH_REPORT.md` và `manifest.json` nằm trong `provenance.json`.

Graph không tự ghi SHA của commit chứa nó: commit tài liệu nằm sau mã nguồn, còn `sourceCommit` là mã đã chốt.

## Parser và tệp không biểu diễn

- 57 tệp `.sql` (migration) không có trong graph vì thiếu `tree_sitter_sql`. Không cài thêm, vì `cong-cu.sh` ghim graphify 0.9.119 không kèm phần SQL.
- 3 tệp lỗi cú pháp, chỉ trích được một phần:
  - `MainActivity.kt` dòng 36, vẫn trích được 10 ký hiệu;
  - `pay-confirm.test.ts` dòng 26, 0 ký hiệu;
  - `usage-tally.test.ts` dòng 40, 0 ký hiệu.
  Cả ba đều dựng và chạy được (tsc PASS; test PASS trong `npm test`), nên đây là giới hạn của bộ phân tích.
- 92 tệp mã không cho ký hiệu: cấu hình, gradle, script bằng chứng. Mỗi tệp vẫn có nút tệp.
- 132 tệp không được phân loại: `.log` 83, `.srt` 14, `.xml` 11, còn lại là dữ liệu.

Sau khi dựng chỉ sửa đường dẫn thư mục quét ở dòng 1 của `GRAPH_REPORT.md` và trường `scan_root` của `.graphify_build_state.json`. `graph.json` giữ nguyên.

## Giới hạn

Graph là bản đồ cấu trúc để tra phạm vi ảnh hưởng, không phải bằng chứng logic đã kiểm toán. Không có SQL. Khoảng 4% cạnh là INFERRED. Mỗi lần mã đổi phải dựng lại từ commit mã mới và cập nhật `provenance.json`.

Rollback: khôi phục `graphify-out/` của commit trước. Không ảnh hưởng runtime.

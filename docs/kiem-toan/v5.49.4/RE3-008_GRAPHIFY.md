# RE3-008 (P2) — Graphify khớp nguồn

- Trước: `graphify-out/GRAPH_REPORT.md` ghi «Built from commit `90cb5a53`», 937 tệp, 6170 nút — cũ hơn Android/ingress/R07–R09 và mọi sửa của đợt này.
- Sau: `graphify update . --force` (chỉ trích AST, **0 token**, không gọi LLM, không gắn nhãn cộng đồng bằng AI; `--no-label` không có ở lệnh update nên lần đầu thất bại — giữ log `re3-008-graphify-update.log`). Log: `re3-008-graphify-update-2.log`.
- Provenance: dựng từ commit **`c5c39c7a`** (HEAD lúc dựng, cây sạch); 1132 tệp · 6762 nút · 18933 cạnh · 248 cộng đồng; 96% EXTRACTED / 4% INFERRED / 0% AMBIGUOUS.
- sha256 `graph.json` = `fd18fd1943df3fa83a1cecc05d0d29cf9af51efed27d07faa86e8bce1ee757b8`; `GRAPH_REPORT.md` = `4a30b698db8f1aef096b31fe1bf60c2f099f0a7a773ab91cdd3653d6c287acae`.
- Kiểm: `graphify explain settleLiveUsageWith` trả nút ở `src/lib/live/live-settle.ts L80`; có `audio-probe.ts`, `work-lease.ts`, `admission-bench.ts`, `re3-restore-pg.test.mjs`.
- Tệp không có ký hiệu (không biểu diễn): 161 — .log 116 (log bằng chứng), .srt 14, .xml 11…; **migration .sql không được Graphify phân tích** (dùng `git grep`/đọc tay cho schema). Không sửa graph bằng tay; không tải mã lên đâu.
- Commit sau lần dựng chỉ thêm tài liệu/graph; mã sản phẩm không đổi kể từ `c5c39c7` cho tới khi có ghi chú khác trong TIEN_DO.md.
- Trạng thái: **PASS**.

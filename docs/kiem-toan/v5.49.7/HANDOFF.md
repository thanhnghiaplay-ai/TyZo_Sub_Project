# Checkpoint RE6-001 · Medium

Nhánh `audit/v5.49.7-codex-re6`. Checkpoint trước đã xác minh trên GitHub ở `56a2d40544f7e1c2750b4ef2dc2ddf43ca823f91`. SHA của checkpoint này lấy từ commit chứa tài liệu và kiểm lại bằng `git ls-remote origin refs/heads/audit/v5.49.7-codex-re6`.

## Đã sửa và kiểm chứng

- `src/lib/billing/run-gate.ts` từng dùng `Number(...)` cho hai trường usage. Ba ca phản hồi giả có null, boolean và chuỗi số đều trừ 4 Token trước bản sửa. Nay chỉ chấp nhận số nguyên an toàn không âm, gồm cả số 0. Dữ liệu sai kiểu đi vào nhánh đối soát và trừ 0.
- Chạy trên cụm loopback PostgreSQL 18.7, dùng schema thử ngay từ các migration của nhánh. Các bộ test hỗ trợ PG thật dùng cụm này, các bộ chỉ hỗ trợ PGLite giữ cấu hình sẵn có. Lệnh `node --experimental-strip-types --experimental-test-module-mocks --import ./scripts/register-ts.mjs --test --test-concurrency=1 src/lib/billing/{gate-reserve,run-gate,upstream-outcome,async-asr}.test.ts` đạt 57, lỗi 0, bỏ qua 0.
- Chạy thêm phép đo chẩn đoán trên PG18.7 với 100 phản hồi thành công giả thiếu usage. Một phiếu giữ 100 Token nhận đủ 100 kết quả, trừ 0, phần giữ theo lệnh về 0 và còn 100 dòng chờ đối soát, tổng ước tính 1.100 Token. Đây là bằng chứng còn thiếu giới hạn nghĩa vụ, chưa đạt tiêu chí nghiệm thu.
- RE6-006 giữ kết quả checkpoint cũ. Ca kiểm migration đầy đủ và restore không chạy lại.

## Còn lại ở mức High

- Tách số ước tính và chứng từ sử dụng đã xác minh. Soát dữ liệu cũ, vòng đời phiếu đóng, lệnh hết lease và luồng tổng hợp chi phí. Hiện `settleGateCall` dùng giao dịch và khóa phiếu trước khóa lệnh, giữ `observed_at` để chặn replay. Hàng chờ đối soát trong `run_gate_calls` phụ thuộc vào phiếu qua FK và Admin hiện chỉ thấy số tổng hợp.
- Hoàn thiện ghi nhận nghĩa vụ bền vững và giới hạn rủi ro nguyên tử qua nhiều phiếu. Kiểm trên PG18.7 với nhiều kết nối, replay, rollback hoặc gián đoạn và đóng phiếu đồng thời. Thiết kế giao dịch giữ thứ tự khóa nhất quán với cổng hiện tại.
- Thêm danh sách và thao tác đối soát Admin có kiểm quyền phía máy chủ, căn cứ kiểm chứng và nhật ký ghi cùng giao dịch. Kiểm retry và thao tác đồng thời trên cùng nghĩa vụ. Phần áp dụng ngưỡng hoặc thu hồi từ khách cần chính sách được Chủ duyệt trước khi bật. Không lấy ước tính làm số trừ khách.

# Phiếu phát hành 5.49.4

- Phê duyệt: 20:42 27/11/2026 (giờ Việt Nam), Chủ nói «Đẩy chính thức».
- Gốc main/work trước phát hành: 6d906ba07f12e4f6938c3f493fe29f08472313f3. Đưa main và work tiến thẳng (fast-forward) tới nhánh ccr-20605d15-2nil6k; không force push, không xóa nhánh.
- Commit phát hành (APP_VERSION 5.49.4, CHANGELOG, ADMIN_LOG): 9d99433. Mã ứng dụng ngoài số phiên bản và chữ thay đổi giống 198dd4b (soak-3600-2 PASS).
- Cổng chạy lại trên commit phát hành: typecheck 0; lint 0 lỗi; test 210+1439+87 đạt, 7 bỏ qua, 1 lỗi môi trường root (R8-002); check:auth đạt; build mặc định + Node đạt. Log: bang-chung/release-*.log. Lượt test đầu (release-test-group*.log, không hậu tố) hỏng hàng loạt vì Postgres thử bị tắt từ bên ngoài giữa chừng (ECONNREFUSED); giữ nguyên làm bằng chứng, chạy lại sau khi bật Postgres: *-pg-restarted.log.
- Migration chạy khi Vercel build: 0053 (biên nhận live), 0054 (nhân cửa nhận việc, cột ref), 0055 (hàng đợi công bằng). Chỉ thêm bảng/cột/chỉ mục/hàm; không lệnh xóa; đã diễn tập cài mới, nâng cấp giữ dữ liệu, lỗi giữa tệp rollback.
- VPS: cầu nối Dịch trực tiếp đổi (quyết toán nguyên tử) → trên VPS chạy `tyzo` → mục 2 (Cập nhật). Web chế độ đầy đủ trên VPS cũng cập nhật bằng mục 2. tyzo.sh mới có đối soát bảng kê khi chuyển dữ liệu.
- Android: không đổi (0.12).
- Không kiểm chứng trong phiên: trạng thái deploy Vercel/runtime production, nhà cung cấp thật, VPS. Kiểm Vercel → Deployments đúng SHA trên main.

## Rollback
Đưa web về 6d906ba (Vercel → Deployments → Promote bản trước, hoặc revert). Không drop bảng/hàm mới (mã cũ bỏ qua; riêng tyzo_admit mã cũ không gọi). Trước khi quay lại: drain, đối soát admission unknown và biên nhận live có shortfall. Mã cũ đếm cap nhà/model theo lane như trước.

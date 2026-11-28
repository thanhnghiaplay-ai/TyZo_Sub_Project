# CHANGELOG
- Thiết lập thư mục quản lý TYZO-STABILITY (chưa sửa mã nguồn).
- fix(TZ-002): nhả suất Modal chưa gửi GPU, đối soát ngay khi gặp 409 uncertain, gắn ref có rào lease (src/lib/billing/work-admission.ts, tyzo-modal-charge.ts, test tyzo-modal-race).
- test(TZ-004): thêm test nhánh lỗi HTTP Modal (src/lib/sub/re8-010.test.ts), không đổi mã.
- test(TZ-005): thêm test bất biến tài chính chạy song song (tyzo-modal-race.test.ts), không đổi mã.
- fix(TZ-006): khôi phục bản lưu khi đổi ngôn ngữ đích sẽ dịch lại (src/lib/saved-runs.ts, src/components/use-pipeline.ts).
- TZ-009: update-banner.tsx + stale-build.ts: nút Tải lại hỏi xác nhận khi đang có việc chạy (B-08); test trong stale-build.test.ts.
- fix(TZ-008): nút bắt đầu báo «Đang chuẩn bị…» và khóa trong lúc chuẩn bị (use-pipeline.ts, studio.tsx); test src/components/start-gate.test.ts.
- docs: TZ-010 chạy semgrep, dependency-cruiser; rà tĩnh quyền endpoint GPU (B-12). Không đổi mã.
- fix(TZ-002/B-14): lane batch gắn ref chỉ khi suất còn running và dừng trước khi gửi nếu mất; sweep nhả suất batch unknown không ref; test batch-admission.test.ts.

# CHANGELOG
- Thiết lập thư mục quản lý TYZO-STABILITY (chưa sửa mã nguồn).
- fix(TZ-002): nhả suất Modal chưa gửi GPU, đối soát ngay khi gặp 409 uncertain, gắn ref có rào lease (src/lib/billing/work-admission.ts, tyzo-modal-charge.ts, test tyzo-modal-race).
- test(TZ-004): thêm test nhánh lỗi HTTP Modal (src/lib/sub/re8-010.test.ts), không đổi mã.
- test(TZ-005): thêm test bất biến tài chính chạy song song (tyzo-modal-race.test.ts), không đổi mã.
- fix(TZ-006): khôi phục bản lưu khi đổi ngôn ngữ đích sẽ dịch lại (src/lib/saved-runs.ts, src/components/use-pipeline.ts).

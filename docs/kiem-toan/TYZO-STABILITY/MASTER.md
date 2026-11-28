# MASTER — TYZO-STABILITY (kiểm toán và sửa lỗi nhiều phiên)
Repo: thanhnghiaplay-ai/TyZo_Sub_Project. Web: https://sub.tyzo.site. Nhánh làm việc: `fix/tyzo-stability` (không làm trên main).
Nguồn tiến độ chính thức: GitHub, thư mục này. Báo cáo bằng tiếng Việt.

## Sự cố gốc
TyZo v5.49.7, Android, MP4 135 MB / 178 s, Nhật→Việt, trả theo lượt, ASR TyZo Modal, dịch Groq. Cắt 6 đoạn, dừng 5%, nhận dạng 0/6, có nút Tiếp tục, thông báo cập nhật, không phụ đề, số dư 228.530→236.764 token. Thông báo: "Có công việc đang gửi hoặc cần đối soát...". Báo cáo trước: docs/kiem-toan/v5.49.7/TYZO-MODAL-409/BAO_CAO.md.

## Quy tắc cứng
- Sửa mã trực tiếp, sửa tối thiểu nhưng triệt để, tìm nguyên nhân gốc trước. Không làm lại việc đã kiểm chứng.
- Mọi thay đổi có test; không giả lập kết quả, không xóa/làm yếu test.
- Không đưa secret vào mã, log, tài liệu, chat. Không deploy, không sửa dữ liệu/ví production, không dùng DATABASE_URL production, không gọi GPU/API tính phí khi chưa cho phép.
- Không đổi chính sách giá, công thức token, kiến trúc lớn. Không xóa migration đã triển khai. Không force push.
- Mỗi lần push tính một lượt dựng Vercel (giới hạn 100/ngày): gom commit, push một lần. Build gọi db:migrate; preview chỉ migrate khi TYZO_PREVIEW_DB=rieng (scripts/migration-gate.mjs).
- Không giải phóng admission chưa rõ kết quả; không phát lại POST khi upstream có thể đã nhận.

## Trạng thái hợp lệ
TODO, IN_PROGRESS, ALREADY_FIXED, PATCHED_NOT_TESTED, PASS_LOCAL, PASS_CI, PASS_PRODUCTION, FAIL, BLOCKED, NOT_REPRODUCED. Không dùng "PASS" chung.

## Quy trình mỗi nhiệm vụ
IN_PROGRESS → tái hiện → ghi nguyên nhân gốc → test hồi quy → sửa → test mục tiêu → xem diff → commit → cập nhật CHECKPOINT.

## Nhiệm vụ
Danh sách đầy đủ, ưu tiên và điều kiện nghiệm thu: TASKS.md. Tiêu chí nghiệm nhận cuối: 6/6 đoạn, không trùng GPU/phụ đề/token, không treo khi thiếu suất, tiếp tục đúng đoạn thiếu, giao diện đúng, không hồi quy. PASS_LOCAL/PASS_CI không thay PASS_PRODUCTION.

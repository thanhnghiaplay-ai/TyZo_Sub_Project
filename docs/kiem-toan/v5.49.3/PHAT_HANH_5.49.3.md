# Phiếu phát hành5.49.3

- Phê duyệt: 17:07 27/11/2026, Chủ yêu cầu «Đẩy chính thức», sau đó chỉ thị «bạn cứ đẩy, do web hiện tại chưa phát hành chính thức, đang trong giai đoạn phát triển». Không coi đây là xác nhận backup đã được công cụ kiểm chứng.
- Gốc main/work trước phát hành:552eab1f9122cdc04bee11c242a2d5eadf607dd7. Mã ứng dụng kiểm thử:21d55c48be86ba479c63370c8243a4b9cf3e90b4; fingerprint2d036c766f5491156577c45cccc7d52f0af33b9eae780e8705698646420a31b3. Commit chuẩn bị phát hành sau đó chỉ sửa tài liệu/bằng chứng, không đổi mã ứng dụng.
- Đưa main/work tiến thẳng từ nhánh fix/v5.49.2-re2; không force push, không merge main ngược vào nhánh sửa, không xóa nhánh. PR#5: https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/pull/5.
- Cổng phát hành chạy lại trên đúng fingerprint: full suite, typecheck/lint, build mặc định+Node; bằng chứng trong bang-chung/phat-hanh-20261127/. Chỉ chuyển ref khi các cổng đạt. Migration0046→0052, chạy lại và cố tình lỗi0053 đều giữ dữ liệu tổng hợp; lỗi0053 phải exit1 và rollback đúng.
- Migration0047–0052 qua cơ chế deploy sẵn có; chỉ thêm schema/chỉ mục và mở rộng base_vnd sang numeric. Không đặt cờ bỏ destructive gate, không xóa ledger, không tự sửa/hoàn khoản lịch sử. Giữ numeric/journal khi rollback ứng dụng.
- Android0.12 theo workflow main có khóa ký sẵn; không đọc/xuất secret. Kết quả build/release phải kiểm riêng, không suy ra từ git push.
- Vercel phải kiểm status đúng SHA được đưa lên main. Git push thành công không chứng minh runtime/nhà cung cấp hoạt động. Không đăng nhập/chi tiêu provider hoặc load test production trong phiên này.
- VPS/cầu nối chưa được cập nhật qua SSH trong phiên; cần triển khai cùng phiên bản trước khi đánh giá usage live trên VPS. Không tự thuê GPU.

## Phạm vi chất lượng còn mở

Chủ duyệt phát hành trong giai đoạn phát triển; không đổi kết quả audit PARTIAL. Chưa đủ soak60phút, chưa chứng nhận100–200khách hoặc300phiên thực, Graphify còn cũ, triage scanner/đối chiếu80mục chưa xong, Android chưa máy thật, corpus/ingress/provider/GPU thật và backup khách ẩn danh chưa kiểm chứng. Phiếu bàn giao trước vẫn là lịch sử bằng chứng, không phải lệnh cấm phát hành sau khi Chủ đã cho phép.

## Rollback

Mốc mã trước phát hành552eab1; ngừng nhận mới/drain và đối soát unknown/pending trước đổi phiên bản. Không drop bảng/cột, không ép numeric về bigint, không reset sổ. Ứng dụng cũ không cộng journal pending vào báo cáo; ưu tiên forward-fix nếu còn pending hoặc receipt chưa đối soát. Việc sửa dữ liệu lịch sử cần chứng cứ và quyết định riêng của Chủ.

Kết quả local thực tế: 1680 pass, 0 fail, 7 skip; typecheck/lint/auth/build mặc định+Node đều exit0 trên fingerprint nêu trên.

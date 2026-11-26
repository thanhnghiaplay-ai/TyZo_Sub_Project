# Phiếu phát hành5.49.2

- Thời điểm Chủ duyệt: 05:33 27/11/2026 (giờ Việt Nam).
- Lệnh: «Đẩy chính thức». Chủ xác nhận «Đã có bản sao lưu/điểm khôi phục». Đây là xác nhận của Chủ, không phải công cụ đã đọc/xác minh backup Neon/VPS.
- Gốc production trước phát hành: `93bee64682593867dbd00e0312522a11918261e6`.
- Ứng viên kiểm thử: `1c118fb05b991fa3ccac46671cd3c65b26cf171e`, nhánh `ccr-9f1afcc8-iv7067`. Chỉ chỉnh mốc thời gian và hồ sơ phát hành sau commit này, không đổi logic.
- Đã đẩy ứng viên lên nhánh nguồn và work. Main được phép tiến thẳng đến commit phát hành; không merge main vào nhánh nguồn, không force push, không xóa nhánh.
- Cổng:1606testđạt/7skip, typecheck/lint và hai buildđạt. Xem `bang-chung/codex/`. Kiểm lại phiên bản/typecheck/build sau chỉnh nhãn thời gian.
- Migration0040–0046 chạy qua cơ chế deploy sẵn có; giữ preview/destructive gate, không cấp owner mới, không chạy thủ công trên production từ phiên này.
- Không có credentialVercel/Neon/SSH VPS trong phiên. Theo dõi trạng thái deploy qua GitHub commit checks/statuses. Chưa được ghi runtime thành công trước khi có kết quả từ Vercel.
- Đẩy chính thức chỉ là quyết định phát hành, không phải xác nhận mọi mục kiểm toán đã đóng: Android, ingress thật, corpuspolish, E2E active-chunk/auth và scannertriage vẫn theo BAO_CAO.md.
- **VPS cần cập nhật đồng bộ:** bản này kế thừa chữ ký quét đêm v2; web và VPS khác bản có thể401. Chủ chạy `tyzo` →2 trên VPS hoặc cấp kết nối quản trị phù hợp; phiên này chưa có quyền SSH và chưa cập nhật VPS. HeaderIP theoEDGE cũng chỉ có hiệu lực khi cập nhật webVPS.
- Rollback: bản triển khai trước tương ứng93bee64; coderollback không tự droptrigger0046 hoặc xóa ledger. Chỉ thao tác khi lỗi thực tế và đã xác định an toàn đối với migration bổ sung.

## Kết quả đã quan sát sau phát hành

- Cả main/work/nhánh nguồn đã tiến thẳng lên `a864bb2385b36bc43f3bf2b1d3a5621e42c4a446`.
- Vercel báo `success` / `Deployment has completed` cho SHA này: https://vercel.com/ty-zo/tyzo-sub/61tpfFY11ZYjVppp1g7PNpKgXg4D . Không dùng tài khoản khách để thử production.
- GitHub Actions trên main, run45905657250: jobapk SUCCESS và jobrelease SUCCESS. Tệp tyzo-sub.apk/tyzo-sub.json đã cập nhật ở releaseandroid-v0.11. Không nâng phiên bản Android vì không đổi mã ứng dụng Android; chưa kiểm trên điện thoại thật.
- Bằng chứng cấu trúc: KET_QUA_PHAT_HANH.json; log trạng thái: bang-chung/codex/release-deployment.json.
- VPS vẫn BLOCKED, cần `tyzo` →2 để đồng bộ cầu nối/chữ ký quét đêm. Không tuyên bố VPS đã triển khai.
- Commit ghi nhận kết quả này chỉ sửa tài liệu; nguồn ứng dụng giữ nguyên so với SHA đã triển khai nêu trên.

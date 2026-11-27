# R04 — Dòng model Groq bất thường chặn luồng xử lý

Ưu tiên P1; phát hiện trong rà soát Semgrep detect-redos. Không thay giá hoặc model mặc định.

Nguyên nhân: lookahead cột giá nằm trong regex nhận ID; chuỗi ID rất dài nhưng không có cột hợp lệ khiến matcher thử lại nhiều hậu tố, chi phí bậc hai. Đo tại 1000/2000/4000/8000 đoạn: khoảng 4,73/22,15/111,59/446,99 ms.

Sửa: tiêu thụ từng ID candidate một lần rồi kiểm tra điều kiện cột theo sau riêng. Logic parse các cột giá và quy đổi tiền được giữ nguyên.

Trước/sau có giới hạn tiến trình độc lập: `resume-regex-actual-before-after.json`, 100.000 đoạn sai định dạng. Bản trước vượt 5,0185 giây và bị timeout; bản sau exit 0 trong khoảng 0,1105 giây. `resume-regex-after-network` qua test cũ ba hàng giá và regression 100.000 đoạn trong tiến trình con có deadline 5 giây. `resume-regex-after` không có quyền mạng bị sandbox chặn việc tạo tiến trình test, không dùng làm kết luận sản phẩm.

Ảnh hưởng: tải bảng giá Groq từ upstream; không đổi giá cấu hình, Token hay quyền khách. Semgrep không còn báo regex này trong lần quét frozen; regex tiếng đệm khác vẫn được liệt kê và phân tích riêng.

Rollback: revert commit R04; không có schema hoặc dữ liệu cần đổi. Revert sẽ khôi phục nguy cơ chặn luồng xử lý khi upstream trả chuỗi bất thường.

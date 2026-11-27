# RE6-002 · Khóa nguồn, sao lưu và khôi phục

Baseline `017cad371595f641d681da7f79eeeb62d617b40b`. PostgreSQL 18.7 trên loopback với dữ liệu giả. API Neon, Docker Compose và các lỗi truyền dữ liệu được giả lập. Hai database PostgreSQL thử được dùng cho bảng kê và nạp dump thật.

## Thay đổi

- Neon → VPS bắt buộc xác định branch và duy nhất một compute ghi. Cổng đọc dùng endpoint chỉ đọc cùng branch. Neon API phải trả đúng ID, `disabled=true`, trạng thái `idle` và không có chuyển trạng thái đang chờ. Mất mạng hoặc lệnh SQL lỗi không còn được diễn giải là đã khóa. Kiểm trạng thái lại trước và sau đổi CSDL.
- Sau khi nạp và đối soát, ngăn kết nối mới vào CSDL tạm. Đổi tên CSDL cũ và mới trong một giao dịch với cả hai bị khóa. Chỉ mở đích sau mốc đã ghi bền và đã kiểm lại nguồn. CSDL cũ vẫn còn và khóa kết nối. Bước này chỉ nghiệm thu dữ liệu, còn dịch vụ và DNS phải kiểm riêng.
- VPS → Neon giữ riêng bước chép bản sao và bước chuyển nguồn. Trước khi dừng dịch vụ để khóa VPS, ghi bộ dịch vụ đang chạy. Cổng cuối chặn phiên mới, kiểm phiên còn lại, giao dịch chuẩn bị và bảng kê đích. Khi phục hồi trước bước triển khai, chỉ đóng nhật ký sau khi xác minh lại CSDL và dịch vụ.
- Sao lưu thường dùng tệp tạm riêng, kiểm mục lục, đồng bộ và đổi tên mới công bố bản sao. Nạp lỗi không tiếp tục bật dịch vụ để báo thành công. Bản dump và định dạng gói VPS cũ tiếp tục đọc được.

## Phục hồi khi gián đoạn

| Mốc cuối | Xử lý |
| --- | --- |
| `neon-ro-intent` hoặc `neon-ro` | Kiểm endpoint tạm cùng branch và xác nhận writer chưa bị thay đổi. Chưa có bước nạp đích. |
| `neon-khoa` | Có thể hủy bằng menu 7 với đúng endpoint và đúng bằng chứng, vì chưa có intent đổi tên. |
| `neon-swap-intent`, `neon-swap-xong`, `neon-dich-co-the-ghi` | Giữ Neon khóa. Xem tên CSDL, bản cũ và bảng kê đích trong hồ sơ riêng được ghi ở intent. Xác định giao dịch đã commit hay chưa và bên nào đã ghi trước mọi quyết định mở lại. Menu 7 từ chối mở nguồn. |
| `vps-dung`, `khoa-nguon` hoặc `vps-ban-sao` | Menu 9 chỉ cho phục hồi các mốc trước triển khai có bộ dịch vụ nguồn hợp lệ. |
| `vercel-bat-dau` hoặc mốc Vercel chưa rõ | Giữ VPS khóa, đối soát deployment và thay đổi trên Neon. Việc đổi lại DNS không đồng bộ dữ liệu ghi mới. |

Mốc cũ thiếu định danh branch hoặc bộ dịch vụ được giữ để tra cứu. Với nhật ký cũ hoặc kết quả không xác định, cần đối soát thủ công trước khi quay nguồn. Mọi phép thử dùng fixture. Chưa nghiệm thu Neon, VPS, DNS hay Vercel thật.

[Neon API cập nhật compute](https://neon.com/docs/reference/api/endpoints/update-project-endpoint) · [Neon API liệt kê compute của branch](https://neon.com/docs/reference/api/branches/list-project-branch-endpoints)

## Kiểm thử trước và sau

- Trước sửa, fixture mất kết nối được báo là khóa thành công. Xem [before.txt](before.txt).
- Bộ hồi quy khôi phục trên PG18.7 đạt 33/33 ca. Lượt chọn trên mã checkpoint đạt 8/8, gồm sai trạng thái API, timeout, nhiều writer, SIGKILL sau commit, lỗi nhật ký và lỗi sao lưu. Xem [test-summary.txt](test-summary.txt).
- Lệnh chính là `node --test scripts/re3-restore-pg.test.mjs scripts/re2-restore.test.mjs` với `TYZO_TEST_PG_URL` và PostgreSQL CLI trỏ vào cụm thử. Lượt cuối thêm `--test-name-pattern='RE6-002|RE2-005'`.

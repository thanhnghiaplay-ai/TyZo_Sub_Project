# RE5-006 · Rollback và tương thích 0056/0057 (tài liệu)

- **0057 chỉ `create or replace function tyzo_admit`.** Không thêm, xóa hay sửa bảng; chữ ký giữ nguyên. Mã app cũ (5.49.5) và mới gọi hàm theo cùng một cách.
- **Rollback app không rollback SQL.** Quay main/app về `39510cc` (hoặc cũ hơn) thì CSDL vẫn dùng hàm 0057. Điều này an toàn: app cũ gọi đúng chữ ký, kết quả trả về cùng dạng (`<id>`, `busy`, `busy:N`, `uncertain`, `disabled`). Hành vi khác duy nhất là khách chờ khác model hoặc khác nhà được nhường chỗ.
- **Muốn quay về hành vi 0056:** viết migration tiến tới 0058 nạp lại nguyên thân hàm 0056 (sao từ `migrations/0056_admission_lane_fairness.sql`). Không sửa, không xóa 0057 trong `_migrations`.
- **Đã diễn tập** (`RE5-003/migration-drill.log`): cài mới; nâng 0055/0056 lên 0057 khi đang có lượt chạy và khách chờ; chạy lặp; lỗi giữa chừng thì rollback về hàm 0056 (còn 56 migration).
- **Khi có traffic:** `create or replace` lấy khóa trên hàm trong giao dịch migrate. Lời gọi `tyzo_admit` đang chạy dùng bản cũ cho tới khi xong; lời gọi sau dùng bản mới. Bảng `work_waiters` và `work_admissions` giữ nguyên nên không mất hàng chờ.
- **Thay đổi khác cùng nhánh** (không có migration):
  - RE5-001: route model;
  - RE5-002: quyết toán khi thiếu usage;
  - RE5-004: `tyzo.sh` (thêm tệp `${CONF}.chuyen`, có thể xóa an toàn khi không có lần chuyển nào dở dang);
  - MAIN-040: tách hàm.

  Mỗi mục là một commit riêng, revert theo thứ tự ngược.

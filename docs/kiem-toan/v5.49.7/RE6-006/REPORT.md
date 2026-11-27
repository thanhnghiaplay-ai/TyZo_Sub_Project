# RE6-006 · Tương thích PostgreSQL 18

Baseline `ea38bcd448d0a728c42dc1e18d40b721f2a09e04`. Chạy bằng Node 24.22.3 và hai cụm Docker cục bộ chỉ lắng nghe trên loopback. Tất cả dữ liệu là fixture tổng hợp. Khôi phục dùng CLI cùng phiên bản với máy đích. Các test hồi quy chuyển nguồn dùng Docker và Neon API giả, với các lệnh SQL thực chạy trên cụm thử.

| Image | Phiên bản | Digest |
|---|---|---|
| `postgres:18-bookworm` | 18.7 | `sha256:e742a2668255221388004f3a42b6150a2103f5054ab3a4a93ae9e4f01e551c35` |
| `postgres:17-bookworm` | 17.12 | `sha256:1eff563f6c868b9b433566e9f3cf6e5c79fbd3b95bf70ec7277d376cdbfc50d7` |

## Migration

`node --test scripts/re6-migrations-pg.test.mjs` chạy trình `scripts/migrate.mjs` với `TYZO_TEST_PG_URL` trỏ vào cụm PG18 thử. Test tạo hai database riêng và dọn sau khi chạy.

- Cài mới đủ 58 migration rồi chạy lại, xác minh sổ `_migrations`.
- Nâng từ 0056 với lượt đang chạy, hàng đợi, phiếu và chứng từ Modal giả. Xác minh dữ liệu cũ giữ nguyên, cột `provider_usd` của chứng từ cũ là NULL, định nghĩa `tyzo_admit` giống bản cài mới.
- Chèn lỗi chia cho 0 sau phần SQL của từng migration 0057 và 0058 trong bản sao tạm. Xác minh thay đổi hàm/cột và mục ghi migration được rollback, sau đó nạp bản gốc và chạy lại thành công.

## Khôi phục

- Tạo CSDL nguồn bằng trình migration, thêm dữ liệu tài khoản, ledger, phiếu và chi phí Modal giả.
- Dùng `pg_dump -Fc` cho nguồn 17 và thêm `-n public` cho nguồn 18 theo đường chép từ Neon. Dùng `pg_restore -l` của máy đích để đọc TOC. Nếu TOC chứa lệnh tạo schema `public`, bỏ schema mặc định của database thử còn trống trước khi nạp, như `nap_dump`.
- Khôi phục với `--exit-on-error --single-transaction --no-owner --no-privileges`. Đối chiếu bằng `sql_bang_ke` của TyZo. Cả ba cặp 17 → 18, 18 → 17 và 18 → 18 khớp bảng kê nguồn, với 52 bảng mỗi bản. Xem [restore-matrix.txt](restore-matrix.txt).
- 18 → 17 chỉ được xác nhận cho schema TyZo hiện tại và các phiên bản thử nêu trên.

## Phạm vi

Xác minh trên PostgreSQL chuẩn và fixture cục bộ. Cutover có Neon/VPS thật nằm ngoài lần bảo trì này. Không truy cập production, dùng thông tin xác thực thật hoặc gọi dịch vụ trả phí.

## Cổng kiểm tra

- `npm run typecheck` hoàn tất. `npm run lint` có 0 lỗi, 24 cảnh báo như baseline.
- Chạy riêng 49 ca PG18 về admission, work lease, giữ và quyết toán chi phí Modal. 49 đạt, 0 lỗi.
- Ba nhóm của `npm test` đạt tổng cộng **1.804**, **0 lỗi**, **7 bỏ qua** do thiếu tài nguyên `.grok/` trong checkout sạch. Hai nhóm đầu chạy bằng `npm test`. Nhóm cuối chạy lại nguyên lệnh trong `package.json` sau khi sửa bài heartbeat. Xem [test-summary.txt](test-summary.txt).
- Bài heartbeat từng lỗi vì yêu cầu ít nhất ba timeout trong hạn 600 ms. Bài kiểm tra nay xác minh PostgreSQL trả SQLSTATE `57014`, bộ đếm ghi đúng các timeout quan sát được, heartbeat không chồng và lease hết hạn. Một bài khác về RSS khi dò âm thanh 25 MB có lúc vượt ngưỡng ở lượt trước. Bài đó đạt khi chạy riêng và trong nhóm cuối chạy lại.
- Các phép thử trên không phát hiện lỗi tương thích trong SQL hoặc mã chạy của TyZo. Thay đổi gồm test và hồ sơ bằng chứng.

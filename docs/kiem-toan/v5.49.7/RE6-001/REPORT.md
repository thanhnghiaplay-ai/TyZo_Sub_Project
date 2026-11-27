# RE6-001 · Nghĩa vụ thiếu usage và đối soát

Mã bắt đầu `dba1a054ba34cb21f1ab4894bf574f57cd13f16e`. Phạm vi là lệnh chat trả bằng Token dịch ở cổng dùng chung. Kiểm thử bằng fixture tổng hợp và PostgreSQL 18.7 trên loopback. Test chỉ hỗ trợ PGLite vẫn chạy PGLite.

## Vòng đời

- Migration 0059 thêm sổ độc lập theo mã lệnh, chủ tài khoản và phiếu nguồn. Sổ không có khóa ngoại xóa dây chuyền. Giao dịch giữ Token ghi lệnh và khoản đang có rủi ro trước khi gửi nhà cung cấp.
- Khi usage hợp lệ và lệnh còn quyền quyết toán, hệ thống dùng đường trừ hiện có, nhả mức giữ và bỏ khoản rủi ro. Khi usage thiếu hoặc không hợp lệ, hệ thống trừ 0, nhả giữ trên phiếu và đưa mức giữ ước tính vào sổ chờ. Ước tính mới không đi vào sổ chi phí đã xác nhận. Lệnh mất phản hồi hoặc lease hết hạn vẫn để lại hồ sơ để Chủ kiểm tra.
- Sổ giữ nghĩa vụ qua việc đóng và xóa phiếu. Đường reset dữ liệu thử được bảo vệ hiện có sẽ xóa sổ thử cùng các sổ tài chính khác. 0059 sao chép hồ sơ Token cũ chưa trừ mà trạng thái cần đối soát hoặc mất phản hồi, bỏ các lệnh thuộc ASR bất đồng bộ đã nhận diện được. Hồ sơ cũ thiếu dữ liệu phân loại được gắn nhãn riêng. Phần chi phí cũ có thể đã vào báo cáo trước 0059 nên xác minh hồ sơ cũ chỉ lưu bằng chứng, không cộng lại và không sửa tổng quá khứ.
- Admin vào **Cấu hình → Trạng thái → Đối soát chi phí dịch**. Chỉ vai Chủ được đọc và ghi. Lưu số USD đã kiểm chứng, tham chiếu chứng từ, người xử lý và thời gian. Hồ sơ, audit và chứng từ chi phí nhà cung cấp ghi cùng giao dịch. Cùng mã lệnh và dữ liệu trả replay, dữ liệu khác sau khi đã xử lý trả conflict. Chi phí mới đi qua journal hiện có, kể cả khi phần tổng hợp ngày cần retry. Thao tác không trừ Token của khách.

## Giới hạn chờ phê duyệt

- Giới hạn cộng mức giữ ước tính của lệnh đang chạy và hồ sơ chưa xác minh. Giới hạn mỗi tài khoản áp dụng xuyên phiếu, đồng thời kiểm giới hạn toàn hệ thống. PostgreSQL khóa giao dịch trước phép tổng hợp và ghi giữ, nên hai phiếu không thể cùng nhận một phần ngân sách. Dòng lịch sử chưa xác định được mức giữ phải được xem xét trước khi cơ chế chấp nhận thêm.
- Mặc định tắt. Migration không tạo khóa `room_settings.chat_obligation_budget` và giao diện không có nút bật. Cần Chủ duyệt ngưỡng theo tài khoản, tổng hệ thống và cách thông báo khách trước khi áp dụng. Cần hoàn tất triển khai đồng nhất và xác minh không còn lệnh do bản cũ giữ trước khi bật.
- Giới hạn dùng mức giữ của TyZo, dựa trên cận usage đặt trước ở cổng chat. Nếu nhà cung cấp không tuân cận, số tiền thực có thể cao hơn số ước tính. Không sử dụng số này để thu hồi từ khách. Quy trình thu hồi nếu có cần chính sách riêng do Chủ duyệt.

## Bằng chứng

- 100 phản hồi giả thiếu usage với cấu hình mặc định. 100 hồ sơ chờ vẫn truy vấn đủ qua phân trang sau khi đóng và xóa phiếu nguồn, không ghi chi phí ước tính vào tổng.
- 100 yêu cầu đồng thời qua hai phiếu cùng khách và 4 yêu cầu từ khách thứ hai với cấu hình thử. Chỉ 3 yêu cầu tới nhà cung cấp giả, mỗi yêu cầu giữ mức ước tính 11 Token, tương ứng trần 22 theo khách và 33 toàn hệ thống. Sau khi Chủ xác minh một hồ sơ, phần ngân sách tương ứng được dùng lại.
- Hai nhóm gia hạn và quyết toán được kiểm với PG18.7. Chấm dứt kết nối PostgreSQL ngay trước commit hủy cả giữ phiếu và khoản rủi ro. Lỗi khi chèn audit hủy cả thao tác Admin và chứng từ. Tám lần ghi đồng thời cho một hồ sơ tạo một bản ghi, bảy replay. Hai lần chạy bộ tổng hợp journal chỉ cộng một lần. Kết quả đến muộn tranh với thao tác Admin không trừ khách hoặc ghi chi phí lần hai.
- Ca hồi quy dùng `node --experimental-strip-types --experimental-test-module-mocks --import ./scripts/register-ts.mjs --test --test-concurrency=1 src/lib/billing/{gate-reserve,run-gate,upstream-outcome,async-asr,re2-regression,work-admission-pg}.test.ts` với `TYZO_TEST_PG_URL` trỏ cụm thử. Ca migration hiện có kiểm cài mới, nâng 0056–0058 và nâng tiếp 0059 với hồ sơ cũ. `gate-reserve.test.ts` kiểm backfill 0059 với dữ liệu giả và chạy lại không nhân bản.

Tất cả thao tác cơ sở dữ liệu chạy trên cụm thử. Hồ sơ này xác nhận luồng kỹ thuật, với phần áp dụng ngưỡng tài chính chờ quyết định của Chủ.

## Kết quả kiểm tra

- `npm test` đạt 1.814 ca, 0 lỗi, 7 bỏ qua vì checkout sạch thiếu tài nguyên `.grok/`.
- Hồi quy tập trung trên mã cuối đạt 101 ca, 0 lỗi, 0 bỏ qua. Ca migration cuối đạt với nâng trực tiếp 0058 → 0059 và dữ liệu cũ. Xem [test-summary.txt](test-summary.txt).
- TypeScript và build cục bộ đạt. ESLint có 0 lỗi, 24 cảnh báo đã có trong baseline. Cổng build chạy `npm run build:dev` với `DATABASE_URL` được bỏ khỏi môi trường.

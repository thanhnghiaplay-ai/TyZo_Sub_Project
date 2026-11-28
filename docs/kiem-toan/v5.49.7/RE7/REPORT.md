# RE7 · Bổ sung sau kiểm toán ChatGPT (Medium)

Baseline `085fe16`, nối tiếp `88c7e47`. Mọi phép thử dùng máy chủ giả trên loopback. Không gọi Modal, Alibaba hay cầu nối thật. Kết quả test nằm ở [test-summary.txt](test-summary.txt).

## RE7-001 · Hạn chót tổng và giới hạn phản hồi (`deploy/vps/do-modal/do-modal.py`, `_once` và `_request`): PASS_LOCAL

**Lỗi xác nhận:** `urlopen(timeout=left)` chỉ đặt timeout cho từng lần đọc socket. Máy chủ trả từng byte một vẫn kịp mỗi lần đọc, nên tổng thời gian vượt hạn chót. Đo được 8,25 s với hạn chót 0,5 s, trước khi sửa phần giữ socket. `r.read()` cũng không giới hạn kích thước.

**Sửa:**
- Dùng `http.client` với một bộ hẹn giờ ở hạn chót tổng. Tới hạn thì `shutdown` socket. Socket được giữ riêng vì `getresponse()` có thể đặt `conn.sock = None`.
- Mỗi lệnh có một hạn chót tổng, áp cho kết nối, tiêu đề, thân và cả chuỗi chuyển hướng.
- Thân phản hồi tối đa `MAX_RESPONSE_BYTES`, mặc định 16 MiB. Kiểm cả `Content-Length` lẫn số byte đọc thực tế.
- Hết giờ thì ghi `cost_status=het-gio` và tính đủ phần giữ chỗ vào chi phí không rõ.

**Test:**
- Thân nhỏ giọt và tiêu đề nhỏ giọt, mỗi byte cách 0,05 s, hạn chót 0,5 s: cắt dưới 1,5 s.
- 64 MiB khai báo và luồng không có độ dài: bị từ chối.

## RE7-002 · Chi phí model bằng 0 khác thiếu dữ liệu (`cost_of`): PASS_LOCAL

Trước sửa, `st.get("tien_model_chu_usd", 0)` coi việc thiếu khóa là 0 USD. Backend (`eval/asr/luong-ky/modal/backend.py`) luôn trả khóa này, và app (`modalCostUsd`) bắt buộc phải có. Giờ `cost_of` trả về `(usd, trạng thái)`:

| Trạng thái | Ý nghĩa |
|---|---|
| `du` | đủ dữ liệu |
| `model-0` | có tiền model, bằng 0 |
| `thieu-tien-model` | thiếu tiền model |
| `tien-model-khong-hop-le` | tiền model không hợp lệ |
| `thieu-giay` | thiếu số giây xử lý |
| `giay-khong-hop-le` | số giây không hợp lệ |
| `thieu-stats` | thiếu stats |
| `khong-co-ket-qua` | không có kết quả |
| `het-gio` | hết giờ |
| `loi` | lỗi khác |

Chỉ `du` và `model-0` được tính là chi phí đã biết. Test bao gồm stats rỗng, stats là danh sách, thiếu từng khóa, giá trị `null` và NaN.

## RE7-003 · Chỉ tính phụ đề có nội dung (`deploy/vps/do-live/live-measure.ts`): PASS_LOCAL

`useful` yêu cầu có ít nhất một chữ cái hoặc chữ số (`\p{L}\p{N}`). Rỗng, chỉ khoảng trắng hoặc chỉ dấu câu (`。`, `…`) thì không tính. `hasContent` xét theo loại sự kiện:
- **delta:** `delta` phải có nội dung.
- **câu tạm:** `text + stash` phải có nội dung.
- **câu chốt:** chính `text` phải có nội dung. Phần chờ có chữ không làm câu chốt rỗng được tính.

Sự kiện bị bỏ được đếm vào `emptyEvents`. Lượt chỉ có sự kiện rỗng sẽ bị đếm vào `failed.thieu-chu-goc`. Test cũng xác nhận mốc đầu là sự kiện có chữ đầu tiên, không phải sự kiện rỗng trước nó.

## RE7-004 · Chính sách bảo toàn tên riêng CJK: CHỜ CHỦ DUYỆT (chưa đổi hành vi)

Phương án được soạn trong `src/lib/live/leftover-policy.ts` (`preserveLeftoverScript`), kèm test `src/lib/live/leftover-policy.test.ts`. Hàm này **chưa được nối** vào `live-bridge.ts`. Cầu nối vẫn dùng `dropLeftoverScript`, nên khách không thấy thay đổi nào.

**Phương án đề xuất (B):** chỉ bỏ chuỗi Hán, kana hoặc Hangul **dính liền** chữ của ngôn ngữ đích, như «luôn如一». Chuỗi đứng riêng thì giữ, như «Tôi gặp 王小明 hôm qua». Có danh sách `keep` cho thuật ngữ và tên đã khai báo, luôn được giữ. Hàm báo `dropped` và `kept` để theo dõi.

| Câu | Hiện tại | Đề xuất |
|---|---|---|
| Bạn phải luôn如一. | Bạn phải luôn. | Bạn phải luôn. |
| Tôi gặp 王小明 hôm qua. | Tôi gặp hôm qua. | **giữ tên** |
| Ca sĩ 아이유 hát. / I met 田中 in Tokyo. / Công ty ソニー ra mắt. | mất tên | **giữ tên** |
| Xin chào 你好 bạn。 | Xin chào bạn. | Xin chào 你好 bạn. (đánh đổi) |
| Cảm ơn ありがとう，hẹn gặp 안녕！ | Cảm ơn, hẹn gặp! | giữ cả hai từ (đánh đổi) |

**Đánh đổi:** từ thường đứng riêng mà model không dịch cũng được giữ. Không có từ điển thì không phân biệt được tên với từ thường.

**Điểm phải xử lý nếu duyệt:** delta được lọc từng mẩu nên không thấy ký tự kề ở mẩu trước. Hệ quả là delta đã ghép có thể khác câu chốt. Cần một trong hai cách: cầu nối giữ một ký tự ngữ cảnh giữa các mẩu, hoặc chỉ lọc câu chốt.

**Các phương án khác để Chủ chọn:**
- **A:** tắt lọc hoàn toàn. Không mất chữ nào, nhưng chữ sót quay lại.
- **C:** phiên âm. Kana và Hangul làm được bằng thuật toán, còn chữ Hán cần từ điển (thêm thư viện).
- **D:** sửa prompt để model tự phiên âm tên. Cách này cần đo thật, tốn phí Alibaba và cần duyệt.

**Khuyến nghị:** B kết hợp chỉ lọc câu chốt cho đơn giản, và theo dõi `dropped`/`kept` một tuần trước khi cân nhắc D.

## R8-002 bằng user thường: PASS

Chạy với uid 30033 (user `tester`, chủ sở hữu bản sao `scripts/`, `migrations/` và `package.json`): 1/1 đạt. Lỗi trong lần hồi quy trước là do chạy bằng root, nên bỏ qua quyền tệp.

## Admission 0057

Giữ nguyên. Không có bằng chứng mới, kết luận RE6-007 không đổi.
